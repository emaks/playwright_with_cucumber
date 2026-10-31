package io.materialspace.definitions.be;

import io.cucumber.picocontainer.CucumberPicoProvider;
import io.materialspace.be.lib.ApiClient;
import io.materialspace.be.lib.clients.AllureApiClient;
import io.materialspace.be.lib.clients.PlaywrightApiClient;
import io.materialspace.fe.lib.PlaywrightSession;
import org.picocontainer.injectors.Provider;

@CucumberPicoProvider
public class ApiClientProvider implements Provider {
    public ApiClient provide(PlaywrightSession playwrightSession) {
        return new AllureApiClient(
            new PlaywrightApiClient(playwrightSession.getNewAPIContext())
        );
    }
}
