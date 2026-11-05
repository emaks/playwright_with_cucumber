import type {Response} from "playwright";
import {BasePage} from "../../framework/ui/BasePage.js";
import type {PageWrapper} from "../../framework/ui/PageWrapper.js";
import {FindBy} from "../../framework/ui/pagefactory/FindBy.js";
import {Filters} from "./component/Filters.js";
import {TransactionsGrid} from "./component/TransactionsGrid.js";

export class TransactionsPage extends BasePage {
  @FindBy({ type: Filters })
  filtersComponent!: Filters;

  @FindBy({ type: TransactionsGrid })
  transactionsGridComponent!: TransactionsGrid;

  constructor(page: PageWrapper) {
    super(page);
  }

  override async open(): Promise<void> {
    await super.open("/");
  }

  async waitForGridReload(triggerReload: () => void | Promise<void>): Promise<void> {
    const response = await this.page.waitForResponse(
      (candidate) =>
        isTransactionsGetResponse(candidate) &&
        new URL(candidate.url()).pathname === "/api/transactions",
      triggerReload
    );
    if (!response.ok()) {
      throw new Error(`GET /api/transactions failed with HTTP ${response.status()}`);
    }
    await this.transactionsGridComponent.waitForLoadingStatusHidden();
  }

  protected async waitForLoaded(): Promise<void> {
    await this.filtersComponent.waitForLoaded();
    await this.transactionsGridComponent.waitForLoaded();
  }
}

function isTransactionsGetResponse(response: Response): boolean {
  return response.request().method() === "GET";
}
