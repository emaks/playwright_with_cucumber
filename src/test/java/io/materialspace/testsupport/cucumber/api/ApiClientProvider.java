package io.materialspace.testsupport.cucumber.api;

import io.cucumber.picocontainer.CucumberPicoProvider;
import io.materialspace.framework.api.ApiClient;
import io.materialspace.framework.api.clients.PlaywrightApiClient;
import io.materialspace.framework.playwright.PlaywrightSession;
import io.materialspace.framework.reporting.allure.AllureApiClient;
import org.picocontainer.injectors.Provider;

@CucumberPicoProvider
public class ApiClientProvider implements Provider {
    public ApiClient provide(PlaywrightSession playwrightSession) {
        return new AllureApiClient(
            new PlaywrightApiClient(playwrightSession.getNewAPIContext())
        );
    }
}
