import {PropertyLoader} from "../config/PropertyLoader.js";
import type {PageWrapper} from "./PageWrapper.js";

export abstract class BasePage {
  protected constructor(protected readonly page: PageWrapper) {}

  async open(path: string): Promise<void> {
    await this.page.navigate(PropertyLoader.getRequired("ui.base.url") + path);
    await this.waitForLoaded();
  }

  protected abstract waitForLoaded(): Promise<void>;

  url(): string {
    return this.page.url();
  }
}
