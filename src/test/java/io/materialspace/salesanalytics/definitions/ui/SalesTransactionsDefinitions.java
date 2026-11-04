package io.materialspace.salesanalytics.definitions.ui;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.materialspace.salesanalytics.api.TransactionFilter;
import io.materialspace.salesanalytics.steps.ui.SalesTransactionsSteps;
import io.materialspace.salesanalytics.ui.component.TransactionsGrid;
import io.materialspace.testsupport.context.Context;
import lombok.AllArgsConstructor;

import java.util.Map;

@AllArgsConstructor
public class SalesTransactionsDefinitions {
    private final Context context;
    private final SalesTransactionsSteps steps;

    @Given("I open the 'Sales Transactions' page")
    public void openSalesTransactionsPage() {
        steps.openSalesTransactionsPage();
    }

    @When("I select the following filter values:")
    public void selectValuesInFilters(Map<TransactionFilter, String> filters) {
        steps.selectValuesInFilters(filters);
    }

    @When("I click 'Clear' button in filters")
    public void clickClearButtonInFilters() {
        steps.clickClearButtonInFilters();
    }

    @When("I click the 'Apply' button")
    public void clickApplyButtonInFilters() {
        steps.clickApplyButtonInFilters();
    }

    @Then("I should see transactions in the grid matching:")
    public void verifyFilteredColumnValue(Map<TransactionsGrid.Column, String> filters) {
        steps.verifyFilteredColumnValue(filters);
    }
}
