package io.materialspace.salesanalytics.steps.ui;

import io.materialspace.salesanalytics.api.TransactionFilter;
import io.materialspace.salesanalytics.ui.TransactionsPage;
import io.materialspace.salesanalytics.ui.component.TransactionsGrid;
import lombok.AllArgsConstructor;
import org.assertj.core.api.Assertions;

import java.util.List;
import java.util.Map;

@AllArgsConstructor
public class SalesTransactionsSteps {
    private final TransactionsPage transactionsPage;

    public void openSalesTransactionsPage() {
        transactionsPage.open();
    }

    public void selectValuesInFilters(Map<TransactionFilter, String> filters) {
        filters.forEach((name, value) -> transactionsPage.filtersComponent().select(name, value));
    }

    public void clickClearButtonInFilters() {
        transactionsPage.waitForGridReload(
            () -> transactionsPage.filtersComponent().clearButton().click()
        );
    }

    public void clickApplyButtonInFilters() {
        transactionsPage.waitForGridReload(
            () -> transactionsPage.filtersComponent().applyButton().click()
        );
    }

    public void verifyFilteredColumnValue(Map<TransactionsGrid.Column, String> filters) {
        filters.forEach((name, value) -> {
            List<String> values = transactionsPage.transactionsGridComponent()
                .getDataForColumn(name);
            Assertions.assertThat(values)
                .as("Expected the '%s' column to contain transactions", name)
                .isNotEmpty();
            Assertions.assertThat(values.stream().allMatch(v -> v.equals(value)))
                .as("Verify that all values in column '%s' are equal to '%s'", name, value)
                .isTrue();
        });
    }
}
