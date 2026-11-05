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

## Contents

- [Quick start](#quick-start)
- [Requirements and setup](#requirements-and-setup)
- [Build and tests](#build-and-tests)
- [Running in CI](#running-in-ci)
- [Configuration mapping](#configuration-mapping)
- [Architecture](#architecture)
- [Cucumber, reports, and generated files](#cucumber-reports-and-generated-files)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Quick start

```bash
npm ci
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium firefox
(cd sales-analytics-qa-task && npm start)   # keep running in a separate terminal
npm test
```

## Requirements and setup

The package declares Node.js `^24.0.0 || >=26.0.0`; npm is required. Chromium and Firefox
browser binaries are installed only in this project directory (`.playwright-browsers/`).
A Java runtime (8+) is needed only by the bundled Allure command-line tool when generating
HTML reports; compiling and running the tests does not require it.

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
npm run test:unit             # node:test unit tests, architecture boundaries, PageFactory
npm run architecture          # Positive Dependency Cruiser boundary check
npm run test:acceptance       # Controlled parallel/retry/rerun/reporting acceptance tests
npm test                      # Lint, unit tests, then all application scenarios
```

Cucumber profiles and common overrides:

```bash
npm run test:api
npm run test:ui
npm run test:firefox          # Firefox UI; see Troubleshooting
npm run test:parallel         # Full suite with two workers
npm run test:retry            # Full suite with --retry 1 (overrides RETRY)
npm run cucumber              # All features; default parallel=1 and retry=1
npm run test:ui -- --tags @ui # CLI options can override profile configuration
```

The `api` profile selects `@api` scenarios, the `ui` profile selects `@ui` scenarios, and
the default profile selects all application features. `PARALLEL`, `RETRY`, `BROWSER`, `HEADLESS`, `ENV`,
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

## Running in CI

CI agents have no display, so set `HEADLESS=true` explicitly (the default is `false`).
Install only the browsers the job needs, start the application, and wait until it responds
before running tests:

```bash
npm ci
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install --with-deps chromium
(cd sales-analytics-qa-task && npm ci && npm start &)
npx --yes wait-on http://localhost:3000
HEADLESS=true PARALLEL=2 npm test
npm run allure:generate
```

Publish `allure-report/` (or `allure-report-single/`) and `target/` as job artifacts so
failure screenshots, HAR files, and the rerun list are available. `--with-deps` installs
system libraries on Linux agents; omit it on macOS.

## Configuration mapping

`resources/configs/local.json` contains the checked-in endpoint configuration:

```json
{
  "ui.base.url": "http://localhost:3000",
  "api.base.url": "http://localhost:3000/api"
}
```

`ENV` selects `resources/configs/{env}.json`; a missing file is an error. Process
environment values override file values. Both dotted keys and uppercase environment
names are accepted for endpoints (`ui.base.url` / `UI_BASE_URL` and `api.base.url` /
`API_BASE_URL`). Runtime settings map as follows:

| Setting | Environment variable | Default |
|---|---|---|
| `env` | `ENV` | `local` |
| `ui.base.url` | `UI_BASE_URL` or `ui.base.url` | `http://localhost:3000` |
| `api.base.url` | `API_BASE_URL` or `api.base.url` | `http://localhost:3000/api` |
| `browser` | `BROWSER` | `chromium` |
| `headless` | `HEADLESS` | `false` |
| parallel workers | `PARALLEL` | `1` |
| retry | `RETRY` | `1` |
| tag expression | `TAG` | Profile default (`@api`, `@ui`, or all) |

The browser context uses a 1790 × 1120 viewport and a 10,000 ms UI timeout. API requests
use a 30,000 ms default timeout; `0` disables an individual request timeout. Decimal
values are parsed losslessly and represented with `decimal.js`, not rounded through
JavaScript `number`.

## Architecture

Execution flow:

```text
features/*.feature
  ├── Cucumber definitions → application test steps
  │                            ├── TransactionsService → framework API client
  │                            └── TransactionsPage → components → controls → Playwright
  └── testsupport World → scenario-scoped context, providers, and lifecycle hooks
```

Repository layout:

```text
features/
  ├── be/                    # API (@api) feature files
  └── fe/                    # UI (@ui) feature files
resources/configs/           # Per-environment endpoint configuration ({env}.json)
src/
  ├── framework/             # Reusable Playwright, API, UI, config, JSON, cleanup, logging, Allure
  ├── salesanalytics/        # Application-specific API, UI, definitions, and test steps
  └── testsupport/           # Cucumber World, scenario context, providers, hooks, adapters
tests/
  ├── framework/             # Unit tests for framework and application models/services
  ├── architecture/          # Dependency boundary checks
  └── acceptance/            # Parallel/retry/rerun/reporting acceptance tests
scripts/                     # clean and rerun helpers
docs/                        # Contributor guide and architecture roadmap
sales-analytics-qa-task/     # Application under test
cucumber.mjs                 # Cucumber profiles
```

`framework` may not depend on `salesanalytics`, `testsupport`, or test definitions.
Application API/UI packages may depend on `framework`, but not on `testsupport`.
`npm run architecture` checks the existing framework/application boundaries, and a
negative fixture proves that the rule rejects an illegal import.

The current scenario lifecycle remains per-scenario. API scenarios create an API request
context without launching a browser. UI scenarios create a browser page and HAR recording;
the browser context closes before the browser. Cleanup attempts all registered actions and
preserves the first and subsequent failures. Browser reuse and transport-independent API
responses are items in the [architecture roadmap](docs/roadmap.md).

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
has completed. Decorated fields support `{ type: Constructor }`, `{ locator: true }`, or
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

## Contributing

Read the [framework contributor guide](docs/framework-contributor-guide.md) before changing
framework, application, or test-support code. It defines package boundaries, provider and
PageFactory contracts, API invariants, logging rules, and the required checks.
Planned architecture work and its status are tracked in the
[architecture roadmap](docs/roadmap.md).

Before opening a change, run:

```bash
npm run typecheck && npm run lint && npm run architecture && npm run test:unit
```

Run the relevant Cucumber profile as well when steps, pages, or services change.

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
