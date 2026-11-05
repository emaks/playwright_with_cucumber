import {Decimal} from "decimal.js";
import {
  readDecimal,
  readLosslessInteger,
  readOptionalString
} from "../../../framework/json/JsonCodec.js";

export interface TransactionsResponse {
  readonly data: readonly Transaction[] | null;
  readonly meta: Meta | null;
}

export interface Transaction {
  readonly id: string | null | undefined;
  readonly date: string | null | undefined;
  readonly region: string | null | undefined;
  readonly category: string | null | undefined;
  readonly revenue: Decimal | null;
}

export interface Meta {
  readonly total: number;
  readonly returned: number;
  readonly filters: Filters | null;
}

export interface Filters {
  readonly dateRange: string | null | undefined;
  readonly region: string | null | undefined;
  readonly category: string | null | undefined;
  readonly sort: string | null | undefined;
}

export function decodeTransactionsResponse(value: unknown): TransactionsResponse {
  const record = asObject(value, "TransactionsResponse");
  const rawData = record.data;
  const data =
    rawData === null || rawData === undefined
      ? null
      : Array.isArray(rawData)
        ? rawData.map((item, index) => decodeTransaction(item, `data[${index}]`))
        : invalidField("data", "an array or null");
  const meta =
    record.meta === null || record.meta === undefined
      ? null
      : decodeMeta(record.meta);
  return { data, meta };
}

function decodeTransaction(value: unknown, fieldName: string): Transaction {
  const record = asObject(value, fieldName);
  const revenue =
    record.revenue === null || record.revenue === undefined
      ? null
      : readDecimal(record.revenue, `${fieldName}.revenue`);
  return {
    id: readOptionalString(record.id, `${fieldName}.id`),
    date: readOptionalString(record.date, `${fieldName}.date`),
    region: readOptionalString(record.region, `${fieldName}.region`),
    category: readOptionalString(record.category, `${fieldName}.category`),
    revenue
  };
}

function decodeMeta(value: unknown): Meta {
  const record = asObject(value, "meta");
  return {
    total: readInt32OrDefault(record.total, "meta.total"),
    returned: readInt32OrDefault(record.returned, "meta.returned"),
    filters:
      record.filters === null || record.filters === undefined
        ? null
        : decodeFilters(record.filters)
  };
}

function decodeFilters(value: unknown): Filters {
  const record = asObject(value, "meta.filters");
  return {
    dateRange: readOptionalString(record.dateRange, "meta.filters.dateRange"),
    region: readOptionalString(record.region, "meta.filters.region"),
    category: readOptionalString(record.category, "meta.filters.category"),
    sort: readOptionalString(record.sort, "meta.filters.sort")
  };
}

function readInt32OrDefault(value: unknown, fieldName: string): number {
  if (value === undefined || value === null) return 0;
  const number = readLosslessInteger(value, fieldName);
  if (number < -2_147_483_648 || number > 2_147_483_647) {
    throw new RangeError(`Integer '${fieldName}' is outside the 32-bit integer range`);
  }
  return number;
}

function asObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`Expected '${fieldName}' to be an object`);
  }
  return value as Record<string, unknown>;
}

function invalidField(fieldName: string, expected: string): never {
  throw new TypeError(`Expected '${fieldName}' to be ${expected}`);
}
