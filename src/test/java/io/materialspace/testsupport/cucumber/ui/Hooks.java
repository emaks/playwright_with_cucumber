package io.materialspace.testsupport.cucumber.ui;

import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.Scenario;
import io.materialspace.framework.config.PropertyLoader;
import io.materialspace.framework.lifecycle.Cleanup;
import io.materialspace.framework.playwright.PlaywrightSession;
import io.materialspace.framework.ui.PageWrapper;

public class Hooks {
    private final PlaywrightSession playwrightSession;
    private final PageWrapper page;

    public Hooks(PlaywrightSession playwrightSession, PageWrapper page) {
        this.playwrightSession = playwrightSession;
        this.page = page;
    }

    @Before(value = "@ui")
    public void beforeUI() {
        page.initialize(playwrightSession.getNewPage(PropertyLoader.get("browser")));
    }

    @After(value = "@ui")
    public void tearDown(Scenario scenario) {
        Cleanup.run(
            () -> {
                if (scenario.isFailed() && page.isAvailable()) {
                    scenario.attach(page.screenshot(), "image/png", "Failure screenshot");
                }
            },
            playwrightSession::closeSession
        );
    }
}
