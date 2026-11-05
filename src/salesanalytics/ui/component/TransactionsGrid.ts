import type {Locator} from "playwright";
import {Table} from "../../../framework/ui/control/Table.js";
import {FindBy} from "../../../framework/ui/pagefactory/FindBy.js";

@FindBy({ selector: "//section[h2='Sales Transactions']" })
export class TransactionsGrid {
  @FindBy({ selector: "#status", locator: true })
  statusBar!: Locator;

  @FindBy({ selector: "table[aria-label='Sales transactions']", type: Table })
  salesTable!: Table;

  constructor(private readonly root: Locator) {}

  async waitForLoaded(): Promise<this> {
    await this.root.waitFor();
    const loadingStatus = this.loadingStatus();
    await loadingStatus.waitFor({ state: "visible" });
    await loadingStatus.waitFor({ state: "hidden" });
    return this;
  }

  async waitForLoadingStatusHidden(): Promise<void> {
    await this.loadingStatus().waitFor({ state: "hidden" });
  }

  async getDataForColumn(name: Column): Promise<string[]> {
    return this.salesTable.getColumnData(name);
  }

  private loadingStatus(): Locator {
    return this.statusBar.filter({ hasText: "Loading transactions…" });
  }
}

export enum Column {
  DATE = "Date",
  REGION = "Region",
  CATEGORY = "Category",
  REVENUE = "Revenue (USD)",
  ORDER_ID = "Order ID"
}
