package io.materialspace.definitions.be;

import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.materialspace.be.salestransactions.TransactionFilters;
import io.materialspace.lib.utils.Context;
import io.materialspace.lib.utils.ContextKey;
import io.materialspace.steps.be.SalesTransactionsSteps;
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
