package io.materialspace.framework.ui.control;

import com.microsoft.playwright.Locator;

import java.util.List;

public class Table {
    private final Locator root;

    public Table(Locator root) {
        this.root = root;
    }

    public List<String> getColumnData(String columnName) {
        List<String> headers = getHeaders();
        int columnIndex = headers.indexOf(columnName);
        if (columnIndex < 0) {
            throw new IllegalArgumentException("Column not found in table: " + columnName);
        }

        return root.locator("tbody tr td:nth-child(" + (columnIndex + 1) + ")")
            .allInnerTexts()
            .stream()
            .map(String::trim)
            .toList();
    }

    private List<String> getHeaders() {
        return root.locator("thead th").allInnerTexts();
    }
}
