# Sales Analytics test automation

Java, Maven, Cucumber, and Playwright tests for the Sales Analytics demo. The Node.js application
under test is included in [`sales-analytics-qa-task/`](sales-analytics-qa-task/).

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

Surefire retries failing tests once. Override the count with:

```bash
mvn test -Dsurefire.rerunFailingTestsCount=2
```

## Configuration

`PropertyLoader` reads `src/main/resources/configs/{env}.properties`. The default environment is
`local`, and it is the only configuration file included:

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

API requests have a 30,000 ms timeout. Set `.timeout(milliseconds)` on `RequestOptionsBuilder`
to override it for a request; `0` disables the timeout.

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
  be/                            # API clients, services, request options, and response models
  fe/                            # Playwright session, pages, components, and controls
  lib/                           # Context, configuration, cleanup, and JSON utilities
src/main/resources/
  configs/                       # Environment configuration
  *.properties                   # Logging and Allure settings
src/test/java/io/materialspace/
  definitions/                   # Cucumber step definitions, hooks, and DI providers
  steps/                         # Test operations and assertions
  suites/                        # JUnit Platform suite entry points
src/test/resources/
  features/be/                   # API scenarios
  features/fe/                   # UI scenarios
  cucumber.properties            # Glue and report plugins
```

Cucumber 7 runs the Gherkin scenarios. Separate JUnit Platform suites select API and UI features;
`@api` and `@ui` tags select the relevant hooks. Step definitions call test operations, which use
API services or Page Objects. UI components and controls keep selectors out of the steps.
Playwright handles both browser interactions and HTTP requests; AssertJ handles assertions and
Jackson maps JSON responses.

PicoContainer provides scenario-scoped constructor injection. The API provider wraps
`PlaywrightApiClient` with `AllureApiClient`, so services do not need to call Allure themselves.
`PlaywrightSession` owns browser resources, and hooks handle setup and teardown. Cleanup closes
the browser context first to save HAR files, then the browser and Playwright. All cleanup actions
are attempted; the first error is rethrown and later errors are added as suppressed exceptions.
Hooks also preserve screenshot/API-client cleanup errors when session cleanup fails.

Allure's Cucumber adapter writes report results; Cucumber also writes the JSON report and
failed-scenario list.

## Planned improvements

Ideas for using the framework beyond this demo.

1. **Keep framework code separate from application code.**

   Keep Playwright sessions, controls, HTTP clients, reporting, and cleanup separate from
   Sales Analytics pages, services, and models. Framework code should not import application
   classes.

   One possible package layout:

   ```text
   framework/
     ui/                 # Browser session, controls, element initialization
     api/                # HTTP client contract and transport
     reporting/          # Allure integration
   salesanalytics/
     domain/             # Business concepts
     api/                # Transactions service and API models
     ui/                 # Pages and components
   ```

   Another project could then reuse the framework without copying Sales Analytics code.
   Packages in one project are enough to start with. Move the framework into a separate
   Maven module or shared library when another project actually needs it.

2. **Wire dependencies in providers.**

   Continue the current approach: providers create clients and reporting wrappers, then pass
   them to services and Page Objects. Services should not create their own HTTP clients,
   fetch dependencies from a global registry, or call Allure directly.

   For example, the API provider wires
   `PlaywrightApiClient → AllureApiClient → TransactionsService`.
   Add authentication or swap the HTTP client there, rather than changing every service.

   This also makes dependencies easier to replace in tests. Each provider should make clear
   how long its resources live and who closes them. Keep PicoContainer; another DI framework
   or service locator is not needed.

3. **Use a response model that does not depend on Playwright.**

   `ApiClient` hides the HTTP client, but `ApiResponse` still wraps a Playwright response.
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

4. **Handle authentication and user roles in providers.**

   Keep tokens and browser login state out of services and pages. Set them up in providers
   so each scenario does not need its own login or token-refresh code.

   A provider could create an API client for `Role.ANALYST` or a fresh browser context with
   that user's storage state. Most tests could skip UI login; login tests would still
   go through the real flow.

   Keep sessions isolated so different roles can run in parallel. Decide how to refresh
   expired tokens, allocate test users, and clean up saved login state. Never commit
   credentials, tokens, or storage state, or expose them in report attachments.
   The details will depend on how the application handles authentication and permissions.

5. **Manage test data outside test steps.**

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

6. **Give pages and components a clear API.**

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

7. **Declare UI elements with annotations.**

   Add a small initializer that reads annotations and creates controls and components.
   This would replace repeated constructor assignments such as
   `new Dropdown(root.locator("#region"))` with:

   ```java
   @FindBy("#region")
   private Dropdown regionDropdown;
   ```

   Keep the selector next to the field. Create locators relative to the parent component
   without looking up DOM elements during initialization, so Playwright's lazy resolution
   and auto-waiting still work. Errors should name the class and field, including unsupported
   field types. Do not use reflection to overwrite `final` fields.

   PicoContainer would still manage scenario dependencies; this initializer would only
   handle UI elements. The goal is less boilerplate in Page Objects, not another framework
   layer. Keep it small and test it separately.

8. **Make browser reuse configurable.**

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

## Troubleshooting

| Problem                                 | What to check                                                           |
|-----------------------------------------|-------------------------------------------------------------------------|
| Maven will not start                    | JDK 25+ and Maven 3.9+ must be on `PATH`.                               |
| Connection refused or navigation fails  | Run `npm start` in `sales-analytics-qa-task/` and check port 3000.      |
| Browser executable is missing           | Repeat the Playwright browser installation command in Setup.            |
| Browser cannot launch without a desktop | Use `-Dheadless=true`.                                                  |
| Environment file cannot be found        | Use `-Denv=local` or add `src/main/resources/configs/{env}.properties`. |
