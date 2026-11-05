import {existsSync, readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rerunFile = resolve(projectDirectory, "target", "@rerun.txt");

if (!existsSync(rerunFile) || readFileSync(rerunFile, "utf8").trim() === "") {
  console.log("No failed scenarios are recorded; rerun skipped.");
  process.exitCode = 0;
} else {
  const cucumberCli = resolve(
    projectDirectory,
    "node_modules/@cucumber/cucumber/bin/cucumber.js"
  );
  const result = spawnSync(
    process.execPath,
    [cucumberCli, "--config", "cucumber.mjs", "--profile", "rerun"],
    { cwd: projectDirectory, env: process.env, stdio: "inherit" }
  );

  if (result.error !== undefined) throw result.error;
  process.exitCode = result.status ?? 1;
}
