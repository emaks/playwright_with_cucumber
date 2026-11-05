import {attachment, ContentType} from "allure-js-commons";
import type {ApiClient} from "../../api/ApiClient.js";
import type {ApiRequestOptions} from "../../api/ApiRequestOptions.js";
import type {ApiResponse} from "../../api/ApiResponse.js";
import {logger} from "../../logging/Logger.js";

export class AllureApiClient implements ApiClient {
  constructor(private readonly delegate: ApiClient) {}

  async get(url: string, options: ApiRequestOptions): Promise<ApiResponse> {
    await attachment(
      "API request",
      [
        `GET ${url}`,
        `Query parameters: ${JSON.stringify(options.queryParams)}`,
        `Timeout: ${options.timeout} ms`
      ].join("\n"),
      ContentType.TEXT
    );

    let response: ApiResponse;
    try {
      response = await this.delegate.get(url, options);
    } catch (error) {
      const trace = error instanceof Error ? error.stack ?? error.message : String(error);
      try {
        await attachment("API request failure", trace, ContentType.TEXT);
      } catch (reportingError) {
        logger.error({ err: reportingError }, "Unable to attach API transport failure to Allure");
        preserveAsSuppressed(error, reportingError);
      }
      throw error;
    }

    await attachment("API request URL", response.getUrl(), ContentType.TEXT);
    await attachment("API response", await response.getDetails(), ContentType.TEXT);
    return response;
  }

  async close(): Promise<void> {
    await this.delegate.close();
  }
}

function preserveAsSuppressed(primary: unknown, secondary: unknown): void {
  if (primary instanceof Error) {
    const existing = (primary as Error & { suppressed?: unknown[] }).suppressed ?? [];
    Object.defineProperty(primary, "suppressed", {
      configurable: true,
      value: [...existing, secondary]
    });
  }
}
