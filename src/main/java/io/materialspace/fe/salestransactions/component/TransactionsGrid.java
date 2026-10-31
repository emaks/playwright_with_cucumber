package io.materialspace.fe.salestransactions.component;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.options.WaitForSelectorState;
import io.materialspace.fe.lib.control.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.util.List;

@Accessors(fluent = true)
public class TransactionsGrid {
    private final static String STATUS_LOCATOR = "#status";
    private final Locator root;
    @Getter
    private final Table salesTable;

    public TransactionsGrid(Locator root) {
        this.root = root;
        salesTable = new Table(root.locator("table[aria-label='Sales transactions']"));
    }

    public TransactionsGrid waitForLoaded() {
        root.waitFor();
        Locator loadingStatus = loadingStatus();
        loadingStatus.waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.VISIBLE));
        loadingStatus.waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
        return this;
    }

    public void waitForStatusHidden() {
        loadingStatus().waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN));
    }

    private Locator loadingStatus() {
        return root.locator(STATUS_LOCATOR)
            .filter(new Locator.FilterOptions().setHasText("Loading transactions…"));
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
