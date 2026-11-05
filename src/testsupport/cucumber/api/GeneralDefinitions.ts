import assert from "node:assert/strict";
import {Then} from "@cucumber/cucumber";
import type {ApiResponse} from "../../../framework/api/ApiResponse.js";
import {ContextKey} from "../../context/ContextKey.js";
import {TestWorld} from "../World.js";

Then("the response status code should be {int}", function (
  this: TestWorld,
  expectedStatusCode: number
) {
  const response = this.context.get<ApiResponse>(ContextKey.RESPONSE);
  assert.ok(response !== undefined, "No API response is stored in the scenario context");
  assert.equal(
    response.getStatusCode(),
    expectedStatusCode,
    `Expected status code to be ${expectedStatusCode} but was ${response.getStatusCode()}`
  );
});
