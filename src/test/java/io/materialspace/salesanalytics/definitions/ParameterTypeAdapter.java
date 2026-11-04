package io.materialspace.salesanalytics.definitions;

import io.cucumber.datatable.DataTable;
import io.cucumber.java.DataTableType;
import io.materialspace.framework.json.ObjectMapperUtils;
import io.materialspace.salesanalytics.api.TransactionFilter;
import io.materialspace.salesanalytics.api.TransactionFilters;
import io.materialspace.salesanalytics.ui.component.TransactionsGrid;

import java.util.Map;

public class ParameterTypeAdapter {
    @DataTableType
    public TransactionFilters transactionFilters(DataTable dataTable) {
        Map<String, String> entry = dataTable.transpose().entries().getFirst();
        return ObjectMapperUtils.convertValue(entry, TransactionFilters.class);
    }

    @DataTableType
    public TransactionFilter transactionFilter(String name) {
        return TransactionFilter.valueOf(name.toUpperCase());
    }

    @DataTableType
    public TransactionsGrid.Column transactionsGridColumn(String name) {
        return TransactionsGrid.Column.valueOf(name.toUpperCase());
    }
}
