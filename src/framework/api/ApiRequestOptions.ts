export class ApiRequestOptions {
  static readonly DEFAULT_TIMEOUT = 30_000;

  readonly queryParams: Readonly<Record<string, string>>;
  readonly timeout: number;

  constructor(
    queryParams: Readonly<Record<string, string>> = {},
    timeout = ApiRequestOptions.DEFAULT_TIMEOUT
  ) {
    if (!Number.isFinite(timeout) || timeout < 0) {
      throw new RangeError("Request timeout must be finite and non-negative");
    }
    this.queryParams = Object.freeze({ ...queryParams });
    this.timeout = timeout;
  }
}
