import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync} from "node:fs";
import {resolve} from "node:path";
import test from "node:test";

const projectDirectory = process.cwd();
const targetDirectory = resolve(projectDirectory, "target");
const acceptanceDirectory = resolve(targetDirectory, "acceptance");
const eventFile = resolve(acceptanceDirectory, "events.jsonl");
const cucumberJson = resolve(targetDirectory, "site", "cucumber-report.json");
const allureResults = resolve(targetDirectory, "allure-results");
const rerunFile = resolve(targetDirectory, "@rerun.txt");
const harDirectory = resolve(targetDirectory, "har-recordings");
const cucumberCli = resolve(
  projectDirectory,
  "node_modules/@cucumber/cucumber/bin/cucumber.js"
);

interface EventRecord {
  readonly event: string;
  readonly scenario?: string;
  readonly worldId?: string;
  readonly contextId?: string;
  readonly attempt?: number;
  readonly label?: string;
  readonly timestamp?: number;
}

interface AllureAttachment {
  readonly name: string;
  readonly source: string;
  readonly type?: string;
}

interface AllureStep {
  readonly attachments?: readonly AllureAttachment[];
  readonly steps?: readonly AllureStep[];
}

interface AllureResult {
  readonly name: string;
  readonly status: string;
  readonly historyId?: string;
  readonly testCaseId?: string;
  readonly attachments?: readonly AllureAttachment[];
  readonly steps?: readonly AllureStep[];
}

interface AllureContainer {
  readonly befores?: readonly AllureStep[];
  readonly afters?: readonly AllureStep[];
}

test("Cucumber runtime behavior: parallel, retry, rerun, isolation, and failed UI cleanup", async (t) => {
  await t.test("parallel scenarios overlap and isolate World, context, and attachments", () => {
    resetArtifacts();
    const run = runCucumber("@parallel", ["--parallel", "2", "--retry", "0"]);
    assert.equal(run.status, 0, run.output);

    const events = readEvents();
    const starts = events.filter((event) => event.event === "start");
    const ends = events.filter((event) => event.event === "end");
    assert.equal(starts.length, 2);
    assert.equal(ends.length, 2);
    assert.ok(
      Math.max(...starts.map((event) => requiredTimestamp(event))) <
        Math.min(...ends.map((event) => requiredTimestamp(event))),
      "Expected both scenario intervals to overlap"
    );
    assert.equal(new Set(starts.map((event) => event.worldId)).size, 2);
    assert.equal(new Set(starts.map((event) => event.contextId)).size, 2);

    const results = readAllureResults();
    assert.equal(results.length, 2);
    const attachments = results.flatMap(collectAttachments);
    assert.equal(attachments.length, 2);
    assert.equal(new Set(attachments.map((attachment) => attachment.source)).size, 2);
    assertAllAttachmentsExist(attachments);
    assert.match(readFileSync(resolve(allureResults, "environment.properties"), "utf8"), /PARALLEL=2/);
    assert.match(readFileSync(resolve(allureResults, "environment.properties"), "utf8"), /RETRY=0/);
    assert.match(readFileSync(resolve(allureResults, "environment.properties"), "utf8"), /TAG=@parallel/);
  });

  await t.test("retry uses a fresh World and context and passes on attempt two", () => {
    resetArtifacts();
    const run = runCucumber("@retry-once", ["--parallel", "1", "--retry", "1"]);
    assert.equal(run.status, 0, run.output);

    const attempts = readEvents().filter((event) => event.event === "attempt");
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts.map((event) => event.attempt), [1, 2]);
    assert.equal(new Set(attempts.map((event) => event.worldId)).size, 2);
    assert.equal(new Set(attempts.map((event) => event.contextId)).size, 2);
    assert.deepEqual(
      readAllureResults().map((result) => result.status).sort(),
      ["broken", "passed"]
    );
  });

  await t.test("permanently failing scenario is attempted no more than retry plus one", () => {
    resetArtifacts();
    const run = runCucumber("@permanent", ["--parallel", "1", "--retry", "1"]);
    assert.notEqual(run.status, 0, run.output);
    assert.equal(readEvents().filter((event) => event.event === "attempt").length, 2);
  });

  await t.test("retry zero makes exactly one attempt", () => {
    resetArtifacts();
    const run = runCucumber("@retry-zero", ["--parallel", "1", "--retry", "0"]);
    assert.notEqual(run.status, 0, run.output);
    assert.equal(readEvents().filter((event) => event.event === "attempt").length, 1);
  });

  await t.test("API transport failure attachment preserves and rethrows the original error", () => {
    resetArtifacts();
    const run = runCucumber("@api-transport", ["--parallel", "1", "--retry", "0"]);
    assert.notEqual(run.status, 0, run.output);

    const results = readAllureResults();
    assert.equal(results.length, 1);
    const attachments = results.flatMap(collectAttachments);
    assert.ok(attachments.some((attachment) => attachment.name === "API request"));
    const failureAttachment = attachments.find(
      (attachment) => attachment.name === "API request failure"
    );
    assert.ok(failureAttachment);
    assertAllAttachmentsExist([failureAttachment]);
    assert.match(
      readFileSync(resolve(allureResults, failureAttachment.source), "utf8"),
      /127\.0\.0\.1:1|ECONNREFUSED|connect/i
    );
    const errorMessages = readCucumberScenarios().flatMap((scenario) =>
      scenario.steps.map((step) => step.result.error_message ?? "")
    );
    assert.ok(errorMessages.some((message) => /127\.0\.0\.1:1|ECONNREFUSED|connect/i.test(message)));
    assert.ok(errorMessages.every((message) => !message.includes("Unable to attach")));
  });

  await t.test("failed-only rerun selects the failed Scenario Outline row", () => {
    resetArtifacts();
    const firstRun = runCucumber("@rerun", ["--parallel", "1", "--retry", "0"]);
    assert.notEqual(firstRun.status, 0, firstRun.output);
    assert.ok(existsSync(rerunFile), "Expected Cucumber rerun formatter output");
    const rerunContents = readFileSync(rerunFile, "utf8").trim();
    assert.notEqual(rerunContents, "");
    assert.equal(rerunContents.split("\n").length, 1);

    const rerun = spawnSync(
      process.execPath,
      [resolve(projectDirectory, "scripts/rerun.mjs")],
      {
        cwd: projectDirectory,
        encoding: "utf8",
        env: { ...process.env, RERUN_MARK_PASSED: "true" },
        maxBuffer: 10 * 1024 * 1024
      }
    );
    assert.equal(rerun.status, 0, `${rerun.stdout}\n${rerun.stderr}`);
    const scenarios = readCucumberScenarios();
    assert.equal(scenarios.length, 1);
    assert.match(scenarios[0]?.name ?? "", /failed row "failure"/);
    assert.equal(scenarios[0]?.steps.every((step) => step.result.status === "passed"), true);
    const rerunEvents = readEvents().filter((event) => event.event === "rerun-row");
    assert.deepEqual(rerunEvents.map((event) => event.label), ["failure", "success", "failure"]);

    const emptyRerun = spawnSync(
      process.execPath,
      [resolve(projectDirectory, "scripts/rerun.mjs")],
      { cwd: projectDirectory, encoding: "utf8" }
    );
    assert.equal(emptyRerun.status, 0, `${emptyRerun.stdout}\n${emptyRerun.stderr}`);
    assert.match(emptyRerun.stdout, /No failed scenarios/);
  });

  await t.test("failed UI retry captures screenshot and writes distinct HAR per attempt", () => {
    resetArtifacts();
    const run = runCucumber("@ui-retry", ["--parallel", "1", "--retry", "1"], {
      BROWSER: "chromium",
      HEADLESS: "true"
    });
    assert.equal(run.status, 0, run.output);

    const attempts = readEvents().filter((event) => event.event === "attempt");
    assert.equal(attempts.length, 2);
    assert.equal(new Set(attempts.map((event) => event.worldId)).size, 2);
    assert.equal(new Set(attempts.map((event) => event.contextId)).size, 2);
    const hars = readdirSync(harDirectory).filter((file) => file.endsWith(".har"));
    assert.equal(hars.length, 2);
    assert.equal(new Set(hars).size, 2);
    for (const harFile of hars) {
      const har = JSON.parse(readFileSync(resolve(harDirectory, harFile), "utf8")) as {
        readonly log?: { readonly entries?: readonly unknown[] };
      };
      assert.ok((har.log?.entries?.length ?? 0) > 0, `HAR ${harFile} has no entries`);
    }

    const results = readAllureResults();
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((result) => result.status).sort(), ["broken", "passed"]);
    assert.equal(new Set(results.map((result) => result.historyId)).size, 1);
    assert.equal(new Set(results.map((result) => result.testCaseId)).size, 1);
    const screenshots = [
      ...results.flatMap(collectAttachments),
      ...readAllureContainers().flatMap((container) =>
        collectStepAttachments([...(container.befores ?? []), ...(container.afters ?? [])])
      )
    ]
      .filter((attachment) => attachment.name === "Failure screenshot");
    assert.equal(screenshots.length, 1);
    assert.equal(screenshots[0]?.type, "image/png");
    assertAllAttachmentsExist(screenshots);
    const screenshotBytes = readFileSync(resolve(allureResults, screenshots[0]!.source));
    assert.deepEqual([...screenshotBytes.subarray(0, 8)], [
      137, 80, 78, 71, 13, 10, 26, 10
    ]);
  });
});

function runCucumber(
  tag: string,
  options: readonly string[],
  environment: NodeJS.ProcessEnv = {}
): { readonly status: number | null; readonly output: string } {
  const result = spawnSync(
    process.execPath,
    [
      cucumberCli,
      "--config",
      "cucumber.mjs",
      "--profile",
      "acceptance",
      "--tags",
      tag,
      ...options
    ],
    {
      cwd: projectDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        BROWSER: "chromium",
        HEADLESS: "true",
        ...environment
      },
      maxBuffer: 10 * 1024 * 1024
    }
  );
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  };
}

function resetArtifacts(): void {
  rmSync(acceptanceDirectory, { recursive: true, force: true });
  rmSync(allureResults, { recursive: true, force: true });
  rmSync(resolve(targetDirectory, "site"), { recursive: true, force: true });
  rmSync(harDirectory, { recursive: true, force: true });
  rmSync(rerunFile, { force: true });
  mkdirSync(acceptanceDirectory, { recursive: true });
}

function readEvents(): EventRecord[] {
  if (!existsSync(eventFile)) return [];
  return readFileSync(eventFile, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as EventRecord);
}

function readAllureResults(): AllureResult[] {
  if (!existsSync(allureResults)) return [];
  return readdirSync(allureResults)
    .filter((file) => file.endsWith("-result.json"))
    .map((file) =>
      JSON.parse(readFileSync(resolve(allureResults, file), "utf8")) as AllureResult
    );
}

function readAllureContainers(): AllureContainer[] {
  if (!existsSync(allureResults)) return [];
  return readdirSync(allureResults)
    .filter((file) => file.endsWith("-container.json"))
    .map((file) =>
      JSON.parse(readFileSync(resolve(allureResults, file), "utf8")) as AllureContainer
    );
}

function readCucumberScenarios(): {
  readonly name: string;
  readonly steps: readonly {
    readonly result: { readonly status: string; readonly error_message?: string };
  }[];
}[] {
  const features = JSON.parse(readFileSync(cucumberJson, "utf8")) as {
    readonly elements?: {
      readonly name: string;
      readonly steps: readonly {
        readonly result: { readonly status: string; readonly error_message?: string };
      }[];
    }[];
  }[];
  return features.flatMap((feature) => feature.elements ?? []);
}

function collectAttachments(result: AllureResult): AllureAttachment[] {
  return [...(result.attachments ?? []), ...collectStepAttachments(result.steps ?? [])];
}

function collectStepAttachments(steps: readonly AllureStep[]): AllureAttachment[] {
  return steps.flatMap((step) => [
    ...(step.attachments ?? []),
    ...collectStepAttachments(step.steps ?? [])
  ]);
}

function assertAllAttachmentsExist(attachments: readonly AllureAttachment[]): void {
  for (const attachment of attachments) {
    assert.ok(
      existsSync(resolve(allureResults, attachment.source)),
      `Missing attachment content: ${attachment.name}`
    );
  }
}

function requiredTimestamp(event: EventRecord): number {
  assert.equal(typeof event.timestamp, "number");
  return event.timestamp!;
}
