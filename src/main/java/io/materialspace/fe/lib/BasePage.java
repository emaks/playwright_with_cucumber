package io.materialspace.fe.lib;

import io.materialspace.lib.utils.PropertyLoader;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public abstract class BasePage {
    protected final PageWrapper page;

    public void open(String path) {
        page.navigate(PropertyLoader.get("ui.base.url") + path);
        waitForLoaded();
    }

    protected abstract void waitForLoaded();

    public String url() {
        return page.url();
    }
}
