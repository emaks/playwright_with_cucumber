import {Decimal} from "decimal.js";
import {
    isLosslessNumber,
    LosslessNumber,
    parse as parseLossless,
    stringify as stringifyLossless
} from "lossless-json";

export type Decoder<T> = (value: unknown) => T;

export function parseJson(source: string): unknown {
  return parseLossless(source, undefined, {
    parseNumber: (value) => new LosslessNumber(value)
  });
}

export function readValue<T>(source: string, decoder: Decoder<T>): T {
  return decoder(parseJson(source));
}

export function writeValueAsString(value: unknown): string {
  const result = stringifyLossless(value, undefined, undefined, [
    {
      test: (item) => item instanceof Decimal,
      stringify: (item) => (item as Decimal).toString()
    }
  ]);
  if (result === undefined) {
    throw new TypeError("The value cannot be serialized as JSON");
  }
  return result;
}

export function convertValue<T>(value: unknown, decoder: Decoder<T>): T {
  return decoder(value);
}

export function readDecimal(value: unknown, fieldName: string): Decimal {
  if (value instanceof Decimal) return value;
  if (isLosslessNumber(value)) return new Decimal(value.toString());
  if (typeof value === "string" || typeof value === "number") {
    return new Decimal(value);
  }
  throw new TypeError(`Expected '${fieldName}' to be a decimal number`);
}

export function readOptionalString(
  value: unknown,
  fieldName: string
): string | null | undefined {
  if (value === undefined || value === null || typeof value === "string") return value;
  throw new TypeError(`Expected '${fieldName}' to be a string, null, or omitted`);
}

export function readLosslessInteger(value: unknown, fieldName: string): number {
  const text =
    isLosslessNumber(value) ? value.toString() : typeof value === "number" ? String(value) : "";
  if (!/^-?\d+$/.test(text)) {
    throw new TypeError(`Expected '${fieldName}' to be an integer`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`Integer '${fieldName}' is outside JavaScript's safe integer range`);
  }
  return parsed;
}
