import assert from "node:assert/strict";
import {test} from "node:test";

test("the selected runtime satisfies the supported Node.js baseline", () => {
  const major = Number(process.versions.node.split(".")[0]);
  assert.ok(
    major === 24 || major >= 26,
    `Expected Node.js 24 or 26+, got ${process.versions.node}`
  );
});
