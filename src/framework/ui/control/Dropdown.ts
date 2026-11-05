import type {Locator} from "playwright";

export class Dropdown {
  constructor(private readonly root: Locator) {}

  async select(value: string): Promise<void> {
    await this.root.selectOption(value);
  }
}
