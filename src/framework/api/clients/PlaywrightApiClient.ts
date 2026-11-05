import type {APIRequestContext} from "playwright";
import type {ApiClient} from "../ApiClient.js";
import {ApiRequestOptions} from "../ApiRequestOptions.js";
import {ApiResponse} from "../ApiResponse.js";

export class PlaywrightApiClient implements ApiClient {
  constructor(private readonly context: APIRequestContext) {}

  async get(url: string, options: ApiRequestOptions): Promise<ApiResponse> {
    const response = await this.context.get(url, {
      params: { ...options.queryParams },
      timeout: options.timeout
    });
    return new ApiResponse(response);
  }

  async close(): Promise<void> {
    await this.context.dispose();
  }
}
