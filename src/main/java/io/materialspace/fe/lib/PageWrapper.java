package io.materialspace.fe.lib;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Response;

import java.util.function.Predicate;

public class PageWrapper {
    private Page page;

    public void initialize(Page page) {
        this.page = page;
    }

    public void navigate(String url) {
        requirePage().navigate(url);
    }

    public String url() {
        return requirePage().url();
    }

    public Locator locator(String locator) {
        return requirePage().locator(locator);
    }

    public Response waitForResponse(Predicate<Response> predicate, Runnable action) {
        return requirePage().waitForResponse(predicate, action);
    }

    public byte[] screenshot() {
        return requirePage().screenshot();
    }

    public boolean isAvailable() {
        return page != null && !page.isClosed();
    }

    private Page requirePage() {
        if (page == null) {
            throw new IllegalStateException("Playwright page has not been initialized");
        }
        return page;
    }
}
