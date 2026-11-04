package io.materialspace.salesanalytics.ui.component;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.options.WaitForSelectorState;
import io.materialspace.framework.ui.control.Table;
import io.materialspace.framework.ui.pagefactory.FindBy;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Accessors(fluent = true)
@FindBy("//section[h2='Sales Transactions']")
public class TransactionsGrid {
    private final Locator root;
    @FindBy("#status")
    private Locator statusBar;
    @Getter
    @FindBy("table[aria-label='Sales transactions']")
    private Table salesTable;

    public TransactionsGrid(Locator root) {
        this.root = root;
    }

    public TransactionsGrid waitForLoaded() {
        root.waitFor();
        Locator loadingStatus = loadingStatus();
        loadingStatus.waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.VISIBLE));
        loadingStatus.waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
        return this;
    }

    public void waitForLoadingStatusHidden() {
        loadingStatus().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }

    private Locator loadingStatus() {
        return statusBar.filter(new Locator.FilterOptions().setHasText("Loading transactions…"));
    }

    public List<String> getDataForColumn(Column name) {
        return salesTable.getColumnData(name.displayName());
    }

    @AllArgsConstructor
    @Getter
    public enum Column {
        DATE("Date"),
        REGION("Region"),
        CATEGORY("Category"),
        REVENUE("Revenue (USD)"),
        ORDER_ID("Order ID");

        private final String displayName;
    }
}
