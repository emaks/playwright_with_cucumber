package io.materialspace.salesanalytics.definitions.api;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.materialspace.salesanalytics.api.TransactionFilters;
import io.materialspace.salesanalytics.steps.api.SalesTransactionsSteps;
import io.materialspace.testsupport.context.Context;
import io.materialspace.testsupport.context.ContextKey;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class SalesTransactionsDefinitions {
    private final Context context;
    private final SalesTransactionsSteps steps;

    @When("I send a GET request to the 'transactions' endpoint with these parameters:")
    public void sendGETRequestToTransactionsEndpointWithParams(TransactionFilters params) {
        context.set(
            ContextKey.RESPONSE,
            steps.sendGETRequestToTransactionsEndpointWithParams(params)
        );
    }

    @Then("the response should contain only transactions matching:")
    public void verifyTransactionsFilteredBy(TransactionFilters params) {
        steps.verifyTransactionsFilteredBy(context.get(ContextKey.RESPONSE), params);
    }
}
