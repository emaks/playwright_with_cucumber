import type {ApiClient} from "../../framework/api/ApiClient.js";
import type {ApiResponse} from "../../framework/api/ApiResponse.js";
import {RequestOptionsBuilder} from "./RequestOptionsBuilder.js";
import type {TransactionFilters} from "./TransactionFilters.js";

export class TransactionsService {
  private static readonly LIST_ENDPOINT = "transactions";

  constructor(private readonly apiClient: ApiClient) {}

  listTransactions(filters: TransactionFilters): Promise<ApiResponse> {
    return this.apiClient.get(
      TransactionsService.LIST_ENDPOINT,
      RequestOptionsBuilder.builder()
        .dateRange(filters.dateRange)
        .region(filters.region)
        .category(filters.category)
        .sort(filters.sort)
        .build()
    );
  }
}
