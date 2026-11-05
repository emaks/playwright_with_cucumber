import {Column} from "../ui/component/TransactionsGrid.js";
import {TransactionFilter} from "../api/TransactionFilter.js";
import {TransactionFilters} from "../api/TransactionFilters.js";

export class ParameterTypeAdapter {
  static transactionFilters(rows: readonly (readonly string[])[]): TransactionFilters {
    const values = new Map<string, string>();
    for (const [name, rawValue] of rows) {
      if (name === undefined || rawValue === undefined) {
        throw new TypeError("Filter table rows must contain a name and a value");
      }
      values.set(name, emptyCell(rawValue));
    }
    return new TransactionFilters(
      values.get("dateRange"),
      values.get("region"),
      values.get("category"),
      values.get("sort")
    );
  }

  static transactionFilter(name: string): TransactionFilter {
    const value = TransactionFilter[name.toUpperCase() as keyof typeof TransactionFilter];
    if (value === undefined) throw new RangeError(`Unknown transaction filter: ${name}`);
    return value;
  }

  static transactionsGridColumn(name: string): Column {
    const value = Column[name.toUpperCase() as keyof typeof Column];
    if (value === undefined) throw new RangeError(`Unknown transaction grid column: ${name}`);
    return value;
  }

  static emptyCell(value: string): string {
    return emptyCell(value);
  }
}

function emptyCell(value: string): string {
  return value === "<empty>" ? "" : value;
}
