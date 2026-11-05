import {ApiRequestOptions} from "../../framework/api/ApiRequestOptions.js";

export class RequestOptionsBuilder {
  private values: {
    dateRange?: string | null | undefined;
    region?: string | null | undefined;
    category?: string | null | undefined;
    sort?: string | null | undefined;
    timeout?: number | null | undefined;
  } = {};

  static builder(): RequestOptionsBuilder {
    return new RequestOptionsBuilder();
  }

  dateRange(value: string | null | undefined): this {
    this.values.dateRange = value;
    return this;
  }

  region(value: string | null | undefined): this {
    this.values.region = value;
    return this;
  }

  category(value: string | null | undefined): this {
    this.values.category = value;
    return this;
  }

  sort(value: string | null | undefined): this {
    this.values.sort = value;
    return this;
  }

  timeout(value: number | null | undefined): this {
    this.values.timeout = value;
    return this;
  }

  build(): ApiRequestOptions {
    const params: Record<string, string> = {};
    addIfPresent(params, "dateRange", this.values.dateRange);
    addIfPresent(params, "region", this.values.region);
    addIfPresent(params, "category", this.values.category);
    addIfPresent(params, "sort", this.values.sort);
    return new ApiRequestOptions(
      params,
      this.values.timeout ?? ApiRequestOptions.DEFAULT_TIMEOUT
    );
  }
}

function addIfPresent(
  target: Record<string, string>,
  name: string,
  value: string | null | undefined
): void {
  if (value !== null && value !== undefined) target[name] = value;
}
