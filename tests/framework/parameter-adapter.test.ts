import assert from "node:assert/strict";
import {test} from "node:test";
import {Column} from "../../src/salesanalytics/ui/component/TransactionsGrid.js";
import {ParameterTypeAdapter} from "../../src/salesanalytics/definitions/ParameterTypeAdapter.js";
import {TransactionFilter} from "../../src/salesanalytics/api/TransactionFilter.js";

test("table adapters preserve transposed fields, case-insensitive enums, and <empty>", () => {
  const filters = ParameterTypeAdapter.transactionFilters([
    ["dateRange", "<empty>"],
    ["region", "Europe"],
    ["category", "Furniture"]
  ]);
  assert.deepEqual(filters.toMap(), {
    dateRange: "",
    region: "Europe",
    category: "Furniture"
  });
  assert.equal(ParameterTypeAdapter.transactionFilter("region"), TransactionFilter.REGION);
  assert.equal(ParameterTypeAdapter.transactionFilter("CATEGORY"), TransactionFilter.CATEGORY);
  assert.equal(ParameterTypeAdapter.transactionsGridColumn("region"), Column.REGION);
  assert.equal(ParameterTypeAdapter.transactionsGridColumn("ORDER_ID"), Column.ORDER_ID);
  assert.equal(ParameterTypeAdapter.emptyCell("<empty>"), "");
  assert.throws(() => ParameterTypeAdapter.transactionFilter("other"), /Unknown transaction filter/);
});
