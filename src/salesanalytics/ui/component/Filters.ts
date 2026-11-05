import type {Locator} from "playwright";
import {Button} from "../../../framework/ui/control/Button.js";
import {Dropdown} from "../../../framework/ui/control/Dropdown.js";
import {FindBy} from "../../../framework/ui/pagefactory/FindBy.js";
import {TransactionFilter} from "../../api/TransactionFilter.js";

@FindBy({ selector: "//section[h2='Filters']" })
export class Filters {
  @FindBy({ selector: "#dateRange", type: Dropdown })
  dateRangeDropdown!: Dropdown;

  @FindBy({ selector: "#region", type: Dropdown })
  regionDropdown!: Dropdown;

  @FindBy({ selector: "#category", type: Dropdown })
  categoryDropdown!: Dropdown;

  @FindBy({ selector: "#sort", type: Dropdown })
  sortByDropdown!: Dropdown;

  @FindBy({ selector: "#apply", type: Button })
  applyButton!: Button;

  @FindBy({ selector: "#clear", type: Button })
  clearButton!: Button;

  constructor(private readonly root: Locator) {}

  async waitForLoaded(): Promise<this> {
    await this.root.waitFor();
    return this;
  }

  async select(name: TransactionFilter, value: string): Promise<void> {
    switch (name) {
      case TransactionFilter.DATE_RANGE:
        await this.dateRangeDropdown.select(value);
        break;
      case TransactionFilter.REGION:
        await this.regionDropdown.select(value);
        break;
      case TransactionFilter.CATEGORY:
        await this.categoryDropdown.select(value);
        break;
      case TransactionFilter.SORT:
        await this.sortByDropdown.select(value);
        break;
      default:
        throw new RangeError(`Unknown filter name: ${String(name)}`);
    }
  }
}
