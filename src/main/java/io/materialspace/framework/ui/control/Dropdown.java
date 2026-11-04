package io.materialspace.framework.ui.control;

import com.microsoft.playwright.Locator;

public class Dropdown {
    private final Locator root;

    public Dropdown(Locator root) {
        this.root = root;
    }

    public void select(String value) {
        root.selectOption(value);
    }
}
