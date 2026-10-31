package io.materialspace.definitions;

import io.cucumber.datatable.DataTable;
import io.cucumber.java.DataTableType;
import io.cucumber.java.DefaultDataTableCellTransformer;
import io.cucumber.java.DefaultDataTableEntryTransformer;
import io.cucumber.java.DefaultParameterTransformer;
import io.materialspace.be.salestransactions.TransactionFilter;
import io.materialspace.be.salestransactions.TransactionFilters;
import io.materialspace.fe.salestransactions.component.TransactionsGrid;
import io.materialspace.lib.utils.ObjectMapperUtils;

import java.lang.reflect.Type;
import java.util.Map;

public class ParameterTypeAdapter {
    @DefaultParameterTransformer
    @DefaultDataTableCellTransformer(replaceWithEmptyString = "<empty>")
    @DefaultDataTableEntryTransformer(replaceWithEmptyString = "<empty>")
    public Object transformer(Object fromValue, Type toValueType) {
        return ObjectMapperUtils.convertValue(fromValue, toValueType);
    }

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
