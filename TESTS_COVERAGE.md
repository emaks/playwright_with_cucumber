# Sales Analytics Test Cases

**Priority:** P0 — critical; P1 — core functionality; P2 — reliability and error handling; P3 —
additional checks.

## Backend / API

| ID    | Priority | Test                                                                                                                                                                                                                                                                                                                                                                             |
|-------|---------:|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| BE-01 |       P0 | **Defaults and optional parameters.** Compare a request with no parameters to one with the explicit defaults (`none` and `date_asc`). Also leave out each parameter in turn and check that it behaves like its default. With no filters, expect all 10 records in date-ascending order, with `meta.total=10` and `meta.returned=10`. Confirm the expected `meta.filters` format. |
| BE-05 |       P0 | **Combined filters and sorting.** Request `dateRange=90&region=Europe&category=Furniture&sort=rev_asc`. Expect only `#1001` and `#1010`, in ascending revenue order. Then request `dateRange=7&region=Asia&category=Furniture`; expect HTTP 200 and an empty `data` array.                                                                                                       |
| BE-02 |       P1 | **One example of each filter.** Check `dateRange=7` (1 record), `region=Europe` (4 records), and `category=Furniture` (4 records). Every returned record must match the filter. Other allowed values are covered by the pairwise set.                                                                                                                                            |
| BE-03 |       P1 | **Sorting.** Check the default `date_asc` order and `rev_desc` on the full dataset. An omitted `sort` should use `date_asc`; `rev_desc` should put the highest revenue first. The pairwise set covers the other sort options.                                                                                                                                                    |
| BE-04 |       P1 | **Date range boundaries.** Check the shortest range (`7`) and longest (`90`). For 7 days, include `#1010` and exclude `#1009`; for 90 days, include all records. Use a unit test with controlled dates to check the exact lower boundary. The 30-day range is covered by the pairwise set.                                                                                       |
| BE-06 |       P1 | **Pairwise combinations.** Run the 16 combinations in the matrix below. Check that returned records match the filters, the sort order is correct, and `meta.returned` equals the number of records. A combination with no matches should return an empty array, not an error.                                                                                                    |
| BE-07 |       P1 | **Invalid filter values.** Try `dateRange=abc`, `0`, `-1`, `6`, `8`, `89`, and `91`, plus `region=Atlantis`, `category=Other`, and `sort=price_asc`. Expect a consistent validation error (HTTP 400 recommended). Empty values should follow a documented rule.                                                                                                                  |
| BE-09 |       P1 | **Requests don’t affect each other.** Send requests in this order: no filters, Europe, Europe + Furniture, then no filters again. Each response should reflect only its own request. Check the HTTP status, JSON content type, record fields and types, metadata, and `Cache-Control: no-store`.                                                                                 |
| BE-08 |       P2 | **Unexpected requests and parameters.** Try a repeated parameter (`region=Europe&region=Asia`), an unknown parameter, malformed URL-encoded values, a non-GET method, and an unknown path. The server should not crash or expose stack traces or data. Define how repeated and unknown parameters should be handled.                                                             |
| BE-10 |       P3 | **Response delay.** Check that a valid request takes about 250 ms, allowing enough tolerance to avoid flaky results.                                                                                                                                                                                                                                                             |

## UI

| ID    | Priority | Test                                                                                                                                                                                                                                                                                      |
|-------|---------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| UI-01 |       P0 | **Initial page.** Open the app and wait for it to load. Expect all 10 records in date-ascending order, default control values, and no error or empty-state message.                                                                                                                       |
| UI-04 |       P0 | **Filters, sorting, and no results.** Select Europe, Furniture, and Revenue Low → High. Expect only `#1001` (1200) followed by `#1010` (1680). Then select Last 7 days, Asia, and Furniture; expect **No data available** and a count of 0.                                               |
| UI-05 |       P0 | **Apply filters.** Select values and click Apply. Check that the app sends `GET /api/transactions` with those values and updates the table from the response. Check URL encoding.                                                                                                         |
| UI-06 |       P0 | **Keep sorting when clearing filters.** Choose a sort order, apply a filter, then change the filter and apply again. The sort order should stay selected. Click Clear: filters reset, sorting stays the same, and all records return in that order. Reapplying should not duplicate rows. |
| UI-02 |       P1 | **Use filters independently.** Try Last 7 days, Europe, and Furniture one at a time. Each time, the table should show only matching records.                                                                                                                                              |
| UI-03 |       P1 | **Sort the table.** Check the default date order and Revenue High → Low on the full dataset. Verify the order of every row and confirm revenues are sorted numerically.                                                                                                                   |
| UI-07 |       P1 | **Loading, results, and recovery.** Check that Loading appears while the request is in progress and disappears when it completes. Apply a filter with no results, then click Clear; the table, count, and empty state should update without leftover rows.                                |
| UI-08 |       P1 | **Request errors.** Simulate HTTP 500, a network failure, a timeout, and malformed JSON. The app should show an error without hanging or presenting it as a successful empty result. Check that Apply works after recovery.                                                               |
| UI-09 |       P2 | **Out-of-order responses.** Send two Apply requests with different filters and delay the first response so it arrives last. The page should show results for the latest selection.                                                                                                        |
| UI-10 |       P2 | **Render API values as text.** Return HTML/JS in a mocked API response. It should appear as text; scripts must not run or change the page DOM.                                                                                                                                            |

## Backend Pairwise Matrix

Values used: `dateRange` — none/7/30/90; `region` — none/Europe/North America/Asia; `category` —
none/Furniture/Appliances/Lighting; `sort` — date_asc/date_desc/rev_asc/rev_desc.

|  # | dateRange | region        | category   | sort      |
|---:|-----------|---------------|------------|-----------|
|  1 | none      | none          | none       | date_asc  |
|  2 | none      | Europe        | Furniture  | rev_asc   |
|  3 | none      | North America | Appliances | rev_desc  |
|  4 | none      | Asia          | Lighting   | date_desc |
|  5 | 7         | none          | Furniture  | date_desc |
|  6 | 7         | Europe        | none       | rev_desc  |
|  7 | 7         | North America | Lighting   | rev_asc   |
|  8 | 7         | Asia          | Appliances | date_asc  |
|  9 | 30        | none          | Appliances | rev_asc   |
| 10 | 30        | Europe        | Lighting   | date_asc  |
| 11 | 30        | North America | none       | date_desc |
| 12 | 30        | Asia          | Furniture  | rev_desc  |
| 13 | 90        | none          | Lighting   | rev_desc  |
| 14 | 90        | Europe        | Appliances | rev_asc   |
| 15 | 90        | North America | Furniture  | date_asc  |
| 16 | 90        | Asia          | none       | date_desc |

## Run order

1. **P0:** BE-01, BE-05; UI-01, UI-04, UI-05, UI-06.
2. **P1:** Remaining functional checks and the backend pairwise set.
3. **P2:** Invalid requests, out-of-order responses, and safe rendering.
4. **P3:** Response-delay check.
