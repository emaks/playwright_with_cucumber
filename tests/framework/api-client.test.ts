import assert from "node:assert/strict";
import {createServer, type Server} from "node:http";
import {once} from "node:events";
import {test} from "node:test";
import {request} from "playwright";
import {ApiRequestOptions} from "../../src/framework/api/ApiRequestOptions.js";
import {PlaywrightApiClient} from "../../src/framework/api/clients/PlaywrightApiClient.js";
import {readLosslessInteger} from "../../src/framework/json/JsonCodec.js";
import {PlaywrightSession} from "../../src/framework/playwright/PlaywrightSession.js";

async function listen(server: Server): Promise<string> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

test("request options defensively copy params, preserve empty values, and validate timeout", () => {
  const input = { region: "Europe", category: "" };
  const options = new ApiRequestOptions(input, 0);
  input.region = "changed";
  assert.deepEqual(options.queryParams, { region: "Europe", category: "" });
  assert.equal(options.timeout, 0);
  assert.equal(new ApiRequestOptions().timeout, 30_000);
  for (const timeout of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => new ApiRequestOptions({}, timeout), /finite and non-negative/);
  }
});

test("Playwright API client sends query params and retains URL, status, and response details", async () => {
  let observedUrl = "";
  const server = createServer((incoming, outgoing) => {
    observedUrl = incoming.url ?? "";
    outgoing.writeHead(200, { "content-type": "application/json", "x-test": "present" });
    outgoing.end('{"ok":true,"count":2}');
  });
  const baseURL = await listen(server);
  const context = await request.newContext({ baseURL: `${baseURL}/api/` });
  const client = new PlaywrightApiClient(context);
  try {
    const response = await client.get(
      "transactions",
      new ApiRequestOptions({ region: "Europe", category: "" }, 0)
    );
    assert.equal(response.getStatusCode(), 200);
    assert.match(response.getUrl(), /\/api\/transactions\?/);
    assert.match(observedUrl, /region=Europe/);
    assert.match(observedUrl, /category=/);
    const body = await response.getBody((value) => {
      assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
      const record = value as Record<string, unknown>;
      return { ok: record.ok, count: readLosslessInteger(record.count, "count") };
    });
    assert.deepEqual(body, { ok: true, count: 2 });
    const details = await response.getDetails();
    assert.match(details, /Status: 200/);
    assert.match(details, /x-test: present/);
    assert.match(details, /"count":2/);
  } finally {
    await client.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("Playwright API client propagates transport errors", async () => {
  const context = await request.newContext({ timeout: 100 });
  const client = new PlaywrightApiClient(context);
  try {
    await assert.rejects(client.get("http://127.0.0.1:1/unreachable", new ApiRequestOptions({}, 100)));
  } finally {
    await client.close();
  }
});

test("scenario session creates an API-only context with the configured /api path", async () => {
  let observedUrl = "";
  const server = createServer((incoming, outgoing) => {
    observedUrl = incoming.url ?? "";
    outgoing.writeHead(200, { "content-type": "application/json" });
    outgoing.end("{}");
  });
  const baseURL = await listen(server);
  const previous = process.env.API_BASE_URL;
  process.env.API_BASE_URL = `${baseURL}/api`;
  const session = new PlaywrightSession();
  let context: Awaited<ReturnType<PlaywrightSession["getNewAPIContext"]>> | undefined;
  try {
    context = await session.getNewAPIContext();
    const response = await context.get("transactions");
    assert.equal(response.status(), 200);
    assert.equal(new URL(response.url()).pathname, "/api/transactions");
    assert.equal(observedUrl, "/api/transactions");
  } finally {
    if (context !== undefined) await context.dispose();
    await session.closeSession();
    if (previous === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = previous;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("unsupported browser initialization leaves the session cleanable", async () => {
  const session = new PlaywrightSession();
  await assert.rejects(session.getNewPage("webkit"), /Browser not supported/);
  await session.closeSession();
});
