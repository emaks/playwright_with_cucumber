package io.materialspace.framework.ui;

import io.materialspace.framework.config.PropertyLoader;
import io.materialspace.framework.ui.pagefactory.PageFactory;

public abstract class BasePage {
    protected final PageWrapper page;

    protected BasePage(PageWrapper page) {
        this.page = page;
        PageFactory.initElements(this, page);
    }

    public void open(String path) {
        page.navigate(PropertyLoader.get("ui.base.url") + path);
        waitForLoaded();
    }

    protected abstract void waitForLoaded();

    public String url() {
        return page.url();
    }
}
