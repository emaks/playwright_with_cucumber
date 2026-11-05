import type {Locator} from "playwright";

export class LocatorList<T> {
  constructor(
    private readonly locator: Locator,
    private readonly fieldDescription: string,
    private readonly selector: string,
    private readonly itemFactory: (index: number, locator: Locator) => T
  ) {}

  async count(): Promise<number> {
    return this.locator.count();
  }

  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  async get(index: number): Promise<T> {
    const count = await this.count();
    if (!Number.isInteger(index) || index < 0 || index >= count) {
      throw new RangeError(
        `Cannot read ${this.fieldDescription} at index ${index} for selector '${this.selector}'; count is ${count}`
      );
    }
    return this.itemFactory(index, this.locator.nth(index));
  }

  async snapshot(): Promise<readonly T[]> {
    const count = await this.count();
    return Array.from({ length: count }, (_unused, index) =>
      this.itemFactory(index, this.locator.nth(index))
    );
  }

  toString(): string {
    return `Lazy UI list ${this.fieldDescription} (${this.selector})`;
  }
}
