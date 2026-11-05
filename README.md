# Sales Analytics test automation

TypeScript, Playwright, Cucumber.js, and Allure tests for the Sales Analytics demo. The
Node.js application under test is included in [`sales-analytics-qa-task/`](sales-analytics-qa-task/).
The `salesanalytics` package represents a functional module of the application under
test, not a separate application.

The current scenarios cover region/category filtering: API tests check the HTTP status and
returned values; UI tests apply single or combined filters and check the grid.
[`TESTS_COVERAGE.md`](TESTS_COVERAGE.md) describes planned coverage, with P0–P3 priorities, a
backend pairwise matrix, and a suggested implementation order. It is a test plan, not a list
of completed automated tests.

The framework was migrated from Java/Maven without changing its architecture or
behavior; [`migration_ts.md`](migration_ts.md) is the migration record and decision log.
The previous Java implementation remains available in git history.

## Requirements and setup

The package declares Node.js `^24.0.0 || >=26.0.0`; npm is required. Chromium and Firefox
browser binaries are installed only in this project directory (`.playwright-browsers/`).
Java 8+ is needed only when generating Allure reports with the bundled Allure command-line
wrapper; compiling and running the tests does not require Java or Maven.

From the repository root:

```bash
node --version
npm --version
npm ci
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium firefox
```

In another terminal, start the application:

```bash
cd sales-analytics-qa-task
npm start
```

Keep the application running while executing tests. Its default UI and API endpoints are
`http://localhost:3000` and `http://localhost:3000/api`.

## Build and tests

Run commands from the repository root:

```bash
npm run build                 # Clean generated output, then compile strict TypeScript
npm run typecheck             # Type-check without emitting
npm run lint                  # ESLint for src/ and tests/
npm run test:unit             # Unit tests, architecture boundaries, and PageFactory tests
npm run architecture          # Positive Dependency Cruiser boundary check
npm run test:acceptance       # Controlled parallel/retry/rerun/reporting acceptance tests
npm test                      # Lint, unit tests, then all five application scenarios
```

Cucumber profiles and common overrides:

```bash
npm run test:api
npm run test:ui
npm run test:firefox          # Firefox UI; see Troubleshooting
npm run test:parallel         # Full suite with two workers
npm run test:retry            # Full suite with one retry
npm run cucumber              # All features; default parallel=1 and retry=1
npm run test:ui -- --tags @ui # CLI options can override profile configuration
```

The API profile selects two API scenarios; the UI profile selects three UI scenarios.
The default profile selects all five. `PARALLEL`, `RETRY`, `BROWSER`, `HEADLESS`, `ENV`,
and `TAG` can be set as environment variables. Cucumber CLI `--parallel`, `--retry`,
and `--tags` options are also supported. The default browser is Chromium, default
headless mode is false, and default parallel/retry values are 1/1.

The test suite includes:

- `tests/framework/` for configuration, JSON/decimal conversion, cleanup, API behavior,
  application models/services, and PageFactory behavior.
- `tests/architecture/` for positive and deliberately invalid dependency-boundary checks.
- `tests/acceptance/` for controlled runtime scenarios that verify actual worker overlap,
  scenario isolation, retries, failed-only reruns, and report/attachment behavior. These
  fixtures do not modify the application feature files.

## Configuration mapping

`resources/configs/local.json` contains the checked-in endpoint configuration:

```json
{
  "ui.base.url": "http://localhost:3000",
  "api.base.url": "http://localhost:3000/api"
}
```

`ENV` selects `resources/configs/{env}.json`; a missing file is an error. Process
environment values override file values. Both Java-style keys and uppercase environment
names are accepted for endpoints (`ui.base.url` / `UI_BASE_URL` and `api.base.url` /
`API_BASE_URL`). Runtime settings map as follows:

| Java setting | TypeScript setting | Default |
|---|---|---|
| `env` | `ENV` | `local` |
| `ui.base.url` | `UI_BASE_URL` or `ui.base.url` | `http://localhost:3000` |
| `api.base.url` | `API_BASE_URL` or `api.base.url` | `http://localhost:3000/api` |
| `browser` | `BROWSER` | `chromium` |
| `headless` | `HEADLESS` | `false` |
| `threads` | `PARALLEL` (`THREADS` is also accepted by the loader) | `1` |
| retry | `RETRY` | `1` |
| tag expression | `TAG` | Profile default (`@api`, `@ui`, or all) |

The browser context uses a 1790 × 1120 viewport and a 10,000 ms UI timeout. API requests
use a 30,000 ms default timeout; `0` disables an individual request timeout. Decimal
values are parsed losslessly and represented with `decimal.js`, not rounded through
JavaScript `number`.

## Architecture

```text
features/
  ├── Cucumber definitions → application test steps
  │                            ├── TransactionsService → framework API client
  │                            └── TransactionsPage → components → controls → Playwright
  └── testsupport World → scenario-scoped context, providers, and lifecycle hooks

src/
  ├── framework/       # Reusable Playwright, API, UI, config, JSON, cleanup, logging, Allure
  ├── salesanalytics/  # Application-specific API, UI, definitions, and test steps
  └── testsupport/     # Cucumber World, scenario context, providers, hooks, adapters
```

`framework` may not depend on `salesanalytics`, `testsupport`, or test definitions.
Application API/UI packages may depend on `framework`, but not on `testsupport`.
`npm run architecture` checks the existing framework/application boundaries, and a
negative fixture proves that the rule rejects an illegal import.

The current scenario lifecycle remains per-scenario. API scenarios create an API request
context without launching a browser. UI scenarios create a browser page and HAR recording;
the browser context closes before the browser. Cleanup attempts all registered actions and
preserves the first and subsequent failures. Browser reuse and transport-independent API
responses are not part of this migration.

### Declarative UI elements

Use the standard TypeScript decorator API with explicit constructors and a
`Playwright Locator` parameter. Class-level selectors supply the default; a field-level
selector takes precedence. Because TypeScript does not retain ordinary field types at
runtime, each field declares its element type explicitly:

```ts
@FindBy({ selector: "#filters" })
class Filters {
  constructor(readonly root: Locator) {}
}

class TransactionsPage extends BasePage {
  @FindBy({ type: Filters })
  filtersComponent!: Filters;
}
```

`PageFactory.initElements(pageObject, root)` is called after the page/component constructor
has completed. Annotated fields support `{ type: Constructor }`, `{ locator: true }`, or
`{ listItem: Constructor }`. A constructor used as a component/list item must accept a
`Locator`. Typed collections use the async `LocatorList<T>` API (`count`, `isEmpty`,
`get`, and `snapshot`) rather than pretending to be synchronous JavaScript arrays.
Initialization creates locators only; it performs no DOM reads or actions.

## Cucumber, reports, and generated files

The Cucumber configuration is `cucumber.mjs`; named profiles are `api`, `ui`,
`acceptance`, and `rerun`, with the unnamed default selecting all application features.
External publishing is disabled. `World` is scenario-scoped and creates only the
resources needed by that scenario type.

All generated files stay under the repository root:

| Output | Location |
|---|---|
| Compiled JavaScript | `dist/` |
| Cucumber JSON and formatter log | `target/site/` |
| Allure results and attachments | `target/allure-results/` |
| Failed-scenario rerun input | `target/@rerun.txt` |
| HAR recordings | `target/har-recordings/` |
| Generated Allure report | `allure-report/` |
| Single-file Allure report | `allure-report-single/` |

API calls attach request details before transport, then resolved URL/response on success;
transport failures attach error details and are rethrown. Failed UI scenarios attach a
screenshot when a page is available. The Allure Environment metadata records the effective
environment, browser, headless mode, parallelism, retry count, and tag expression.

Generate and open reports after a test run:

```bash
npm run allure:generate
npm run allure:single
npm run allure:open
```

`npm run test:rerun` runs only locations in a non-empty `target/@rerun.txt`; it safely
skips when the file is absent or empty. Do not run `npm run build` between a failed suite
and the rerun command: build intentionally cleans generated `target/` output.

## Architecture and planned improvements

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
   criteria for a new provider are in the [contributor guide](docs/framework-contributor-guide.md#adding-a-provider).

3. **Extract the framework into a separate npm package (Medium).**

   Framework and Sales Analytics code currently have separate directories but share one npm
   package. If another application needs the framework, move the reusable code into its own
   module and keep application defaults and Cucumber glue in the consuming test project.
   This would make the dependency boundary visible to npm as well as Dependency Cruiser. Until there
   is another consumer, the package split is enough.

4. **Use a response model that does not depend on Playwright (Medium).**

   `framework/api/ApiClient` hides the HTTP client, but `framework/api/ApiResponse` directly
   wraps Playwright's `APIResponse` ([source](src/framework/api/ApiResponse.ts#L1-L5)).
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

   Copy the headers and their value lists so callers cannot change them. The HTTP client
   reads the response, copies its data, and closes the original resource. Services and
   reporting use the copy, which can also be supplied directly in tests.

   This works for small JSON responses. Streams and large files need a different approach
   with explicit closing, rather than reading everything into memory. Make this change
   when it solves a real need, not just to add another interface.

5. **Keep test-runner dependencies out of application code (Low).**

   Dependency Cruiser currently prevents dependencies on the `testsupport` package, but it does
   not prevent production code from importing Cucumber or `node:assert` directly
   ([current rules](.dependency-cruiser.cjs)).
   Add rules for `salesanalytics/api` and `salesanalytics/ui` that reject test-runner
   dependencies, while allowing framework integrations such as Allure and Playwright where
   they belong. The current checks cover only this functional module; add each future
   application module to the boundary rules as it is introduced. This would make the
   intended boundary harder to bypass accidentally.

6. **Handle authentication and user roles in providers.**

   Keep tokens and browser login state out of services and pages. Set them up in providers
   so each scenario does not need its own login or token-refresh code.

   A provider could create an API client for `Role.ANALYST` or a fresh browser context with
   that user's storage state. Most tests could skip UI login; login tests would still
   go through the real flow.

   Keep sessions isolated so different roles can run in parallel. Decide how to refresh
   expired tokens, allocate test users, and clean up saved login state. Never commit
   credentials, tokens, or storage state, or expose them in report attachments.
   The details will depend on how the application handles authentication and permissions.

7. **Manage test data outside test steps.**

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
   to check a control directly.

   For example, wrap dropdown and button access in methods:

   ```ts
   await filters.selectRegion(Region.EUROPE);
   await filters.selectCategory(Category.FURNITURE);
   await filters.apply();
   ```

   Add `applyFilters(criteria)` if several scenarios repeat this sequence. Keep the smaller
   methods for tests that check intermediate states; do not force every interaction into
   one large method.

   Layout changes would then affect fewer test operations. Pages should handle interactions,
   waits, and reading values; business assertions belong in tests. Add a workflow layer
   only when tests repeat the same process across several pages.

9. **Declare UI elements with annotations (implemented).**

   The project-owned `@FindBy` and `PageFactory` initialize page components and typed
   controls from parent-scoped Playwright locators. Field selectors override class-level
   selectors; annotated raw `Locator` leaves and async `LocatorList<T>` collections are
   supported. The UI provider calls `PageFactory.initElements` after the Page Object
   constructor; the Cucumber `World` continues to own scenario dependencies. Annotated
   fields must not be `readonly` and must have no field initializer. See the [contributor guide](docs/framework-contributor-guide.md) for the
   supported types and initialization rules.

10. **Make browser reuse configurable.**

   Separate the lifetime of Playwright and the browser from the lifetime of a scenario.
   Allow a browser to stay open between tests instead of launching a new one every time.
   Keep the current per-scenario mode available for tests that need a fresh browser process.

   For example, a future `browser.lifecycle=scenario|worker` setting could choose between
   a new browser for each scenario and one browser reused by a worker. In worker mode,
   each scenario would still get a fresh BrowserContext and Page, keeping cookies,
   local storage, and other context state separate. Reusing the browser should not mean
   sharing a logged-in context or making tests depend on their execution order.

   A browser owner would manage startup, reuse, and shutdown. Hooks would close each
   scenario's context to save its HAR and trace files, while the owner would close the
   browser and Playwright when the worker finishes. A disconnected browser should be
   reported and replaced before the next scenario, not silently retried mid-test.

   This would reduce browser startup overhead without giving up scenario isolation.
   Cucumber.js parallel workers are separate processes, so a reused browser would be owned
   by one worker; creation, use, and cleanup must stay in that worker.

11. **Separate Playwright session configuration and resource lifetimes (accepted constraint).**

   [`PlaywrightSession`](src/framework/playwright/PlaywrightSession.ts#L20-L60)
   reads `headless` through static configuration and keeps one `Browser`/`BrowserContext` pair.
   `getNewPage()` launches a new pair and overwrites those fields. This is safe with the current
   one-page-per-scenario hooks, but repeated calls on one session could leave the earlier pair
   unclosed. Before reusing a browser across tests, make configuration instance-scoped and give
   the browser and each scenario's context/page separate owners.

12. **Compare objects instead of checking fields one by one.**

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

   Choose the fields from the scenario's expectations; a region-only scenario should not
   also assert category. This is a partial object comparison, not a check of the whole
   transaction.

   For full object comparisons, prepare controlled test records and an independently
   defined expected list, including IDs, dates, and revenue. Compare all fields and list
   contents, checking order only when the scenario requires it. Do not build expected
   values from the actual response or grid, or hide unknown fields with broad ignore rules.
   Keep the non-empty result checks so an empty response or grid cannot pass a filter test.


## Troubleshooting

- **Application connection refused:** start `sales-analytics-qa-task` in a separate
  terminal and verify `http://localhost:3000` before running API/UI scenarios.
- **Browser binary missing:** rerun the project-local Playwright install command from
  the repository root, preserving `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers`.
- **Firefox fails at launch on macOS** (`Operation not permitted` or `Could not find profile
  folder`): the system protects the default application-data directory. Give Firefox a
  temporary CoreFoundation home instead of weakening system security:

  ```bash
  mkdir -p "$TMPDIR/playwright-firefox-home"
  CFFIXED_USER_HOME="$TMPDIR/playwright-firefox-home" HEADLESS=true npm run test:firefox
  ```

  macOS may protect the generated `Library` and `Downloads` folders in that temporary home;
  let the system clean them up rather than changing their permissions.
- **Unexpected tags or profile selection:** inspect `TAG` and CLI `--tags` values; explicit
  CLI options override profile settings.
- **Rerun file disappears:** `npm run build` cleans `target/`; run the failed-only rerun
  before rebuilding.
