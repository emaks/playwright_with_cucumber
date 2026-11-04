package io.materialspace.salesanalytics.api;

import java.util.LinkedHashMap;
import java.util.Map;

public record TransactionFilters(String dateRange, String region, String category, String sort) {
    public Map<String, String> toMap() {
        Map<String, String> filters = new LinkedHashMap<>();
        putIfPresent(filters, "dateRange", dateRange);
        putIfPresent(filters, "region", region);
        putIfPresent(filters, "category", category);
        putIfPresent(filters, "sort", sort);
        return Map.copyOf(filters);
    }

    private void putIfPresent(Map<String, String> filters, String name, String value) {
        if (value != null) {
            filters.put(name, value);
        }
    }
}
