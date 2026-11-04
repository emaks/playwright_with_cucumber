package io.materialspace.salesanalytics.steps.api;

import io.materialspace.framework.api.ApiResponse;
import io.materialspace.salesanalytics.api.TransactionFilters;
import io.materialspace.salesanalytics.api.TransactionsService;
import io.materialspace.salesanalytics.api.models.TransactionsResponse;
import lombok.AllArgsConstructor;
import org.assertj.core.api.Assertions;

@AllArgsConstructor
public class SalesTransactionsSteps {
    private final TransactionsService service;

    public ApiResponse sendGETRequestToTransactionsEndpointWithParams(TransactionFilters filters) {
        return service.listTransactions(filters);
    }

    public void verifyTransactionsFilteredBy(
        ApiResponse response,
        TransactionFilters params
    ) {
        var body = response.getBody(TransactionsResponse.class);
        Assertions.assertThat(body.getData())
            .as("Expected the response to contain transactions")
            .isNotEmpty();
        body.getData().forEach(transaction -> params.toMap().forEach((field, expectedValue) -> {
            String actualValue = switch (field) {
                case "region" -> transaction.getRegion();
                case "category" -> transaction.getCategory();
                default -> throw new IllegalArgumentException(
                    "Cannot verify transaction values for filter: " + field
                );
            };
            Assertions.assertThat(actualValue)
                .as("Checking value for field: " + field)
                .isEqualTo(expectedValue);
        }));
    }
}
