package io.materialspace.definitions.be;

import io.cucumber.java.After;
import io.materialspace.be.lib.ApiClient;
import io.materialspace.fe.lib.PlaywrightSession;
import io.materialspace.lib.utils.Cleanup;

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
