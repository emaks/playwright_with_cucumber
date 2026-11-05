export class TransactionFilters {
  constructor(
    readonly dateRange?: string | null,
    readonly region?: string | null,
    readonly category?: string | null,
    readonly sort?: string | null
  ) {}

  toMap(): Readonly<Record<string, string>> {
    const filters: Record<string, string> = {};
    putIfPresent(filters, "dateRange", this.dateRange);
    putIfPresent(filters, "region", this.region);
    putIfPresent(filters, "category", this.category);
    putIfPresent(filters, "sort", this.sort);
    return Object.freeze(filters);
  }
}

function putIfPresent(
  target: Record<string, string>,
  name: string,
  value: string | null | undefined
): void {
  if (value !== null && value !== undefined) target[name] = value;
}
