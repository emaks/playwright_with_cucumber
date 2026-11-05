import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import test from "node:test";

const projectDirectory = process.cwd();
const dependencyCruiser = resolve(projectDirectory, "node_modules/.bin/depcruise");

test("Dependency Cruiser rejects the deliberate framework-to-application violation", () => {
  const result = spawnSync(
    dependencyCruiser,
    [
      "--validate",
      ".dependency-cruiser.cjs",
      "tests/architecture/fixtures/framework/IllegalApplicationImport.ts"
    ],
    {
      cwd: projectDirectory,
      encoding: "utf8",
      maxBuffer: 5 * 1024 * 1024
    }
  );
  if (result.error !== undefined) throw result.error;
  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /architecture-fixture-framework-no-salesanalytics/
  );
});
