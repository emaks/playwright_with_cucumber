import {DataTable, Given, Then, When} from "@cucumber/cucumber";
import {ParameterTypeAdapter} from "../ParameterTypeAdapter.js";
import {Column} from "../../ui/component/TransactionsGrid.js";
import {TestWorld} from "../../../testsupport/cucumber/World.js";

Given("I open the 'Sales Transactions' page", async function (this: TestWorld) {
  await this.requireUiSteps().openSalesTransactionsPage();
});

When("I select the following filter values:", async function (
  this: TestWorld,
  table: DataTable
) {
  const filters = new Map(
    table.raw().map(([name, value]) => {
      if (name === undefined || value === undefined) {
        throw new TypeError("Filter table rows must contain a name and a value");
      }
      return [
        ParameterTypeAdapter.transactionFilter(name),
        ParameterTypeAdapter.emptyCell(value)
      ] as const;
    })
  );
  await this.requireUiSteps().selectValuesInFilters(filters);
});

When("I click 'Clear' button in filters", async function (this: TestWorld) {
  await this.requireUiSteps().clickClearButtonInFilters();
});

When("I click the 'Apply' button", async function (this: TestWorld) {
  await this.requireUiSteps().clickApplyButtonInFilters();
});

Then("I should see transactions in the grid matching:", async function (
  this: TestWorld,
  table: DataTable
) {
  const filters = new Map(
    table.raw().map(([name, value]) => {
      if (name === undefined || value === undefined) {
        throw new TypeError("Column table rows must contain a name and a value");
      }
      return [
        ParameterTypeAdapter.transactionsGridColumn(name),
        ParameterTypeAdapter.emptyCell(value)
      ] as const;
    })
  );
  await this.requireUiSteps().verifyFilteredColumnValue(filters as ReadonlyMap<Column, string>);
});
