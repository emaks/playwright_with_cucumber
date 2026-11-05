import assert from "node:assert/strict";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {Writable} from "node:stream";
import {test} from "node:test";
import {Decimal} from "decimal.js";
import {isLosslessNumber} from "lossless-json";
import {PropertyLoader} from "../../src/framework/config/PropertyLoader.js";
import {
    parseJson,
    readDecimal,
    readLosslessInteger,
    readOptionalString,
    writeValueAsString
} from "../../src/framework/json/ObjectMapperUtils.js";
import {runCleanup} from "../../src/framework/lifecycle/Cleanup.js";
import {createLogger} from "../../src/framework/logging/Logger.js";

const fixtureDirectory = join(process.cwd(), "target", "config-test");

test("configuration file values are overridden by runtime environment values", () => {
  mkdirSync(fixtureDirectory, { recursive: true });
  const path = join(fixtureDirectory, "test.json");
  writeFileSync(path, JSON.stringify({ "ui.base.url": "http://file", "api.base.url": "http://api" }));
  try {
    const values = PropertyLoader.getAll({
      configDirectory: fixtureDirectory,
      env: "test",
      overrides: { UI_BASE_URL: "http://override", BROWSER: "firefox", HEADLESS: "true" }
    });
    assert.equal(values["ui.base.url"], "http://override");
    assert.equal(values["api.base.url"], "http://api");
    assert.equal(values.browser, "firefox");
    assert.equal(values.headless, "true");
    assert.equal(values.parallel, "1");
    assert.equal(values.retry, "1");
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test("a missing environment file fails explicitly rather than falling back to local", () => {
  assert.throws(
    () => PropertyLoader.getAll({ configDirectory: fixtureDirectory, env: "missing", overrides: {} }),
    /Cannot find 'missing\.json'/
  );
});

test("lossless JSON preserves decimal precision and emits Decimal as a JSON number", () => {
  const parsed = parseJson('{"revenue":12345678901234567890.123456789012345678}');
  assert.equal(typeof parsed, "object");
  assert.ok(parsed !== null && !Array.isArray(parsed));
  const revenue = (parsed as Record<string, unknown>).revenue;
  assert.ok(isLosslessNumber(revenue));
  const decimal = readDecimal(revenue, "revenue");
  assert.ok(decimal instanceof Decimal);
  assert.equal(decimal.toString(), "12345678901234567890.123456789012345678");
  assert.equal(
    writeValueAsString({ revenue: decimal }),
    '{"revenue":12345678901234567890.123456789012345678}'
  );
});

test("JSON helpers preserve empty, null, omitted, and safe integer values", () => {
  const parsed = parseJson('{"empty":"","nullable":null,"count":3}');
  assert.ok(parsed !== null && typeof parsed === "object" && !Array.isArray(parsed));
  const record = parsed as Record<string, unknown>;
  assert.equal(readOptionalString(record.empty, "empty"), "");
  assert.equal(readOptionalString(record.nullable, "nullable"), null);
  assert.equal(readOptionalString(record.omitted, "omitted"), undefined);
  assert.equal(readLosslessInteger(record.count, "count"), 3);
  assert.throws(() => readLosslessInteger(new Decimal("1.2"), "count"), /integer/);
});

test("cleanup executes every action and preserves the first and later failures", async () => {
  const order: number[] = [];
  const first = new Error("first");
  const second = new Error("second");
  const third = new Error("third");
  await assert.rejects(
    runCleanup(
      () => { order.push(1); throw first; },
      async () => { order.push(2); throw second; },
      () => { order.push(3); throw third; },
      () => { order.push(4); }
    ),
    (error: unknown) => error === first
  );
  assert.deepEqual(order, [1, 2, 3, 4]);
  assert.deepEqual((first as Error & { suppressed: unknown[] }).suppressed, [second, third]);
});

test("cleanup succeeds and awaits asynchronous actions in order", async () => {
  const order: string[] = [];
  await runCleanup(
    async () => { order.push("first"); },
    () => { order.push("second"); }
  );
  assert.deepEqual(order, ["first", "second"]);
});

test("logger redacts common credential fields", () => {
  let output = "";
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      output += chunk.toString();
      callback();
    }
  });
  createLogger(destination).info(
    { authorization: "bearer-secret", nested: { token: "access-secret" } },
    "redaction check"
  );
  assert.doesNotMatch(output, /bearer-secret|access-secret/);
  assert.match(output, /\[REDACTED\]/);
});

test("cleanup represents a non-Error primary failure without losing later failures", async () => {
  const later = new Error("later");
  await assert.rejects(
    runCleanup(
      () => { throw "primary"; },
      () => { throw later; }
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.cause, "primary");
      assert.deepEqual((error as Error & { suppressed: unknown[] }).suppressed, [later]);
      return true;
    }
  );
});
