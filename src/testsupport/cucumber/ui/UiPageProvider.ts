import type {Page} from "playwright";
import {PlaywrightSession} from "../../../framework/playwright/PlaywrightSession.js";
import {PageFactory} from "../../../framework/ui/pagefactory/PageFactory.js";
import {PageWrapper} from "../../../framework/ui/PageWrapper.js";
import {TransactionsPage} from "../../../salesanalytics/ui/TransactionsPage.js";

export interface InitializedTransactionsPage {
  readonly page: PageWrapper;
  readonly browserPage: Page;
  readonly transactionsPage: TransactionsPage;
}

export class UiPageProvider {
  async provide(
    session: PlaywrightSession,
    browser: string
  ): Promise<InitializedTransactionsPage> {
    const browserPage = await session.getNewPage(browser);
    const page = new PageWrapper();
    page.initialize(browserPage);
    const transactionsPage = new TransactionsPage(page);
    PageFactory.initElements(transactionsPage, page);
    return { page, browserPage, transactionsPage };
  }
}
