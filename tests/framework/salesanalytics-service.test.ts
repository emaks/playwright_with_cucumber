import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {test} from "node:test";
import {request} from "playwright";
import {PlaywrightApiClient} from "../../src/framework/api/clients/PlaywrightApiClient.js";
import {TransactionFilters} from "../../src/salesanalytics/api/TransactionFilters.js";
import {TransactionsService} from "../../src/salesanalytics/api/TransactionsService.js";
import {SalesTransactionsSteps} from "../../src/salesanalytics/steps/api/SalesTransactionsSteps.js";

test("Sales Transactions service and steps preserve filter values and verify every result", async () => {
  let observedPath = "";
  const server = createServer((incoming, outgoing) => {
    observedPath = incoming.url ?? "";
    outgoing.writeHead(200, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({
      data: [
        { id: "#1", date: "2025-01-01", region: "Europe", category: "Furniture", revenue: 10 },
        { id: "#2", date: "2025-01-02", region: "Europe", category: "Furniture", revenue: 20 }
      ],
      meta: { total: 2, returned: 2, filters: { region: "Europe", category: "Furniture" } }
    }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");
  const context = await request.newContext({ baseURL: `http://127.0.0.1:${address.port}/api/` });
  const client = new PlaywrightApiClient(context);
  const steps = new SalesTransactionsSteps(new TransactionsService(client));
  const filters = new TransactionFilters(undefined, "Europe", "Furniture", null);

  try {
    const response = await steps.sendGETRequestToTransactionsEndpointWithParams(filters);
    assert.equal(response.getStatusCode(), 200);
    await steps.verifyTransactionsFilteredBy(response, filters);
    assert.equal(observedPath, "/api/transactions?region=Europe&category=Furniture");
  } finally {
    await client.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
