# Sales Analytics – Requirements

## Task

Design a set of UI and API test scenarios for the Sales Analytics filtering and sorting
functionality. Use the running application and inspect the API requests in your browser's Network
panel.

## Functional requirements

1. All three filters are optional.
2. Each filter can be used independently.
3. Any combination of filters can be applied simultaneously.
4. When multiple filters are selected, a transaction must satisfy all selected filters.
5. If no filters are selected, all transactions are shown.
6. If the selected combination produces no results, a **No data available** message is displayed.
7. Default sorting is **Date: Oldest → Newest**.
8. Sorting is applied to the data remaining after filtering.
9. Changing filters must preserve the currently selected sorting.
10. **Clear** removes all filters but does not reset sorting.
11. **Apply** updates the table using the currently selected filters and sorting.

## Available values

| Field      | Values                                                                                           |
|------------|--------------------------------------------------------------------------------------------------|
| Date range | Not selected; Last 7 days; Last 30 days; Last 90 days                                            |
| Region     | Not selected; Europe; North America; Asia                                                        |
| Category   | Not selected; Furniture; Appliances; Lighting                                                    |
| Sort by    | Date: Oldest → Newest (default); Date: Newest → Oldest; Revenue: Low → High; Revenue: High → Low |

## API

The table loads data from `GET /api/transactions`. Its optional query parameters correspond to the
controls above: `dateRange`, `region`, `category`, and `sort`.

See `README.md` for instructions to run the task locally.
