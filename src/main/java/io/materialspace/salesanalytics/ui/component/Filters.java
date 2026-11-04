package io.materialspace.salesanalytics.ui.component;

import com.microsoft.playwright.Locator;
import io.materialspace.framework.ui.control.Button;
import io.materialspace.framework.ui.control.Dropdown;
import io.materialspace.salesanalytics.api.TransactionFilter;
import lombok.Getter;
import lombok.experimental.Accessors;

@Accessors(fluent = true)
public class Filters {
    private final Locator root;
    @Getter
    private final Dropdown dateRangeDropdown;
    @Getter
    private final Dropdown regionDropdown;
    @Getter
    private final Dropdown categoryDropdown;
    @Getter
    private final Dropdown sortByDropdown;
    @Getter
    private final Button applyButton;
    @Getter
    private final Button clearButton;

    public Filters(Locator root) {
        this.root = root;
        this.dateRangeDropdown = new Dropdown(root.locator("#dateRange"));
        this.regionDropdown = new Dropdown(root.locator("#region"));
        this.categoryDropdown = new Dropdown(root.locator("#category"));
        this.sortByDropdown = new Dropdown(root.locator("#sort"));
        this.applyButton = new Button(root.locator("#apply"));
        this.clearButton = new Button(root.locator("#clear"));
    }

    public Filters waitForLoaded() {
        root.waitFor();
        return this;
    }

    public void select(TransactionFilter name, String value) {
        switch (name) {
            case DATE_RANGE -> dateRangeDropdown.select(value);
            case REGION -> regionDropdown.select(value);
            case CATEGORY -> categoryDropdown.select(value);
            case SORT -> sortByDropdown.select(value);
            default -> throw new IllegalArgumentException("Unknown filter name: " + name);
        }
    }
}
