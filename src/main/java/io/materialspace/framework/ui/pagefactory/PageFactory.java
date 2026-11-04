package io.materialspace.framework.ui.pagefactory;

import com.microsoft.playwright.Locator;
import io.materialspace.framework.ui.PageWrapper;

public final class PageFactory {
    private PageFactory() {
    }

    public static void initElements(Object pageObject, Locator rootLocator) {
        PageObjectInitializer.initElements(pageObject, rootLocator);
    }

    public static void initElements(Object pageObject, PageWrapper rootPage) {
        PageObjectInitializer.initElements(pageObject, rootPage);
    }
}
