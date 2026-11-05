import {appendFileSync, existsSync, mkdirSync, readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {resolve} from "node:path";
import {Before, Given, type ITestCaseHookParameter, When} from "@cucumber/cucumber";
import {ApiRequestOptions} from "../../../src/framework/api/ApiRequestOptions.js";
import {ContextKey} from "../../../src/testsupport/context/ContextKey.js";
import {TestWorld} from "../../../src/testsupport/cucumber/World.js";

interface AcceptanceWorld extends TestWorld {
  acceptanceScenario: string;
}

interface AcceptanceEvent {
  readonly event: string;
  readonly scenario?: string;
  readonly worldId?: string;
  readonly contextId?: string;
  readonly attempt?: number;
  readonly label?: string;
  readonly timestamp?: number;
}

const eventFile = resolve("target", "acceptance", "events.jsonl");

Before(function (
  this: TestWorld,
  { pickle }: ITestCaseHookParameter
): void {
  const world = this as AcceptanceWorld;
  world.acceptanceScenario = pickle.name;
  const worldId = randomUUID();
  this.context.set(ContextKey.RESPONSE, worldId);
  const contextId = requireWorldId(this);
  record({
    event: "world",
    scenario: pickle.name,
    worldId,
    contextId
  });
});

Given(
  "I record parallel work {string}",
  async function (this: TestWorld, label: string): Promise<void> {
    const world = this as AcceptanceWorld;
    const worldId = requireWorldId(this);
    record({
      event: "start",
      scenario: world.acceptanceScenario,
      worldId,
      contextId: worldId,
      label,
      timestamp: Date.now()
    });
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 700));
    record({ event: "end", scenario: world.acceptanceScenario, worldId, label, timestamp: Date.now() });
    await this.attach(`parallel:${label}:world:${worldId}`, "text/plain");
  }
);

When(
  "I fail once on the first attempt",
  function (this: TestWorld): void {
    const scenario = (this as AcceptanceWorld).acceptanceScenario;
    const attempt = nextAttempt(scenario);
    const worldId = requireWorldId(this);
    record({ event: "attempt", scenario, attempt, worldId, contextId: worldId });
    if (attempt === 1) throw new Error("Controlled first-attempt failure");
  }
);

When(
  "I always fail",
  function (this: TestWorld): never {
    const scenario = (this as AcceptanceWorld).acceptanceScenario;
    const attempt = nextAttempt(scenario);
    const worldId = requireWorldId(this);
    record({ event: "attempt", scenario, attempt, worldId, contextId: worldId });
    throw new Error("Controlled permanent failure");
  }
);

When(
  "I evaluate rerun row {string}",
  function (this: TestWorld, outcome: string): void {
    const scenario = (this as AcceptanceWorld).acceptanceScenario;
    const worldId = requireWorldId(this);
    record({ event: "rerun-row", scenario, worldId, label: outcome });
    if (outcome === "failure" && process.env.RERUN_MARK_PASSED !== "true") {
      throw new Error("Controlled failed row for rerun selection");
    }
  }
);

When(
  "I trigger a controlled API transport failure",
  async function (this: TestWorld): Promise<void> {
    if (this.apiClient === undefined) throw new Error("API hooks did not initialize an API client");
    await this.apiClient.get(
      "http://127.0.0.1:1",
      new ApiRequestOptions({}, 1_000)
    );
  }
);

When(
  "I open the UI and fail once",
  async function (this: TestWorld): Promise<void> {
    const scenario = (this as AcceptanceWorld).acceptanceScenario;
    const attempt = nextAttempt(scenario);
    const worldId = requireWorldId(this);
    record({ event: "attempt", scenario, attempt, worldId, contextId: worldId });
    if (this.transactionsPage === undefined) {
      throw new Error("UI hooks did not initialize TransactionsPage");
    }
    await this.transactionsPage.open();
    if (attempt === 1) throw new Error("Controlled UI retry failure");
  }
);

function nextAttempt(scenario: string): number {
  return readEvents().filter(
    (event) => event.event === "attempt" && event.scenario === scenario
  ).length + 1;
}

function requireWorldId(world: TestWorld): string {
  const worldId = world.context.get<string>(ContextKey.RESPONSE);
  if (worldId === undefined) throw new Error("Acceptance World context was not initialized");
  return worldId;
}

function readEvents(): AcceptanceEvent[] {
  if (!existsSync(eventFile)) return [];
  return readFileSync(eventFile, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as AcceptanceEvent);
}

function record(event: AcceptanceEvent): void {
  mkdirSync(resolve("target", "acceptance"), { recursive: true });
  appendFileSync(eventFile, `${JSON.stringify(event)}\n`);
}
