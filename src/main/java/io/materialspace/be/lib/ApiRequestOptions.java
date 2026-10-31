package io.materialspace.be.lib;

import java.util.Map;

public record ApiRequestOptions(Map<String, String> queryParams, double timeout) {
    public static final double DEFAULT_TIMEOUT = 30000;

    public ApiRequestOptions {
        queryParams = Map.copyOf(queryParams);
        if (!Double.isFinite(timeout) || timeout < 0) {
            throw new IllegalArgumentException("Request timeout must be finite and non-negative");
        }
    }
}
