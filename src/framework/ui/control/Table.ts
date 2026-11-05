import type {Locator} from "playwright";

export class Table {
  constructor(private readonly root: Locator) {}

  async getColumnData(columnName: string): Promise<string[]> {
    const headers = await this.root.locator("thead th").allInnerTexts();
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex < 0) {
      throw new RangeError(`Column not found in table: ${columnName}`);
    }
    const values = await this.root
      .locator(`tbody tr td:nth-child(${columnIndex + 1})`)
      .allInnerTexts();
    return values.map((value) => value.trim());
  }
}
