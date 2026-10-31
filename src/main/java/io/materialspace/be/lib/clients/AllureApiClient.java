package io.materialspace.be.lib.clients;

import io.materialspace.be.lib.ApiClient;
import io.materialspace.be.lib.ApiRequestOptions;
import io.materialspace.be.lib.ApiResponse;
import io.qameta.allure.Allure;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.function.Supplier;

public class AllureApiClient implements ApiClient {
    private final ApiClient delegate;

    public AllureApiClient(ApiClient delegate) {
        this.delegate = delegate;
    }

    @Override
    public ApiResponse get(String url, ApiRequestOptions options) {
        return execute("GET", url, options, () -> delegate.get(url, options));
    }

    @Override
    public void close() {
        delegate.close();
    }

    private ApiResponse execute(
        String method, String url, ApiRequestOptions options, Supplier<ApiResponse> request
    ) {
        Allure.attachment(
            "API request",
            "text/plain",
            "%s %s%nQuery parameters: %s%nTimeout: %s ms".formatted(
                method, url, options.queryParams(), options.timeout()
            )
        );
        ApiResponse response;
        try {
            response = request.get();
        } catch (RuntimeException exception) {
            StringWriter trace = new StringWriter();
            exception.printStackTrace(new PrintWriter(trace));
            Allure.attachment("API request failure", "text/plain", trace.toString());
            throw exception;
        }
        Allure.attachment("API request URL", "text/plain", response.getUrl());
        Allure.attachment("API response", "text/plain", response.getDetails());
        return response;
    }
}
