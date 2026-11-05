import type {Locator} from "playwright";

export class Button {
  constructor(private readonly root: Locator) {}

  async click(): Promise<void> {
    await this.root.click();
  }
}
