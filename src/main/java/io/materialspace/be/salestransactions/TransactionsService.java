package io.materialspace.be.salestransactions;

import io.materialspace.be.lib.ApiClient;
import io.materialspace.be.lib.ApiResponse;

public class TransactionsService {
    private static final String LIST_ENDPOINT = "transactions";
    private final ApiClient apiClient;

    public TransactionsService(ApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ApiResponse listTransactions(TransactionFilters filters) {
        return apiClient.get(
            LIST_ENDPOINT,
            RequestOptionsBuilder.builder()
                .dateRange(filters.dateRange())
                .region(filters.region())
                .category(filters.category())
                .sort(filters.sort())
                .build()
        );
    }
}
