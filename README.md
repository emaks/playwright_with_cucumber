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

## Troubleshooting

| Problem                                 | What to check                                                           |
|-----------------------------------------|-------------------------------------------------------------------------|
| Maven will not start                    | JDK 25+ and Maven 3.9+ must be on `PATH`.                               |
| Connection refused or navigation fails  | Run `npm start` in `sales-analytics-qa-task/` and check port 3000.      |
| Browser executable is missing           | Repeat the Playwright browser installation command in Setup.            |
| Browser cannot launch without a desktop | Use `-Dheadless=true`.                                                  |
| Environment file cannot be found        | Use `-Denv=local` or add `src/main/resources/configs/{env}.properties`. |
