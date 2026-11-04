package io.materialspace.salesanalytics.ui.component;

import com.microsoft.playwright.Locator;
import io.materialspace.framework.ui.control.Button;
import io.materialspace.framework.ui.control.Dropdown;
import io.materialspace.framework.ui.pagefactory.FindBy;
import io.materialspace.salesanalytics.api.TransactionFilter;
import lombok.Getter;
import lombok.experimental.Accessors;

@Accessors(fluent = true)
@FindBy("//section[h2='Filters']")
public class Filters {
    private final Locator root;
    @Getter
    @FindBy("#dateRange")
    private Dropdown dateRangeDropdown;
    @Getter
    @FindBy("#region")
    private Dropdown regionDropdown;
    @Getter
    @FindBy("#category")
    private Dropdown categoryDropdown;
    @Getter
    @FindBy("#sort")
    private Dropdown sortByDropdown;
    @Getter
    @FindBy("#apply")
    private Button applyButton;
    @Getter
    @FindBy("#clear")
    private Button clearButton;

    public Filters(Locator root) {
        this.root = root;
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
