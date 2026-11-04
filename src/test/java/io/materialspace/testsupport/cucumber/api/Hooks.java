package io.materialspace.testsupport.cucumber.api;

import io.cucumber.java.After;
import io.materialspace.framework.api.ApiClient;
import io.materialspace.framework.lifecycle.Cleanup;
import io.materialspace.framework.playwright.PlaywrightSession;

public class Hooks {
    private final ApiClient apiClient;
    private final PlaywrightSession playwrightSession;

    public Hooks(ApiClient apiClient, PlaywrightSession playwrightSession) {
        this.apiClient = apiClient;
        this.playwrightSession = playwrightSession;
    }

    @After(value = "@api")
    public void tearDown() {
        Cleanup.run(apiClient::close, playwrightSession::closeSession);
    }
}
