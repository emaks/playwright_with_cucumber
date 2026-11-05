import type {APIResponse} from "playwright";
import {type Decoder, readValue} from "../json/JsonCodec.js";

export class ApiResponse {
  constructor(private readonly response: APIResponse) {}

  getStatusCode(): number {
    return this.response.status();
  }

  getUrl(): string {
    return this.response.url();
  }

  async getBody<T>(decoder: Decoder<T>): Promise<T> {
    return readValue(await this.response.text(), decoder);
  }

  async getDetails(): Promise<string> {
    const headers = await this.response.headers();
    const headerText = Object.entries(headers)
      .map(([name, value]) => `${name}: ${value}`)
      .join("\n");
    return [
      `Status: ${this.response.status()} ${this.response.statusText()}`,
      "Headers:",
      headerText,
      "",
      "Body:",
      await this.response.text()
    ].join("\n");
  }

  getPlaywrightResponse(): APIResponse {
    return this.response;
  }
}
