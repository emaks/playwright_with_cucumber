import assert from "node:assert/strict";
import {TransactionFilter} from "../../api/TransactionFilter.js";
import type {TransactionsPage} from "../../ui/TransactionsPage.js";
import {Column} from "../../ui/component/TransactionsGrid.js";

export class SalesTransactionsSteps {
  constructor(private readonly transactionsPage: TransactionsPage) {}

  openSalesTransactionsPage(): Promise<void> {
    return this.transactionsPage.open();
  }

  async selectValuesInFilters(
    filters: ReadonlyMap<TransactionFilter, string>
  ): Promise<void> {
    for (const [name, value] of filters) {
      await this.transactionsPage.filtersComponent.select(name, value);
    }
  }

  clickClearButtonInFilters(): Promise<void> {
    return this.transactionsPage.waitForGridReload(
      () => this.transactionsPage.filtersComponent.clearButton.click()
    );
  }

  clickApplyButtonInFilters(): Promise<void> {
    return this.transactionsPage.waitForGridReload(
      () => this.transactionsPage.filtersComponent.applyButton.click()
    );
  }

  async verifyFilteredColumnValue(filters: ReadonlyMap<Column, string>): Promise<void> {
    for (const [column, expectedValue] of filters) {
      const values = await this.transactionsPage.transactionsGridComponent
        .getDataForColumn(column);
      assert.ok(values.length > 0, `Expected the '${column}' column to contain transactions`);
      assert.ok(
        values.every((value) => value === expectedValue),
        `Verify that all values in column '${column}' are equal to '${expectedValue}'`
      );
    }
  }
}
