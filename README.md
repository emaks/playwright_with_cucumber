# Sales Analytics test automation

Java, Maven, Cucumber, and Playwright tests for the Sales Analytics demo. The Node.js application
under test is included in [`sales-analytics-qa-task/`](sales-analytics-qa-task/).
In the Java framework, `salesanalytics` represents a functional module of the application
under test, not a separate application.

The current scenarios cover region/category filtering: API tests check the HTTP status and
returned values; UI tests apply single or combined filters and check the grid.
[`TESTS_COVERAGE.md`](TESTS_COVERAGE.md) describes planned coverage, with P0–P3 priorities, a
backend pairwise matrix, and a suggested implementation order. It is a test plan, not a list
of completed automated tests.

## Setup

You need **JDK 25+**, **Maven 3.9+**, and **Node.js 18+ with npm**. Git is needed if you clone
the repository rather than unpack an archive. The first setup needs internet access for Maven
dependencies and Playwright browsers.

Open a terminal in the repository root and check the installed versions:

```bash
java -version
mvn --version
node --version
npm --version
```

Install the supported browsers:

```bash
mvn exec:java -Dexec.mainClass=com.microsoft.playwright.CLI \
  -Dexec.args="install chromium firefox"
```

Repeat this command if browser binaries are missing or after updating Playwright.

Start the app in a separate terminal:

```bash
cd sales-analytics-qa-task
npm start
```

Keep it running for both API and UI tests. The UI is
at [http://localhost:3000](http://localhost:3000);
the transactions endpoint is `http://localhost:3000/api/transactions`.

## Run tests

Run these commands from the repository root:

```bash
mvn test                               # All scenarios
mvn test -Dtest=BackendTests           # API suite
mvn test -Dtest=FrontendTests          # UI suite
mvn test -Dtag=@api                    # Filter by Cucumber tag
mvn test -Dtag=@ui
```

UI tests use Chromium and open a visible browser by default, so they need a desktop session.
For a headless run or a different browser:

```bash
mvn test -Dtag=@ui -Dbrowser=firefox -Dheadless=true
```

The default worker count is one. To run scenarios in parallel:

```bash
mvn test -Dthreads=2
```

Surefire retries failing tests once by default. To change the retry count, update
`rerunFailingTestsCount` in the Maven Surefire configuration in `pom.xml`.

## Configuration

`framework.config.PropertyLoader` reads `src/main/resources/configs/{env}.properties`.
The default environment is `local`, and it is the only configuration file included:

```properties
ui.base.url=http://localhost:3000
api.base.url=http://localhost:3000/api
```

Use `-Denv` to select another file or Java system properties to override individual settings:

```bash
mvn test -Denv=local
mvn test \
  -Dui.base.url=http://localhost:3000 \
  -Dapi.base.url=http://localhost:3000/api
```

| Property       | Default                     | Purpose                              |
|----------------|-----------------------------|--------------------------------------|
| `env`          | `local`                     | Configuration file name              |
| `ui.base.url`  | `http://localhost:3000`     | UI base URL                          |
| `api.base.url` | `http://localhost:3000/api` | API base URL                         |
| `browser`      | `chromium`                  | `chromium` or `firefox`              |
| `headless`     | `false`                     | Run without a visible browser        |
| `threads`      | `1`                         | Cucumber worker count                |
| `tag`          | All tags                    | Cucumber tag expression, e.g. `@api` |

API requests have a 30,000 ms timeout. Set `.timeout(milliseconds)` on
`salesanalytics.api.RequestOptionsBuilder` to override it for a request; `0` disables the timeout.

## Reports

| Output                     | Location                           |
|----------------------------|------------------------------------|
| Allure results             | `target/allure-results/`           |
| Cucumber JSON              | `target/site/cucumber-report.json` |
| Generated Allure report    | `allure-report/`                   |
| Browser network recordings | `target/har-recordings/`           |

Allure shows the effective configuration in its Environment section. Failed UI scenarios attach
a screenshot if the page is initialized and open. API requests attach the method, endpoint,
query parameters, and timeout before execution, followed by the resolved URL and response status,
headers, and body. Transport failures attach a stack trace and still fail the scenario.

HAR names include a timestamp and UUID to avoid collisions in parallel runs.

Generate or serve an Allure report:

```bash
mvn io.qameta.allure:allure-maven:3.1.0:report
mvn io.qameta.allure:allure-maven:3.1.0:serve
```

The Maven report goal also creates a wrapper page and site assets. To generate just a
self-contained `allure-report/index.html`, use the CLI after the Maven plugin has downloaded it:

```bash
./.allure/allure-2.46.1/bin/allure generate target/allure-results \
  --single-file --clean -o allure-report
```

## Structure and design

```text
pom.xml                          # Build, dependencies, and test configuration
sales-analytics-qa-task/         # Node.js app under test
src/main/java/io/materialspace/
  framework/
    api/                         # API client contract, options, response, and Playwright client
    config/                      # PropertyLoader
    json/                        # ObjectMapperUtils
    lifecycle/                   # Cleanup
    playwright/                  # Browser and API session resources
    reporting/allure/            # Allure API client decorator
    ui/                          # BasePage and PageWrapper
      control/                   # Button, Dropdown, Table
  salesanalytics/
    api/                         # Sales Analytics functional module: service, filters, builder
      models/                    # TransactionsResponse
    ui/                          # TransactionsPage
      component/                 # Filters and TransactionsGrid
src/main/resources/
  configs/                       # Environment configuration
  *.properties                   # Logging and Allure settings
src/test/java/io/materialspace/
  architecture/                  # ArchUnit package-boundary rules
  salesanalytics/
    definitions/                 # Application-specific Cucumber bindings and mappings
    steps/                       # API/UI test operations and assertions
  testsupport/
    context/                     # Scenario context
    cucumber/                    # Shared hooks, providers, and transformers
  suites/                        # JUnit Platform suite entry points
src/test/resources/
  features/be/                   # API scenarios
  features/fe/                   # UI scenarios
  cucumber.properties            # Glue packages and report plugins
  archunit.properties            # ArchUnit import settings
```

Cucumber 7 runs the Gherkin features. `BackendTests` and `FrontendTests` select the API and UI
feature packages; `cucumber.glue` includes both `testsupport.cucumber` and
`salesanalytics.definitions`. Application bindings call test steps, which use API services or
Page Objects. Selectors stay in UI components and controls. Playwright handles browser and API
automation; AssertJ provides assertions and Jackson maps JSON responses.

PicoContainer provides scenario-scoped constructor injection. The API provider wires
`PlaywrightApiClient` with the `AllureApiClient` decorator, keeping reporting out of services.
`PlaywrightSession` owns Playwright resources. Hooks close the browser context first to save HAR
files, then close the browser and Playwright. Cleanup attempts every action, rethrows the first
failure, and adds later cleanup errors as suppressed exceptions.
Hooks also preserve screenshot/API-client cleanup errors when session cleanup fails.

Allure's Cucumber adapter writes report results; Cucumber also writes the JSON report and
failed-scenario list.

See the [framework contributor guide](docs/framework-contributor-guide.md) for layer
responsibilities, extension examples, lifecycle rules, and constraints relevant to code
generation.

## Architecture and planned improvements

Items 1 and 2 describe existing or partially implemented architecture, and item 9 is
implemented. The remaining items are possible next steps for a real project, not requirements
for this demo.

1. **Keep framework code separate from application code (implemented; [plan](improvements/01_framework_application_separation.md)).**

   Reusable Playwright sessions, controls, HTTP clients, reporting, and cleanup now live under
   `framework`. Sales Analytics pages, services, and models live under `salesanalytics`.
   Framework code must not import application or test classes; ArchUnit checks this boundary.

   Current top-level packages:

   ```text
   framework/            # Reusable test infrastructure
   salesanalytics/       # Application-specific API and UI code
   testsupport/          # Shared Cucumber glue and scenario context
   ```

   These boundaries make it possible to reuse framework code without copying Sales Analytics
   classes.

2. **Wire dependencies in providers (partially implemented; [plan](improvements/02_provider_dependency_wiring.md)).**

   The API provider currently composes `PlaywrightApiClient` with the `AllureApiClient`
   decorator. Services receive the resulting `ApiClient` through constructor injection; they
   do not create HTTP clients, use a global registry, or call Allure. Cucumber-PicoContainer
   constructs `TransactionsService` and Page Objects through constructor injection, so there
   is no separate provider for every class.

   What's left is to add explicit providers when an application-specific dependency needs
   configuration or a distinct lifetime—for example, role-specific API clients, authenticated
   browser contexts, or an alternate transport. Keep resource ownership and cleanup clear.
   Do not add providers just to wrap classes PicoContainer can construct directly.

3. **Extract the framework into a separate Maven module (Medium).**

   Framework and Sales Analytics code currently have separate packages but share one Maven
   module. If another application needs the framework, move the reusable code into its own
   module and keep application defaults and Cucumber glue in the consuming test project.
   This would make the dependency boundary visible to Maven as well as ArchUnit. Until there
   is another consumer, the package split is enough.

4. **Use a response model that does not depend on Playwright (Medium).**

   `framework.api.ApiClient` hides the HTTP client, but `framework.api.ApiResponse` directly
   wraps Playwright's `APIResponse` ([source](src/main/java/io/materialspace/framework/api/ApiResponse.java#L3-L9)).
   That means a different transport would still affect the framework API.
   If we need to replace Playwright or test services without HTTP calls, return our own
   response containing the status, headers, and body.

   For example:

   ```java
   public record HttpResponse(
       int status,
       Map<String, List<String>> headers,
       String body
   ) {}
   ```

   Copy the headers and their value lists so callers cannot change them. The HTTP client
   reads the response, copies its data, and closes the original resource. Services and
   reporting use the copy, which can also be supplied directly in tests.

   This works for small JSON responses. Streams and large files need a different approach
   with explicit closing, rather than reading everything into memory. Make this change
   when it solves a real need, not just to add another interface.

5. **Keep test-runner dependencies out of application code (Low).**

   ArchUnit currently prevents dependencies on the `testsupport` package, but it does not
   prevent production classes from importing Cucumber, JUnit, or AssertJ directly
   ([current rules](src/test/java/io/materialspace/architecture/ArchitectureTest.java#L12-L35)).
   Add rules for `salesanalytics.api` and `salesanalytics.ui` that reject test-runner
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

   ```java
   filters.selectRegion(Region.EUROPE);
   filters.selectCategory(Category.FURNITURE);
   filters.apply();
   ```

   Add `applyFilters(criteria)` if several scenarios repeat this sequence. Keep the smaller
   methods for tests that check intermediate states; do not force every interaction into
   one large method.

   Layout changes would then affect fewer test operations. Pages should handle interactions,
   waits, and reading values; business assertions belong in tests. Add a workflow layer
   only when tests repeat the same process across several pages.

9. **Declare UI elements with annotations (implemented; [plan](improvements/03_declarative_ui_elements.md)).**

   The project-owned `@FindBy` and `PageFactory` initialize page components and typed
   controls from parent-scoped Playwright locators. Field selectors override class-level
   selectors; annotated raw `Locator` leaves and lazy `List<T>` wrappers are supported.
   `BasePage` starts initialization from its `PageWrapper`; PicoContainer continues to own
   scenario dependencies. Annotated fields must be non-final and have no explicit field
   initializer. See the [contributor guide](docs/framework-contributor-guide.md) for the
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
   Parallel workers must not share Playwright objects across threads; the implementation
   needs to keep creation, use, and cleanup on the owning thread.

11. **Separate Playwright session configuration and resource lifetimes (accepted constraint).**

   [`PlaywrightSession`](src/main/java/io/materialspace/framework/playwright/PlaywrightSession.java#L20-L48)
   reads `headless` through static configuration and keeps one `Browser`/`BrowserContext` pair.
   `getNewPage()` launches a new pair and overwrites those fields. This is safe with the current
   one-page-per-scenario hooks, but repeated calls on one session could leave the earlier pair
   unclosed. Before reusing a browser across tests, make configuration instance-scoped and give
   the browser and each scenario's context/page separate owners.

12. **Compare objects instead of checking fields one by one.**

   Update API assertions to compare transaction objects with AssertJ instead of using
   nested loops and a switch over field names. For UI checks, add a method that reads
   the grid as a list of typed rows, such as `TransactionRow`, then compare those objects
   rather than reading each column separately and checking it with `allMatch()`.
   Keep expected data separate from assertions. Object comparisons should show which
   fields differ, with actual and expected values, rather than just a boolean failure.

   The current filter scenarios only specify region/category, not every transaction field.
   For these checks, compare objects using an explicit list of relevant fields:

   ```java
   assertThat(actualTransaction)
       .usingRecursiveComparison()
       .comparingOnlyFields("region", "category")
       .isEqualTo(expectedTransaction);
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

On macOS 27, Firefox may fail at launch with `Could not find profile folder` because the
system protects its default application-data directory. Give the Playwright Firefox process
a temporary CoreFoundation home instead:

```bash
mkdir -p "$TMPDIR/playwright-firefox-home"
CFFIXED_USER_HOME="$TMPDIR/playwright-firefox-home" \
  mvn -Dmaven.repo.local="$HOME/.m2/repository" \
  -Dtag=@ui -Dbrowser=firefox -Dheadless=true test
```

The separate Maven repository setting keeps dependencies in the usual cache.
macOS may protect the generated `Library` and `Downloads` folders in that temporary home;
let the system clean them up rather than changing their permissions.

| Problem                                 | What to check                                                           |
|-----------------------------------------|-------------------------------------------------------------------------|
| Maven will not start                    | JDK 25+ and Maven 3.9+ must be on `PATH`.                               |
| Connection refused or navigation fails  | Run `npm start` in `sales-analytics-qa-task/` and check port 3000.      |
| Browser executable is missing           | Repeat the Playwright browser installation command in Setup.            |
| Browser cannot launch without a desktop | Use `-Dheadless=true`.                                                  |
| Environment file cannot be found        | Use `-Denv=local` or add `src/main/resources/configs/{env}.properties`. |
