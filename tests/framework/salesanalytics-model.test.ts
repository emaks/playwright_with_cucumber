import assert from "node:assert/strict";
import {test} from "node:test";
import {Decimal} from "decimal.js";
import {readValue} from "../../src/framework/json/JsonCodec.js";
import {
  decodeTransactionsResponse
} from "../../src/salesanalytics/api/models/TransactionsResponse.js";
import {RequestOptionsBuilder} from "../../src/salesanalytics/api/RequestOptionsBuilder.js";
import {TransactionFilters} from "../../src/salesanalytics/api/TransactionFilters.js";

test("Sales Analytics response decoding preserves data, metadata, nulls, and decimal precision", () => {
  const response = readValue(
    `{
      "data": [{
        "id": "#1001",
        "date": "2025-01-05",
        "region": "Europe",
        "category": "Furniture",
        "revenue": 12345678901234567890.123456789012345678
      }],
      "meta": {
        "total": 12,
        "returned": 1,
        "filters": {
          "dateRange": null,
          "region": "Europe",
          "category": "Furniture",
          "sort": "date_asc"
        }
      },
      "futureField": "ignored by the decoder"
    }`,
    decodeTransactionsResponse
  );
  assert.equal(response.data?.length, 1);
  assert.equal(response.data?.[0]?.id, "#1001");
  assert.ok(response.data?.[0]?.revenue instanceof Decimal);
  assert.equal(
    response.data?.[0]?.revenue?.toString(),
    "12345678901234567890.123456789012345678"
  );
  assert.equal(response.meta?.total, 12);
  assert.equal(response.meta?.returned, 1);
  assert.equal(response.meta?.filters?.dateRange, null);
  assert.equal(response.meta?.filters?.region, "Europe");
});

test("missing and nullable response fields keep numeric and reference defaults", () => {
  const response = readValue(
    '{"data":[{"revenue":null}],"meta":{"filters":{}}}',
    decodeTransactionsResponse
  );
  assert.equal(response.data?.[0]?.id, undefined);
  assert.equal(response.data?.[0]?.revenue, null);
  assert.equal(response.meta?.total, 0);
  assert.equal(response.meta?.returned, 0);
  assert.equal(response.meta?.filters?.region, undefined);
  assert.equal(readValue("{}", decodeTransactionsResponse).data, null);
});

test("filters and request builder omit nulls but retain explicit empty values", () => {
  const filters = new TransactionFilters(null, "Europe", "", undefined);
  assert.deepEqual(filters.toMap(), { region: "Europe", category: "" });
  const options = RequestOptionsBuilder.builder()
    .dateRange(null)
    .region("Europe")
    .category("")
    .sort(undefined)
    .timeout(0)
    .build();
  assert.deepEqual(options.queryParams, { region: "Europe", category: "" });
  assert.equal(options.timeout, 0);
  assert.equal(
    RequestOptionsBuilder.builder().region(null).build().timeout,
    30_000
  );
});
