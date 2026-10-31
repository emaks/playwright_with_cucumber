package io.materialspace.fe.lib;

import com.microsoft.playwright.APIRequest;
import com.microsoft.playwright.APIRequestContext;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import io.materialspace.lib.utils.PropertyLoader;
import lombok.extern.slf4j.Slf4j;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
public class PlaywrightSession {
    private final static boolean IS_HEADLESS = Boolean.parseBoolean(PropertyLoader.get("headless"));
    private final static double TIMEOUT = 60000;
    private final Playwright playwright = Playwright.create();
    private Browser browser;
    private BrowserContext browserContext;

    public Page getNewPage(String browser) {
        try {
            log.info("creating new {} browser, headless={}", browser, IS_HEADLESS);
            BrowserType type = getBrowserType(browser);
            initBrowserContext(type);
            return browserContext.newPage();
        } catch (Exception e) {
            log.error("Error creating new {} browser", browser);
            throw e;
        }
    }

    public APIRequestContext getNewAPIContext() {
        String baseUrl = PropertyLoader.get("api.base.url");
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        return playwright.request().newContext(
            new APIRequest.NewContextOptions().setBaseURL(baseUrl)
        );
    }

    private BrowserType getBrowserType(String browserType) {
        return switch (browserType) {
            case "chromium" -> playwright.chromium();
            case "firefox" -> playwright.firefox();
            default -> throw new IllegalArgumentException("browser not supported");
        };
    }

    private void initBrowserContext(BrowserType type) {
        browser = type.launch(new BrowserType.LaunchOptions().setHeadless(IS_HEADLESS));
        browserContext = browser.newContext(
            new Browser.NewContextOptions()
                .setViewportSize(1790, 1120)
                .setRecordHarPath(getHarRecordingPath())
        );
        browserContext.setDefaultTimeout(TIMEOUT);
    }

    private Path getHarRecordingPath() {
        String date = DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmmss").format(LocalDateTime.now());
        return Path.of(String.format("target/har-recordings/%s-%s-har-recording.har", date, UUID.randomUUID()));
    }

    public void closeSession() {
        RuntimeException failure = null;
        Runnable[] cleanup = {
            () -> {
                if (browserContext != null) {
                    browserContext.close();
                }
            },
            () -> {
                if (browser != null) {
                    browser.close();
                }
            },
            playwright::close
        };
        for (Runnable close : cleanup) {
            try {
                close.run();
            } catch (RuntimeException exception) {
                if (failure == null) {
                    failure = exception;
                } else if (failure != exception) {
                    failure.addSuppressed(exception);
                }
            }
        }
        if (failure != null) {
            log.error("Error closing Playwright session", failure);
            throw failure;
        }
    }
}
