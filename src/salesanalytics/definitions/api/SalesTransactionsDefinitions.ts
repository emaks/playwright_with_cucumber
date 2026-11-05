import {DataTable, Then, When} from "@cucumber/cucumber";
import type {ApiResponse} from "../../../framework/api/ApiResponse.js";
import {ParameterTypeAdapter} from "../ParameterTypeAdapter.js";
import {ContextKey} from "../../../testsupport/context/ContextKey.js";
import {TestWorld} from "../../../testsupport/cucumber/World.js";

When(
  "I send a GET request to the {string} endpoint with these parameters:",
  async function (this: TestWorld, endpoint: string, table: DataTable) {
    if (endpoint !== "transactions") {
      throw new RangeError(`Unsupported endpoint in Sales Transactions steps: ${endpoint}`);
    }
    const filters = ParameterTypeAdapter.transactionFilters(table.raw());
    const response = await this.requireApiSteps()
      .sendGETRequestToTransactionsEndpointWithParams(filters);
    this.context.set(ContextKey.RESPONSE, response);
  }
);

Then(
  "the response should contain only transactions matching:",
  async function (this: TestWorld, table: DataTable) {
    const response = this.context.get<ApiResponse>(ContextKey.RESPONSE);
    if (response === undefined) throw new Error("No API response is stored in the scenario context");
    const filters = ParameterTypeAdapter.transactionFilters(table.raw());
    await this.requireApiSteps().verifyTransactionsFilteredBy(response, filters);
  }
);
