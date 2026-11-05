import type {Locator, Page, Response} from "playwright";

export class PageWrapper {
  private page: Page | undefined;

  initialize(page: Page): void {
    this.page = page;
  }

  async navigate(url: string): Promise<void> {
    await this.requirePage().goto(url);
  }

  url(): string {
    return this.requirePage().url();
  }

  locator(selector: string): Locator {
    return this.requirePage().locator(selector);
  }

  async waitForResponse(
    predicate: (response: Response) => boolean,
    action: () => void | Promise<void>
  ): Promise<Response> {
    const abort = new AbortController();
    const response = this.requirePage().waitForResponse(predicate, { signal: abort.signal });
    try {
      await action();
    } catch (error) {
      abort.abort();
      await response.catch(() => undefined);
      throw error;
    }
    return response;
  }

  async screenshot(): Promise<Buffer> {
    return this.requirePage().screenshot();
  }

  isAvailable(): boolean {
    return this.page !== undefined && !this.page.isClosed();
  }

  private requirePage(): Page {
    if (this.page === undefined) {
      throw new Error("Playwright page has not been initialized");
    }
    return this.page;
  }
}
