package io.materialspace.be.lib.clients;

import com.microsoft.playwright.APIRequestContext;
import com.microsoft.playwright.options.RequestOptions;
import io.materialspace.be.lib.ApiClient;
import io.materialspace.be.lib.ApiRequestOptions;
import io.materialspace.be.lib.ApiResponse;

public class PlaywrightApiClient implements ApiClient {
    private final APIRequestContext context;

    public PlaywrightApiClient(APIRequestContext context) {
        this.context = context;
    }

    @Override
    public ApiResponse get(String url, ApiRequestOptions options) {
        RequestOptions request = RequestOptions.create().setTimeout(options.timeout());
        options.queryParams().forEach(request::setQueryParam);
        return new ApiResponse(context.get(url, request));
    }

    @Override
    public void close() {
        context.dispose();
    }
}
