# Architecture roadmap

Items 1 and 2 describe existing or partially implemented architecture, and item 9 is
implemented. The remaining items are possible next steps for a real project, not requirements
for this demo.

1. **Keep framework code separate from application code (implemented).**

   Reusable Playwright sessions, controls, HTTP clients, reporting, and cleanup now live under
   `framework`. Sales Analytics pages, services, and models live under `salesanalytics`.
   Framework code must not import application or test classes; Dependency Cruiser
   (`npm run architecture`) checks this boundary.

   Current top-level packages:

   ```text
   framework/            # Reusable test infrastructure
   salesanalytics/       # Application-specific API and UI code
   testsupport/          # Shared Cucumber glue and scenario context
   ```

   These boundaries make it possible to reuse framework code without copying Sales Analytics
   classes.

2. **Wire dependencies in providers (partially implemented).**

   The API provider currently composes `PlaywrightApiClient` with the `AllureApiClient`
   decorator. Services receive the resulting `ApiClient` through constructor injection; they
   do not create HTTP clients, use a global registry, or call Allure. The scenario-scoped
   Cucumber `World` constructs `TransactionsService` and Page Objects through explicit
   constructors, so there is no separate provider for every class.

   What's left is to add explicit providers when an application-specific dependency needs
   configuration or a distinct lifetime—for example, role-specific API clients, authenticated
   browser contexts, or an alternate transport. Keep resource ownership and cleanup clear.
   Do not add providers just to wrap classes the `World` can construct directly. The
   criteria for a new provider are in the [contributor guide](framework-contributor-guide.md#adding-a-provider).

3. **Extract the framework into a separate npm package (Medium).**

   Framework and Sales Analytics code currently have separate directories but share one npm
   package. If another application needs the framework, move the reusable code into its own
   package (for example an npm workspace such as `packages/framework`) with an explicit
   `exports` map, and keep application defaults and Cucumber glue in the consuming test
   project.
   This would make the dependency boundary visible to npm as well as Dependency Cruiser. Until there
   is another consumer, the package split is enough.

4. **Use a response model that does not depend on Playwright (Medium).**

   `framework/api/ApiClient` hides the HTTP client, but `framework/api/ApiResponse` directly
   wraps Playwright's `APIResponse` ([source](../src/framework/api/ApiResponse.ts#L1-L5)).
   That means a different transport would still affect the framework API.
   If we need to replace Playwright or test services without HTTP calls, return our own
   response containing the status, headers, and body.

   For example:

   ```ts
   interface HttpResponse {
     readonly status: number;
     readonly headers: Readonly<Record<string, readonly string[]>>;
     readonly body: string;
   }
   ```

   Copy the headers and their value lists (Playwright's `headersArray()` keeps repeated
   headers) so callers cannot change them. The HTTP client reads the response, copies its
   data, and releases the original body with `APIResponse.dispose()`. Services and
   reporting use the copy, which can also be supplied directly in tests.

   This works for small JSON responses. Streams and large files need a different approach
   with explicit closing, rather than reading everything into memory. Make this change
   when it solves a real need, not just to add another interface.

5. **Keep test-runner dependencies out of application code (Low).**

   Dependency Cruiser currently prevents dependencies on the `testsupport` package, but it does
   not prevent production code from importing `@cucumber/cucumber`, `node:assert`, or
   `node:test` directly ([current rules](../.dependency-cruiser.cjs)).
   Add rules for `salesanalytics/api` and `salesanalytics/ui` that reject test-runner
   dependencies, while allowing framework integrations such as Allure and Playwright where
   they belong. The current checks cover only this functional module; add each future
   application module to the boundary rules as it is introduced. This would make the
   intended boundary harder to bypass accidentally.

6. **Handle authentication and user roles in providers.**

   Keep tokens and browser login state out of services and pages. Set them up in providers
   so each scenario does not need its own login or token-refresh code.

   The demo application currently has no authentication; this item applies once it does.
   A provider could create an API client for `Role.ANALYST` or a fresh browser context with
   that user's Playwright `storageState`. Most tests could skip UI login; login tests would still
   go through the real flow.

   Keep sessions isolated so different roles can run in parallel. Decide how to refresh
   expired tokens, allocate test users, and clean up saved login state. Never commit
   credentials, tokens, or storage state, or expose them in report attachments.
   The details will depend on how the application handles authentication and permissions.

7. **Manage test data outside test steps.**

   The demo API is currently read-only (`GET /api/transactions`), so this item applies once
   the application exposes a way to create or reset data.
   Add fixtures or API helpers that create data and track what needs to be deleted.
   Use builders where input models are complex enough to justify them.

   For example, create a Europe/Furniture transaction through the API, check it in the UI,
   then delete only the records created by that scenario. If deletion is not available,
   use an agreed alternative, such as a separate test tenant, an environment reset,
   or data that expires.

   Tests would no longer rely on shared records that someone else might change. Use unique
   identifiers for parallel runs, assign cleanup to a clear owner, and report cleanup errors.
   Do not bypass the action being tested: a UI creation test must still create its record
   through the UI.

8. **Give pages and components a clear API.**

   Let tests work with page operations instead of individual controls, unless they need
   to check a control directly. Today `Filters` exposes `select(TransactionFilter, value)`,
   but the UI steps still click `filtersComponent.applyButton` / `clearButton` directly.

   For example, wrap button access in component methods:

   ```ts
   await filters.select(TransactionFilter.REGION, "Europe");
   await filters.select(TransactionFilter.CATEGORY, "Furniture");
   await filters.apply();
   ```

   Add `applyFilters(criteria)` if several scenarios repeat this sequence. Keep the smaller
   methods for tests that check intermediate states; do not force every interaction into
   one large method.

   Layout changes would then affect fewer test operations. Pages should handle interactions,
   waits, and reading values; business assertions belong in tests. Add a workflow layer
   only when tests repeat the same process across several pages.

9. **Declare UI elements with decorators (implemented).**

   The project-owned `@FindBy` decorator and `PageFactory` initialize page components and typed
   controls from parent-scoped Playwright locators. Field selectors override class-level
   selectors; annotated raw `Locator` leaves and async `LocatorList<T>` collections are
   supported. The UI provider calls `PageFactory.initElements` after the Page Object
   constructor; the Cucumber `World` continues to own scenario dependencies. Decorated
   fields must not be `readonly` and must have no field initializer. See the [contributor guide](framework-contributor-guide.md) for the
   supported types and initialization rules.

10. **Make browser reuse configurable.**

   Separate the lifetime of the browser from the lifetime of a scenario. Allow a browser to
   stay open between tests instead of launching a new one every time. Keep the current
   per-scenario mode available for tests that need a fresh browser process.

   For example, a future `BROWSER_LIFECYCLE=scenario|worker` setting could choose between a
   new browser for each scenario and one browser reused by a worker. In worker mode, each
   scenario would still get a fresh `BrowserContext` and `Page`, keeping cookies, local
   storage, and other context state separate. Reusing the browser should not mean sharing a
   logged-in context or making tests depend on their execution order.

   Cucumber.js parallel workers are separate processes, and `BeforeAll`/`AfterAll` hooks run
   once per worker. A worker-level owner would launch the browser in `BeforeAll` and close it
   in `AfterAll`; scenario hooks would keep closing each context so its HAR file is saved.
   A disconnected browser should be reported and replaced before the next scenario, not
   silently retried mid-test. This would reduce browser startup overhead without giving up
   scenario isolation.

   Prerequisite (currently an accepted constraint):
   [`PlaywrightSession`](../src/framework/playwright/PlaywrightSession.ts#L20-L60) reads
   `headless` through static `PropertyLoader` configuration and keeps one
   `Browser`/`BrowserContext` pair; `getNewPage()` overwrites those fields. This is safe with
   the current one-page-per-scenario hooks, but repeated calls on one session could leave the
   earlier pair unclosed. Before reusing a browser, make configuration instance-scoped and give
   the browser and each scenario's context/page separate owners.

11. **Compare objects instead of checking fields one by one.**

   Update API assertions to compare transaction objects (for example with
   `assert.deepStrictEqual`) instead of using nested loops and a switch over field names. For UI checks, add a method that reads
   the grid as a list of typed rows, such as `TransactionRow`, then compare those objects
   rather than reading each column separately and checking it with `every()`.
   Keep expected data separate from assertions. Object comparisons should show which
   fields differ, with actual and expected values, rather than just a boolean failure.

   The current filter scenarios only specify region/category, not every transaction field.
   For these checks, compare objects using an explicit list of relevant fields:

   ```ts
   const pick = ({ region, category }: Transaction) => ({ region, category });
   assert.deepStrictEqual(pick(actualTransaction), pick(expectedTransaction));
   ```

   `revenue` is a `Decimal`; compare it with `.equals()` or a normalized `toString()` rather
   than relying on object identity or JavaScript `number` conversion.

   Choose the fields from the scenario's expectations; a region-only scenario should not
   also assert category. This is a partial object comparison, not a check of the whole
   transaction.

   For full object comparisons, prepare controlled test records and an independently
   defined expected list, including IDs, dates, and revenue. Compare all fields and list
   contents, checking order only when the scenario requires it. Do not build expected
   values from the actual response or grid, or hide unknown fields with broad ignore rules.
   Keep the non-empty result checks so an empty response or grid cannot pass a filter test.

12. **Catch missing `await` with type-aware linting (High).**

   Almost every UI and API operation is asynchronous. A forgotten `await` lets a step finish
   before its action or assertion runs, which produces flaky or falsely passing scenarios.
   The current ESLint setup uses `typescript-eslint`'s non-type-aware `recommended` rules, so
   it does not report this.

   Enable type-aware linting (`parserOptions.projectService`) and at least
   `@typescript-eslint/no-floating-promises`, `no-misused-promises`, and `await-thenable`.
   Fix any reported calls rather than suppressing them.

13. **Use auto-retrying (web-first) UI assertions (Medium).**

   UI checks currently read grid values once and compare them with `node:assert`. They rely on
   the page's response/loading-state synchronization; if that synchronization misses a
   re-render, the assertion sees stale values and fails or passes too early.

   Playwright's `expect(locator)` matchers (`toHaveText`, `toHaveCount`, and similar) retry
   until the condition holds or the timeout expires. Adopting them would mean adding
   `@playwright/test` for its `expect`, verifying that it works under Cucumber.js outside the
   Playwright Test runner, and keeping its timeout aligned with the 10,000 ms UI timeout.
   Keep business assertions in steps and keep the non-empty result checks.

14. **Shorthand `@FindBy(Component)` for component fields (Low).**

   A component field whose class already declares a class-level selector currently needs
   `@FindBy({ type: Filters })`. TypeScript does not keep field types at runtime, so the field
   decorator must still name the class, but the options object can be optional:

   ```ts
   @FindBy(Filters)
   filtersComponent!: Filters;
   ```

   Add an overload to `src/framework/ui/pagefactory/FindBy.ts` that accepts an
   `ElementConstructor` and normalizes it to `{ type: Component }`. Keep the
   `Locator`-constructor type check, the existing object form for field-level selectors,
   `locator: true`, and `listItem`, and the fail-fast error when the class has no selector.
   The class-level form stays `@FindBy({ selector })`; a class cannot reference itself in
   its own decorator, so `type` is not valid there.

   Cover the overload in the PageFactory unit tests (shorthand, missing class selector,
   non-`Locator` constructor rejected at compile time), then update the contributor guide's
   PageFactory section and the README example.
