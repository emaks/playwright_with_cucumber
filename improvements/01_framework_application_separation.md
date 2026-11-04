# Plan: Separate framework code from application code

## Goal

Make the test infrastructure reusable without copying Sales Analytics pages, services,
and models. Keep a single Maven project, the current scenarios, and existing run behavior.

This document is a plan, not an implementation report. Mark completed tasks with `[x]`;
record decisions, results, and open questions in the comments for each stage.

## Scope

- `framework` contains reusable API clients, Playwright resources, controls, reporting,
  configuration, and cleanup.
- `salesanalytics` contains pages, components, services, models, and test operations for
  the Sales Analytics functional module of the application under test; it is not a separate
  application.
- Application code may depend on the framework, but not the other way around. This includes
  dependencies through fully qualified class names, reflection, or hidden reads of
  application-specific resources.
- Cucumber integration may depend on the framework; the framework must not depend on
  application-specific step definitions or suites.
- Do not change assertions, the scenario context API, browser lifecycle, authentication,
  declarative element initialization, or business behavior in this refactor.
- Do not add another DI framework, a service locator, interfaces for every class, or
  separate Maven modules.

## Target structure

Example target structure; all packages start with `io.materialspace`.

```text
src/main/java/io/materialspace/
  framework/
    api/                         # ApiClient, ApiRequestOptions, ApiResponse
      clients/                   # PlaywrightApiClient
    playwright/                  # PlaywrightSession for UI and API
    ui/                          # BasePage, PageWrapper
      control/                   # Button, Dropdown, Table
    reporting/allure/            # AllureApiClient
    config/                      # PropertyLoader
    json/                        # ObjectMapperUtils
    lifecycle/                   # Cleanup
  salesanalytics/
    api/                         # TransactionsService, filters, request builder
      models/                    # TransactionsResponse and nested models
    ui/                          # TransactionsPage
      component/                 # Filters, TransactionsGrid

src/test/java/io/materialspace/
  testsupport/
    cucumber/                    # Shared hooks, providers, transformers, and API glue
    context/                     # Context and ContextKey (used only by tests)
  salesanalytics/
    definitions/                 # Application Gherkin bindings and parameter types
    steps/                       # Test operations and assertions
  suites/                        # BackendTests, FrontendTests
```

`PlaywrightSession` belongs outside `ui` because it also creates API contexts.
`AllureApiClient` remains a decorator, but belongs to the reporting integration.
`Context` and `ContextKey` move to `src/test` because only test glue uses them.
Shared Cucumber hooks and providers stay in `testsupport`; Sales Analytics bindings and
parameter mappings belong in `salesanalytics`. This refactor changes package ownership,
not class implementations.

## Stage 1. Record the baseline

- [x] Check `git status` and separate prior changes from this refactor. Do not revert or
  overwrite changes made by others.
- [x] Record the run commands, number of selected scenarios, and API/UI suite results.
  Do not treat a successful Maven build as proof that scenarios actually ran.
- [x] Start the demo app with `npm start` in `sales-analytics-qa-task/`.
- [x] Run the baseline:

  ```bash
  mvn -q -Dtest=BackendTests test
  mvn -q -Dtest=FrontendTests -Dheadless=true test
  ```

- [x] Record any existing failures separately so they are not attributed to package moves.
- [x] Check current Allure attachments, HAR paths, retry settings, and behavior of
  `-Dtag`, `-Denv`, `-Dbrowser`, `-Dheadless`, and `-Dthreads`. Record what must remain
  compatible.

**Complete when:** baseline results and behavior are recorded for comparison.

**Comments — completed 2026-11-04:**

- Starting revision: `0618084` (`improvements`). The worktree was clean before testing:
  `git status --short` and `git diff --stat` showed no changes. Package moves had not begun;
  only this document was changed during this stage.
- Environment: macOS aarch64, OpenJDK `27.0.1.0.3`, Maven `3.10.0`,
  Node.js `26.0.0`, and npm `11.12.1`. The Maven compiler release remains `25`.
- The demo app was initially stopped. It was started with `npm start`; before testing,
  `http://localhost:3000` and `/api/transactions` both returned HTTP 200. The demo process
  started for the baseline was stopped afterward.

  | Command | Scenarios | Steps | Result |
  |---------|-----------|-------|--------|
  | `mvn -q -Dtest=BackendTests test` | 2 | 8 | All passed, exit code 0 |
  | `mvn -q -Dtest=FrontendTests -Dheadless=true test` | 3 | 18 | All passed, exit code 0 |

- API examples use `region=Europe` and `category=Furniture`. UI examples cover individual
  region/category filters and the Europe/Furniture combination. Executed scenario counts
  were confirmed in the Cucumber summary, not inferred from Maven's exit code alone.
- No failures occurred in these runs. The API run emitted an existing Lombok warning about
  deprecated `sun.misc.Unsafe::objectFieldOffset`; it did not affect execution. A successful
  baseline does not rule out flakiness in other runs.
- Five new Allure results in `target/allure-results/` were checked; all passed. Both API
  scenarios have non-empty `API request`, `API request URL`, and `API response` attachments.
  The request attachment includes `GET transactions`, the query parameter, and a
  `30000.0 ms` timeout.
- After the UI suite, `target/allure-results/environment.properties` contained
  `env=local`, `browser=chromium`, `headless=true`, `threads=1`, and both base URLs.
- Three valid HAR files were created under `target/har-recordings/`, one per UI scenario,
  each with three network entries. Filenames include a timestamp and UUID. Example:
  `2026-11-04-132715-8ea33f51-b8d3-47d7-9374-b045dcdefc1b-har-recording.har`.
- Failure screenshots and transport-error attachments are not expected in passing runs.
  Their behavior was checked by reviewing the hooks and decorator; controlled failures
  are covered in Stage 7, not in this baseline.
- Full logs are stored outside Git as session artifacts:
  `stage1-api-baseline.log` and `stage1-ui-baseline.log` in
  `/Users/yevhenmaksymenko/.copilot/session-state/319bf601-8652-4d28-88c4-9054b731d164/files/`.
  Allure/HAR files are local generated artifacts, not a long-term archive; later runs may
  update the environment and Cucumber JSON report.

**Compatibility contract for later stages** (verified against the current code and configuration):

| Setting             | Behavior to preserve                                                                                                                                         |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Suites              | `-Dtest=BackendTests` and `-Dtest=FrontendTests`; features in `features.be` / `features.fe`                                                                  |
| Retry               | Surefire retries a failing test once; change `rerunFailingTestsCount` in `pom.xml` to adjust the count                                                        |
| `-Dtag`             | Maven profile passes the value to `cucumber.filter.tags`; without it, no tag filter is applied                                                               |
| `-Denv`             | Defaults to `local`, loads `configs/{env}.properties`; a missing file causes an error                                                                        |
| Base URLs           | Defaults: UI `http://localhost:3000`, API `http://localhost:3000/api`; system properties override them                                                     |
| `-Dbrowser`         | Defaults to `chromium`; supports `chromium` and `firefox`                                                                                                    |
| `-Dheadless`        | Defaults to `false`; baseline UI run explicitly used `true`                                                                                                  |
| `-Dthreads`         | Defaults to `1`; sets Cucumber fixed parallelism and max pool size                                                                                            |
| Reporting           | Allure in `target/allure-results/`, Cucumber JSON in `target/site/cucumber-report.json`                                                                        |
| Failure diagnostics | Screenshot only for a failed UI scenario with an available page; API request is attached before execution, and runtime exceptions include a stack trace        |
| Cleanup             | BrowserContext → Browser → Playwright; later cleanup failures are not suppressed                                                                              |

Tag filtering, Firefox, parallel execution, and retry behavior were initially documented
from configuration; runtime verification was deferred to Stage 7.

## Stage 2. Assign ownership for each class

- [x] Find all class usages before moving files, including imports, annotations,
  configuration strings, and resources.
- [x] Confirm the move map:

  | Current classes / package | Target |
  |---------------------------|--------|
  | `be.lib.ApiClient`, `ApiRequestOptions`, `ApiResponse` | `framework.api` |
  | `be.lib.clients.PlaywrightApiClient` | `framework.api.clients` |
  | `be.lib.clients.AllureApiClient` | `framework.reporting.allure` |
  | `fe.lib.PlaywrightSession` | `framework.playwright` |
  | `fe.lib.BasePage`, `PageWrapper` | `framework.ui` |
  | `fe.lib.control.*` | `framework.ui.control` |
  | `lib.utils.PropertyLoader` | `framework.config` |
  | `lib.utils.ObjectMapperUtils` | `framework.json` |
  | `lib.utils.Cleanup` | `framework.lifecycle` |
  | `be.salestransactions.*` | `salesanalytics.api`, keep `models` |
  | `fe.salestransactions.*` | `salesanalytics.ui`, keep `component` |
  | `steps.be.*`, `steps.fe.*` | `salesanalytics.steps.api`, `salesanalytics.steps.ui` |
  | `definitions/AllureEnvironmentHook` | `testsupport.cucumber` |
  | `definitions/be/ApiClientProvider` | `testsupport.cucumber` |
  | `definitions/be/Hooks`, `definitions/fe/Hooks` | `testsupport.cucumber` |
  | `definitions/be/GeneralDefinitions` | `testsupport.cucumber` |
  | `definitions/be/SalesTransactionsDefinitions` | `salesanalytics.definitions.api` |
  | `definitions/fe/SalesTransactionsDefinitions` | `salesanalytics.definitions.ui` |
  | `definitions/ParameterTypeAdapter` | Split between `testsupport.cucumber` and `salesanalytics.definitions` in Stage 5 |
  | `lib.utils.Context`, `ContextKey` | `testsupport.context` under `src/test` |
  | `suites/BackendTests`, `FrontendTests` | Keep under `suites`, separate from glue |

- [x] Classify `Context` and `ContextKey` separately. All current usages are in
  `src/test/java`; move both classes to `src/test/.../testsupport/context`.
  Do not change how values are stored in this task.
- [x] Do not move the entire `definitions` package into the framework.
  Separate the generic Jackson transformers from the Sales Analytics mappings in
  `ParameterTypeAdapter` during Stage 5.
- [x] Assign `GeneralDefinitions`, hooks, `AllureEnvironmentHook`, and
  `ApiClientProvider` based on their actual dependencies, not just their names.
  Keep shared Cucumber glue in test support.

**Cucumber code ownership based on actual dependencies:**

| Current class | Target | Reason / notes |
|---------------|--------|----------------|
| `definitions/AllureEnvironmentHook` | `testsupport.cucumber` | Generic `@BeforeAll`; collects environment properties and writes them to Allure results. Uses shared configuration, not the Sales Analytics domain. |
| `definitions/be/ApiClientProvider` | `testsupport.cucumber` | Composes `PlaywrightApiClient → AllureApiClient`; does not create `TransactionsService` or contain an application-specific endpoint. |
| `definitions/be/Hooks` | `testsupport.cucumber` | Generic `@api` lifecycle hook; closes the injected client and Playwright session. |
| `definitions/fe/Hooks` | `testsupport.cucumber` | Generic `@ui` lifecycle hook; initializes the page from the browser property, attaches a failure screenshot, and cleans up. |
| `definitions/be/GeneralDefinitions` | `testsupport.cucumber` | Generic HTTP status assertion using `ApiResponse`; depends on test context, not transaction models. |
| `definitions/be/SalesTransactionsDefinitions` | `salesanalytics.definitions.api` | Gherkin bindings for the transactions endpoint and `TransactionFilters`. |
| `definitions/fe/SalesTransactionsDefinitions` | `salesanalytics.definitions.ui` | Gherkin bindings for the Sales Transactions page, filter enum, and grid columns. |
| `definitions/ParameterTypeAdapter` | Split between `testsupport.cucumber` and `salesanalytics.definitions` in Stage 5 | Default Jackson transformers are shared; mappings for `TransactionFilters`, `TransactionFilter`, and `TransactionsGrid.Column` are application-specific. Do not register default transformers twice. |
| `lib/utils/Context`, `ContextKey` | `testsupport.context` | Used only by Cucumber definitions; no other references were found in `src/main`. |
| `suites/BackendTests`, `FrontendTests` | Keep under `suites` | JUnit Platform entry points; selectors target feature resources `features.be` / `features.fe`, not Java glue packages. |

- [x] Keep shared Cucumber glue in test support. `GeneralDefinitions`, hooks,
  `AllureEnvironmentHook`, and `ApiClientProvider` are not framework classes; they are
  test-source integration code connecting Cucumber to the framework API.
- [x] Keep Sales Transactions step bindings and parameter mappings application-specific.

**Complete when:** every class has a target location and any ambiguous decisions are
documented before moving files. Stage 2 is complete; code changes begin in Stage 3.

**Comments — completed 2026-11-04:**

- Checked all 36 Java files for imports and references. `Context` and `ContextKey` are used
  only under `src/test/java/io/materialspace/definitions`.
- `ParameterTypeAdapter` did combine shared default transformers with application-specific
  `@DataTableType` mappings. Their physical split remains for Stage 5 to avoid changing
  Cucumber registration during this stage.
- Hooks and providers use generic `ApiClient`, `PlaywrightSession`, `PageWrapper`, `Cleanup`,
  and run properties; they do not import transaction models. They belong in
  `testsupport.cucumber`, not `framework` or Sales Analytics glue.
- `GeneralDefinitions` checks a generic HTTP response status, so it belongs in
  `testsupport.cucumber`. Both `SalesTransactionsDefinitions` classes are tied to domain
  types and the page, so they belong in `salesanalytics.definitions`.
- `BackendTests` and `FrontendTests` select the Gherkin resource packages `features.be` and
  `features.fe`. Java glue packages can move independently if `cucumber.glue` is updated;
  feature paths and suite selectors stay unchanged.
- Checked configuration/resource references: `cucumber.glue` currently points to
  `io.materialspace.definitions`; the Allure results directory is `target/allure-results`;
  environments use `configs/{env}.properties`; shared URL keys are `ui.base.url` and
  `api.base.url`. Update glue and imports in Stages 3–5, but keep these external keys and
  locations unchanged.

## Stage 3. Move reusable infrastructure

Depends on Stages 1–2.

- [x] Move configuration, JSON, and cleanup utilities, updating package declarations and
  all references.
- [x] Move the API contracts and Playwright client.
- [x] Move the Allure decorator to `framework.reporting.allure`. Preserve automatic
  reporting, request attachments before execution, and propagation of the original
  transport exceptions.
- [x] Move the Playwright session to `framework.playwright`. Preserve cleanup order and
  HAR paths.
- [x] Move `PageWrapper`, `BasePage`, and controls.
- [x] Check that the framework contains no Sales Analytics endpoints, UI selectors, or
  transaction models.
- [x] Keep the generic configuration keys `ui.base.url` and `api.base.url`. Keep the actual
  URLs in test application configuration, not hardcoded in framework classes. Do not
  rewrite `PropertyLoader` or its configuration API.
- [x] Compile all consumers:

  ```bash
  mvn -q -DskipTests test-compile
  ```

**Complete when:** reusable classes are under `framework`, all consumers compile, and
public behavior is unchanged.

**Comments:** _moved groups, compilation results, and issues._

**Stage 3 completed 2026-11-04:**

- A follow-up search found no Sales Analytics endpoints, transaction names/models, UI
  selectors, or demo data under `src/main/java/io/materialspace/framework`.
- URLs remain in `src/main/resources/configs/local.properties`; the framework reads them
  using the generic `ui.base.url` and `api.base.url` keys. No URL or endpoint was added as
  a framework constant. `PropertyLoader` and its configuration API were not changed.
- After all moves, `mvn -q -DskipTests test-compile` succeeded. The only output was the
  existing Lombok warning about deprecated `sun.misc.Unsafe::objectFieldOffset`.
- Reusable classes now live under `framework.api`, `framework.config`, `framework.json`,
  `framework.lifecycle`, `framework.playwright`, `framework.reporting.allure`,
  `framework.ui`, and `framework.ui.control`. No old package references remain.
- This stage only moved packages and imports; API, UI, reporting, configuration, and
  resource lifecycle behavior were unchanged. Full runtime regression is covered in Stage 7.

**Intermediate results — first task completed 2026-11-04:**

- `PropertyLoader` moved to `framework.config`.
- `ObjectMapperUtils` moved to `framework.json`.
- `Cleanup` moved to `framework.lifecycle`.
- Updated all discovered imports in `ApiResponse`, `BasePage`, `PlaywrightSession`,
  `AllureEnvironmentHook`, `ParameterTypeAdapter`, and API/UI hooks. Class behavior was
  unchanged.
- `mvn -q -DskipTests test-compile` succeeded with only the existing Lombok warning about
  deprecated `sun.misc.Unsafe::objectFieldOffset`.
- No old imports reference the moved utilities. Only `Context` and `ContextKey` remained
  under `lib.utils`; they were assigned to Stage 2 and moved later.
- API contracts `ApiClient`, `ApiRequestOptions`, and `ApiResponse` moved to
  `framework.api`; `PlaywrightApiClient` moved to `framework.api.clients`. Updated imports
  in the service, request builder, steps, hooks, and provider. `AllureApiClient` stayed
  in its old package until its separate decorator move.
- No old `be.lib` imports remained for the API contracts or Playwright client.
  `mvn -q -DskipTests test-compile` passed again with the same Lombok warning.
- `AllureApiClient` moved to `framework.reporting.allure`; `ApiClientProvider` uses the
  new package. Reporting behavior was unchanged, and no old-package references remained.
  Compilation passed with the existing Lombok warning.
- `PlaywrightSession` moved to `framework.playwright`; imports in API/UI hooks and the API
  provider were updated. No old fully qualified class names remained. Lifecycle, config,
  HAR path, and cleanup order were unchanged. Compilation passed with the existing warning.
- `BasePage` and `PageWrapper` moved to `framework.ui`; `Button`, `Dropdown`, and `Table`
  moved to `framework.ui.control`. Updated imports in the Sales Analytics page, components,
  and UI hook. Behavior was unchanged, no old fully qualified class names remained, and
  compilation passed with the existing warning.

## Stage 4. Move application code

Depends on Stage 3.

- [x] Move `TransactionsService`, request builder, filters, and response models to
  `salesanalytics.api`.
- [x] Move `TransactionsPage`, `Filters`, and `TransactionsGrid` to `salesanalytics.ui`.
- [x] Update imports in test operations and move them to `salesanalytics.steps.api` and
  `salesanalytics.steps.ui`.
- [x] Keep the UI component's current use of `TransactionFilter`; adding a domain layer or
  changing this dependency is outside the scope of this refactor.
- [x] Do not change selectors, HTTP parameters, Gherkin wording, test data, assertions, or
  wait methods.
- [x] Rerun `mvn -q -DskipTests test-compile`.

**Complete when:** application code is grouped under `salesanalytics`, and changes are
limited to package organization and necessary reference updates.

**Comments:** _results, deviations, and reasons._

**Intermediate results — first task completed 2026-11-04:**

- `TransactionsService`, `RequestOptionsBuilder`, `TransactionFilter`, and
  `TransactionFilters` moved to `salesanalytics.api`.
- `TransactionsResponse` moved to `salesanalytics.api.models`.
- Updated imports in `Filters`, API/UI steps, and Cucumber parameter definitions.
  The UI component's use of `TransactionFilter` was preserved without behavior changes.
- No references to the old `be.salestransactions` package remained.
- `mvn -q -DskipTests test-compile` passed; the existing Lombok warning about deprecated
  `sun.misc.Unsafe::objectFieldOffset` remained.
- `TransactionsPage` moved to `salesanalytics.ui`; `Filters` and `TransactionsGrid`
  moved to `salesanalytics.ui.component`. Updated package declarations and imports in the
  parameter adapter, UI definitions, and UI steps; the test steps had not moved yet.
- No references to the old `fe.salestransactions` package remained. Compilation passed
  with the existing Lombok warning.
- `SalesTransactionsSteps` moved to `salesanalytics.steps.api` and
  `salesanalytics.steps.ui`; definitions now use the new packages. No references to the
  old `io.materialspace.steps.be/fe` packages remained. Compilation passed with the same
  Lombok warning.
- `Filters` still accepts `salesanalytics.api.TransactionFilter`; no domain layer or
  additional adapters were added, as agreed for this refactor.
- A follow-up search found no references to `be.salestransactions`, `fe.salestransactions`,
  or `steps.be/fe`.
- `mvn -q -DskipTests test-compile` passed after all Stage 4 moves, with the existing
  Lombok warning about deprecated `sun.misc.Unsafe::objectFieldOffset`.
- Gherkin, selectors, API parameters, test data, assertions, and wait methods were
  unchanged; Stage 4 was limited to package declarations and imports.

**Stage 4 completed 2026-11-04.** Runtime API/UI suites and Cucumber discovery were
validated in Stage 7.

## Stage 5. Separate test support from application glue

Depends on Stage 4.

- [x] Move Sales Analytics step definitions into the appropriate
  `salesanalytics.definitions` subpackages.
- [x] Move generic Jackson transformers from `ParameterTypeAdapter` to test support,
  leaving domain-specific `@DataTableType` mappings in Sales Analytics glue.
- [x] Keep exactly one registration of each default transformer to avoid duplicate
  Cucumber registrations.
- [x] Move generic hooks and providers to `testsupport.cucumber`. Keep code that creates
  concrete Sales Analytics services in application test glue.
- [x] Update `cucumber.glue` in `src/test/resources/cucumber.properties` so Cucumber sees
  both package groups. For example:

  ```properties
  cucumber.glue=io.materialspace.testsupport.cucumber,io.materialspace.salesanalytics.definitions
  ```

- [x] Confirm `ApiClientProvider` is still registered with Cucumber-PicoContainer,
  `ApiClient` receives the Allure wrapper, and shared dependencies are not recreated
  within a scenario.
- [x] Keep the suite class names `BackendTests` and `FrontendTests`, feature paths, and
  suite selectors. Moving Java packages does not require moving Gherkin resources.
- [x] Check that each hook runs once for its tag and scenario-scoped resources have not
  become static/global.

**Complete when:** Cucumber finds the same scenarios and bindings without undefined or
ambiguous steps, duplicate hooks, or provider registration errors.

**Comments:** _updated glue packages, DI results, and discovery._

**Intermediate results — first task completed 2026-11-04:**

- `SalesTransactionsDefinitions` for API and UI moved to
  `salesanalytics.definitions.api` and `salesanalytics.definitions.ui`.
- Glue configuration had not yet changed: `cucumber.glue` still pointed to
  `io.materialspace.definitions`. Until the glue setting was updated, Cucumber runtime
  discovery could not find the moved definitions.
- `mvn -q -DskipTests test-compile` succeeded; only the existing Lombok warning about
  deprecated `sun.misc.Unsafe::objectFieldOffset` remained.
- The rest of Stage 5 had not been completed at this point.
- The shared default transformer moved to `testsupport.cucumber.JacksonTransformer`;
  domain-specific `@DataTableType` mappings stayed in
  `salesanalytics.definitions.ParameterTypeAdapter`.
- A search confirmed one registration of each default transformer. Compilation passed
  with the existing Lombok warning.
- Cucumber glue did not yet include `testsupport.cucumber` or
  `salesanalytics.definitions`; runtime discovery was restored in the separate
  `cucumber.glue` task.
- Verified separately: `@DefaultParameterTransformer`,
  `@DefaultDataTableCellTransformer`, and `@DefaultDataTableEntryTransformer` each occur
  exactly once, in `JacksonTransformer`.
- Shared hooks and the provider moved to `testsupport.cucumber.api/ui`;
  `AllureEnvironmentHook` and `GeneralDefinitions` moved into test support.
  `Context` and `ContextKey` moved from `src/main` to
  `src/test/.../testsupport/context`.
- `ApiClientProvider` only creates the framework client/decorator. There is no separate
  provider creating `TransactionsService`; Cucumber-PicoContainer constructs the service
  through constructor injection, so the application service remains in `salesanalytics.api`.
- `mvn -q -DskipTests test-compile` succeeded. The glue setting was still a separate task,
  and runtime discovery of the moved test-support classes had not yet been checked.
- `cucumber.glue` was updated to
  `io.materialspace.testsupport.cucumber,io.materialspace.salesanalytics.definitions`.
  Both suites then ran for discovery validation: API — 2 scenarios / 8 steps passed;
  UI — 3 scenarios / 18 steps passed. There were no undefined/ambiguous steps or duplicate
  transformers.
- `ApiClientProvider` has `@CucumberPicoProvider` and wraps the Playwright client with the
  Allure decorator. Both API results included non-empty request and response attachments,
  confirming the decorator is active.
- `ApiClient`, `PlaywrightSession`, and `Context` are constructor-injected into scenario glue;
  they are not static/global. Cucumber-PicoContainer reuses registered instances within
  each scenario. No runtime creation counter was added; the wiring and successful run were
  verified, not PicoContainer's internal counters.
- `BackendTests`, `FrontendTests`, `@SelectPackages("features.be")`,
  `@SelectPackages("features.fe")`, and both feature resource paths stayed unchanged.
  After the glue change, the suites found and ran 2 API and 3 UI scenarios.
- Hook annotations were checked: one `@After("@api")`, one
  `@Before/@After("@ui")` pair, and one `@BeforeAll` for the Allure environment.
  Hooks ran in both suites without lifecycle errors. The Playwright session, API client,
  page wrapper, and context are not static/global.
- Stage 5 completed 2026-11-04. API/UI runtime validation passed:
  API — 2 scenarios / 8 steps; UI — 3 scenarios / 18 steps.

## Stage 6. Enforce dependency boundaries

Depends on Stages 3–5.

- [x] Check all `framework` dependencies: none may point to `salesanalytics`,
  `testsupport`, `steps`, `definitions`, or `suites`.
- [x] Check that application pages and services do not import test support.
- [x] Add an automated package-boundary check in the test source set. Prefer a small
  ArchUnit test with a test-scoped dependency; add a compatible JUnit engine if needed.
- [x] Check bytecode dependencies, not just import text: `framework..` must not depend
  on application or test packages.
- [x] Confirm the architecture test runs under `mvn test`, not just during compilation.
- [x] Temporarily add a forbidden dependency and confirm the rule fails with a clear
  message. Remove only that temporary change afterward.
- [x] Do not require `framework.reporting.allure` to be independent of Allure or the
  Playwright adapter to be independent of Playwright; these are allowed integrations,
  not application dependencies.

**Complete when:** a new framework → application dependency fails automatically.
Separate Maven modules are not needed for this.

**Comments:** _tool, rules, run command, and negative test._

**Stage 6 completed 2026-11-04:**

- The initial search found no `framework` → application/test dependencies or
  `salesanalytics.api/ui` → `testsupport` dependencies.
- Added the test-scoped dependency `com.tngtech.archunit:archunit-junit5:1.4.1`.
  A separate Jupiter engine was not needed: Surefire runs the ArchUnit JUnit Platform
  engine, and the full `mvn -q -Dheadless=true test` includes `ArchitectureTest`.
- `ArchitectureTest` checks bytecode dependencies, not just imports:
  1. `framework..` cannot depend on `salesanalytics..`, `testsupport..`, `steps..`,
     `definitions..`, or `suites..`;
  2. `salesanalytics.api..` and `salesanalytics.ui..` cannot depend on `testsupport..`.
- `src/test/resources/archunit.properties` disables resolving missing classes from the
  entire classpath. The rules only need target type names, and this avoids unnecessary
  JDK scanning and log noise.
- The positive run `mvn -q -Dtest=ArchitectureTest test` passed: 2 rules, 0 failures.
  Surefire reported `tests=2`, `failures=0`.
- Two negative probes were run: a temporary `framework.config` → `salesanalytics.api`
  dependency and a separate `salesanalytics.api` → `testsupport` dependency. Each failed
  on the expected ArchUnit rule and identified the field and forbidden type. Both probe
  source/class files were removed afterward.
- The full `mvn -q -Dheadless=true test` passed before the negative probes: API — 2 scenarios
  / 8 steps, UI — 3 scenarios / 18 steps; all passed. ArchitectureTest ran 2 rules. The
  ArchUnit suite passed again after probe removal. The existing Lombok warning about the
  deprecated Unsafe API remains.
- Allure/Playwright integrations are allowed; no separate Maven modules were created.

## Stage 7. Verify behavior is preserved

Depends on Stages 5–6.

- [x] Run the API and UI suites and compare scenario counts with the baseline:

  ```bash
  mvn -q -Dtest=BackendTests test
  mvn -q -Dtest=FrontendTests -Dheadless=true test
  ```

- [x] Check the combined run and tag filtering:

  ```bash
  mvn -q -Dheadless=true test
  mvn -q -Dtag=@api test
  mvn -q -Dtag=@ui -Dheadless=true test
  ```

- [x] Run a Firefox UI smoke test.

  On macOS 27, use a separate `CFFIXED_USER_HOME`; see README Troubleshooting.

- [x] Run the suites in parallel:

  ```bash
  mvn -q -Dheadless=true -Dthreads=2 test
  ```

- [x] Confirm API attachments, environment details, and HAR files are created in the same
  locations and contain the expected data.
- [x] Use controlled failures to check UI screenshot attachments and API request details
  and stack traces on transport errors. Use temporary probes; do not leave intentionally
  failing scenarios in the suite.
- [x] Check that teardown closes resources without hiding the original failures.
- [x] Review the diff for accidental business-logic changes, old package references, and
  incorrect imports.

**Complete when:** behavior matches the baseline and pre-existing issues are distinguished
from regressions caused by this refactor.

**Comments — validation completed 2026-11-04:**

- API baseline: `mvn -q -Dtest=BackendTests test` — 2 scenarios / 8 steps passed.
  UI baseline: `mvn -q -Dtest=FrontendTests -Dheadless=true test` — 3 scenarios /
  18 steps passed. These counts match Stage 1.
- The combined `mvn -q -Dheadless=true test` passed with the same 2 API and 3 UI scenarios;
  it also ran the 2 ArchUnit rules.
- Tag filters were checked separately: `-Dtag=@api` ran 2 API scenarios;
  `-Dtag=@ui -Dheadless=true` ran 3 UI scenarios. The suite with no matching tags ran
  0 scenarios while the other suite ran the expected cases.
- Parallel execution with `mvn -q -Dheadless=true -Dthreads=2 test` passed:
  API — 2/8, UI — 3/18; both UI workers created their own Chromium sessions.
- Firefox smoke passed with `CFFIXED_USER_HOME` set to a temporary directory and
  `-Dmaven.repo.local="$HOME/.m2/repository"`: 3 scenarios / 18 steps passed.
  Without an isolated CoreFoundation home, Firefox 157 on macOS 27 reported
  `Could not find profile folder`; no code or system security settings were changed.
- The directory `/tmp/taf-playwright-firefox-home-stage7` remains outside the repository:
  macOS denied deletion of the ACL-protected `Library` and `Downloads` directories.
  System permissions were not changed; README recommends using the system `$TMPDIR`.
- Allure was checked: API request/response attachments are present, and environment
  properties contain the effective URLs, browser, environment, headless mode, and thread
  count. UI teardown produces valid HAR files with 3 network entries per scenario.
- A temporary UI failure probe created a `Failure screenshot` PNG attachment (101 KB);
  the HAR was finalized when the browser context closed. The temporary feature and its
  `target/test-classes` copy were removed.
- The API transport probe to `127.0.0.1:1` returned `ECONNREFUSED`. All four results
  (including Surefire retries) have `broken` status, request query/timeout attachments,
  and the original error stack trace. Cleanup did not replace the original failure.
- `Cleanup.run` was checked separately: every action runs, the first exception is
  propagated, and later failures are suppressed. After removing the probes, the full
  `mvn -q -Dheadless=true test` passed: API 2/8, UI 3/18, and 2 architecture rules.
- No old `be.salestransactions`, `fe.salestransactions`, or `steps.be/fe` imports remain,
  and no temporary probe source files remain. `git diff --check` is clean. The existing
  Lombok Unsafe deprecation warning remains.

**Stage 7 completed 2026-11-04.** All planned runtime checks passed; Firefox works on
macOS 27 with the documented temporary home.

## Stage 8. Update documentation and wrap up

Depends on Stage 7.

- [x] Update the README package tree and describe the framework/application boundary.
- [x] Explain the allowed dependency direction and where to add clients, controls, pages,
  services, and Cucumber bindings.
- [x] Update Java class references in the documentation where package names changed.
- [x] Check that README commands are still accurate.
- [x] Update `Keep framework code separate from application code` to distinguish the
  completed package split from a possible future shared module. Do not claim Maven modules
  have been created.
- [x] Complete this plan and mark only work that was actually done.
- [x] Review the diff for unrelated changes.

**Stage 8 completed 2026-11-04.**

**Comments:**

- The README tree now reflects the actual `framework`, `salesanalytics`, and `testsupport`
  packages, the ArchUnit test, and configuration resources.
- The dependency direction, Cucumber glue, locations for new infrastructure/application/test
  code, and ArchUnit checks are documented.
- Package separation and API provider wiring are marked as implemented. A separate Maven
  module or shared library remains a future option, not completed work.
- Updated references to `framework.config.PropertyLoader`,
  `salesanalytics.api.RequestOptionsBuilder`, and `framework.api` contracts. Replaced the
  incorrect CLI retry override with instructions to change the actual Surefire setting in
  `pom.xml`.
- Added the verified macOS 27 Firefox workaround and a way to keep Maven dependencies in
  the usual local cache.
- Test commands and settings were checked in Stages 1, 5, and 7; `git diff --check` passed.
  No code or test behavior changed in this stage.

## Final acceptance criteria

- [x] Reusable code is under `framework`; Sales Analytics code is under `salesanalytics`.
- [x] The framework does not depend on the application; an automated check enforces this.
- [x] Cucumber test support and application bindings have clear boundaries.
- [x] Discovery, DI, scenario isolation, reporting, and cleanup are preserved.
- [x] API/UI suites run the expected number of scenarios.
- [x] External run commands and configuration keys are unchanged.
- [x] No Maven modules were added; the context and browser lifecycle were not redesigned.
- [x] The README describes the actual structure.

## Next step, only if needed

When a second application needs the framework, plan a separate Maven module: review
dependency scopes, test-support placement, configuration resources, public APIs, and
versioning. Package separation alone does not make the project a ready-to-publish library.

**Additional comments:** _open questions and ideas outside the current scope._
