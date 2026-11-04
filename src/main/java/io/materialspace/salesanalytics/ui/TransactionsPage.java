package io.materialspace.salesanalytics.ui;

import com.microsoft.playwright.Response;
import io.materialspace.framework.ui.BasePage;
import io.materialspace.framework.ui.PageWrapper;
import io.materialspace.salesanalytics.ui.component.Filters;
import io.materialspace.salesanalytics.ui.component.TransactionsGrid;
import lombok.Getter;
import lombok.experimental.Accessors;

import java.net.URI;

@Getter
@Accessors(fluent = true)
public class TransactionsPage extends BasePage {
    private final Filters filtersComponent;
    private final TransactionsGrid transactionsGridComponent;

    public TransactionsPage(PageWrapper page) {
        super(page);
        this.filtersComponent = new Filters(page.locator("//section[h2='Filters']"));
        this.transactionsGridComponent = new TransactionsGrid(
            page.locator("//section[h2='Sales Transactions']")
        );
    }

    public void open() {
        super.open("/");
    }

    public void waitForGridReload(Runnable triggerReload) {
        Response response = page.waitForResponse(
            candidate -> "/api/transactions".equals(URI.create(candidate.url()).getPath())
                && "GET".equals(candidate.request().method()),
            triggerReload
        );
        if (!response.ok()) {
            throw new IllegalStateException(
                "GET /api/transactions failed with HTTP " + response.status()
            );
        }
        transactionsGridComponent.waitForLoadingStatusHidden();
    }

    @Override
    protected void waitForLoaded() {
        filtersComponent.waitForLoaded();
        transactionsGridComponent.waitForLoaded();
    }
}
