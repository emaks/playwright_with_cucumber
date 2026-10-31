package io.materialspace.be.salestransactions;

import io.materialspace.be.lib.ApiRequestOptions;
import lombok.Builder;

import java.util.LinkedHashMap;
import java.util.Map;

public final class RequestOptionsBuilder {
    private RequestOptionsBuilder() {
    }

    @Builder(builderClassName = "OptionsBuilder")
    private static ApiRequestOptions create(
        String dateRange,
        String region,
        String category,
        String sort,
        Double timeout
    ) {
        Map<String, String> options = new LinkedHashMap<>();
        setIfPresent(options, "dateRange", dateRange);
        setIfPresent(options, "region", region);
        setIfPresent(options, "category", category);
        setIfPresent(options, "sort", sort);
        return new ApiRequestOptions(
            options, timeout == null ? ApiRequestOptions.DEFAULT_TIMEOUT : timeout
        );
    }

    private static void setIfPresent(Map<String, String> options, String name, String value) {
        if (value != null) {
            options.put(name, value);
        }
    }
}
