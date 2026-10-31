package io.materialspace.fe.lib.control;

import com.microsoft.playwright.Locator;

public class Button {
    private final Locator root;

    public Button(Locator root) {
        this.root = root;
    }

    public void click() {
        root.click();
    }
}
