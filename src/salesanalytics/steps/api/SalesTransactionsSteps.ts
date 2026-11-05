import assert from "node:assert/strict";
import type {ApiResponse} from "../../../framework/api/ApiResponse.js";
import {
    decodeTransactionsResponse,
    type Transaction
} from "../../api/models/TransactionsResponse.js";
import type {TransactionFilters} from "../../api/TransactionFilters.js";
import type {TransactionsService} from "../../api/TransactionsService.js";

export class SalesTransactionsSteps {
  constructor(private readonly service: TransactionsService) {}

  sendGETRequestToTransactionsEndpointWithParams(
    filters: TransactionFilters
  ): Promise<ApiResponse> {
    return this.service.listTransactions(filters);
  }

  async verifyTransactionsFilteredBy(
    response: ApiResponse,
    params: TransactionFilters
  ): Promise<void> {
    const body = await response.getBody(decodeTransactionsResponse);
    assert.ok(body.data !== null && body.data.length > 0, "Expected the response to contain transactions");
    for (const transaction of body.data) {
      for (const [field, expectedValue] of Object.entries(params.toMap())) {
        const actualValue = fieldValue(transaction, field);
        assert.equal(
          actualValue,
          expectedValue,
          `Checking value for field: ${field}`
        );
      }
    }
  }
}

function fieldValue(
  transaction: Transaction,
  field: string
): string | null | undefined {
  switch (field) {
    case "region":
      return transaction.region;
    case "category":
      return transaction.category;
    default:
      throw new RangeError(`Cannot verify transaction values for filter: ${field}`);
  }
}
