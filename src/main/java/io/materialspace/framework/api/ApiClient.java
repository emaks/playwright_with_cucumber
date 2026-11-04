package io.materialspace.framework.api;

public interface ApiClient extends AutoCloseable {
    ApiResponse get(String url, ApiRequestOptions options);

    @Override
    void close();
}
