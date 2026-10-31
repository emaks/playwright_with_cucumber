package io.materialspace.be.lib;

public interface ApiClient extends AutoCloseable {
    ApiResponse get(String url, ApiRequestOptions options);

    @Override
    void close();
}
