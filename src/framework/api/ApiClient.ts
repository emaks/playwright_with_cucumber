import type {ApiRequestOptions} from "./ApiRequestOptions.js";
import type {ApiResponse} from "./ApiResponse.js";

export interface ApiClient {
  get(url: string, options: ApiRequestOptions): Promise<ApiResponse>;
  close(): Promise<void>;
}
