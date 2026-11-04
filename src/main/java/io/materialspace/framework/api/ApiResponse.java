package io.materialspace.framework.api;

import com.microsoft.playwright.APIResponse;
import io.materialspace.framework.json.ObjectMapperUtils;

public class ApiResponse {
    private final APIResponse response;

    public ApiResponse(APIResponse response) {
        this.response = response;
    }

    public int getStatusCode() {
        return response.status();
    }

    public String getUrl() {
        return response.url();
    }

    public <T> T getBody(Class<T> toValueType) {
        return ObjectMapperUtils.readValue(response.text(), toValueType);
    }

    public String getDetails() {
        StringBuilder details = new StringBuilder()
            .append("Status: ")
            .append(response.status())
            .append(' ')
            .append(response.statusText())
            .append("\nHeaders:\n");
        response.headers().forEach((name, value) ->
            details.append(name).append(": ").append(value).append('\n')
        );
        return details.append("\nBody:\n").append(response.text()).toString();
    }
}
