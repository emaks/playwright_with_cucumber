# Framework contributor guide

This guide describes the framework as it exists today. Use it when adding tests or
framework code, and update it when an approved architecture change alters package
ownership, dependency flow, or resource lifecycle.

The repository contains test automation for a demo of the application under test.
`salesanalytics` represents one functional module of that application, not a separate app.
Keep additions small and follow the existing layers. Do not add a pattern, module, or
abstraction just because it might be useful to a hypothetical second consumer.

## Architecture at a glance

```text
Gherkin feature
  └── Sales Analytics Cucumber definition
        └── Sales Analytics test step
              ├── API service → framework ApiClient
              └── Page Object → component → framework control / Playwright

Cucumber test support
  ├── scenario-scoped context
  ├── API/UI hooks
  ├── API client provider
  └── shared parameter transformers
```

`BackendTests` and `FrontendTests` select the `features.be` and `features.fe` resource
packages. `cucumber.glue` scans `io.materialspace.testsupport.cucumber` and
`io.materialspace.salesanalytics.definitions`.

### Package ownership

| Package | Owns | Must not own |
|---------|------|--------------|
| `io.materialspace.framework.api` | API client contract, request options, response wrapper | Transactions endpoints, filters, or DTOs |
| `io.materialspace.framework.api.clients` | Playwright HTTP transport | Application service behavior |
| `io.materialspace.framework.reporting.allure` | Allure API decorator | Reporting calls from application services |
| `io.materialspace.framework.playwright` | Playwright, browser, browser context, and API context creation | Sales Analytics selectors or endpoint names |
| `io.materialspace.framework.ui` | Generic page wrapper and base page | Application pages and selectors |
| `io.materialspace.framework.ui.control` | Generic `Button`, `Dropdown`, and `Table` wrappers | Business assertions |
| `io.materialspace.framework.config`, `.json`, `.lifecycle` | Shared configuration, JSON, and cleanup utilities | Application-specific behavior |
| `io.materialspace.salesanalytics.api` | Sales Analytics module's transactions service, filters, request builder, and API models | Playwright lifecycle management |
| `io.materialspace.salesanalytics.ui` | Sales Analytics module's page and components | Cucumber glue |
| `io.materialspace.salesanalytics.steps` | Scenario operations and assertions for this module | Browser/client construction or Cucumber annotations |
| `io.materialspace.salesanalytics.definitions` | Gherkin bindings and application-specific table/parameter mappings | Shared Cucumber hooks and generic converters |
| `io.materialspace.testsupport.cucumber` | Shared Cucumber hooks, providers, and generic Jackson transformer | Transactions domain rules |
| `io.materialspace.testsupport.context` | Scenario-scoped state used by definitions | Framework production APIs |
| `io.materialspace.architecture` | ArchUnit rules that enforce package boundaries | Application behavior |

`framework` may use Playwright and its Allure integration. It must not depend on
`salesanalytics`, `testsupport`, Cucumber definitions, steps, or suite classes.
Application API services and UI pages may use `framework`; they must not depend on
`testsupport`. `ArchitectureTest` enforces these rules during `mvn test`.
The current application-side rule explicitly covers `salesanalytics.api` and
`salesanalytics.ui`. When another functional module is added, extend the rules to cover it
as well. The module should remain a sibling application package; it does not need its own
Maven module by default.

## API request flow

The current API path is:

```text
feature → API definition → API test step → TransactionsService
        → ApiClient (AllureApiClient → PlaywrightApiClient) → APIRequestContext
```

`ApiClientProvider` is the Cucumber-PicoContainer provider that builds the current
transport/reporting chain:

```java
return new AllureApiClient(
    new PlaywrightApiClient(playwrightSession.getNewAPIContext())
);
```

`TransactionsService` receives `ApiClient` through its constructor. Keep endpoint paths,
query parameter names, filters, and response DTOs in `salesanalytics.api`, not in
`framework`. Services should not construct clients, use a global registry, or call Allure.

Example of the current service pattern:

```java
public class TransactionsService {
    private static final String LIST_ENDPOINT = "transactions";
    private final ApiClient apiClient;

    public TransactionsService(ApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ApiResponse listTransactions(TransactionFilters filters) {
        return apiClient.get(
            LIST_ENDPOINT,
            RequestOptionsBuilder.builder()
                .region(filters.region())
                .category(filters.category())
                .build()
        );
    }
}
```

`RequestOptionsBuilder` maps application filters to the framework's `ApiRequestOptions`.
Omit unset filters rather than sending empty query values. The default request timeout is
30,000 ms; a request can override it with `.timeout(milliseconds)`, and `0` disables it.

`AllureApiClient` attaches request method, endpoint, query parameters, and timeout before
execution. On success it attaches the resolved URL and response details. On a transport
exception it attaches the stack trace and rethrows the same exception. Keep this behavior
in the decorator; do not duplicate it in services or step definitions.

**Current limitation:** `framework.api.ApiResponse` wraps Playwright's `APIResponse`.
The `ApiClient` contract is therefore not yet transport-independent. Do not assume a
different transport can be substituted without changing the response model.

## UI interaction flow

The current UI path is:

```text
feature → UI definition → UI test step → TransactionsPage
        → Filters / TransactionsGrid → generic controls → Playwright Locator
```

Application pages and components belong under `salesanalytics.ui`; generic controls
belong under `framework.ui.control`. Components receive a root `Locator` and scope their
selectors to it. Keep application selectors in the component, not in Cucumber steps.

Example component construction:

```java
public Filters(Locator root) {
    this.root = root;
    this.regionDropdown = new Dropdown(root.locator("#region"));
    this.applyButton = new Button(root.locator("#apply"));
}
```

Use the established page/component methods for synchronization. `TransactionsPage` waits
for the matching GET response when applying filters; `TransactionsGrid` waits for the
loading indicator. Do not add fixed sleeps. Page Objects own interactions, waits, and
reading UI state. Assertions and business expectations stay in `salesanalytics.steps.ui`.

**Current limitation:** UI controls are initialized explicitly in component constructors.
There is no annotation-based Page Factory or `@FindBy` initializer yet; that remains a
roadmap item.

## Cucumber definitions and test steps

- Put API/UI feature files under `src/test/resources/features/be` or `fe`, with the
  existing `@api` and `@ui` tags.
- Put application-specific glue in `salesanalytics.definitions.api` or `.ui`.
- Put scenario operations and assertions in `salesanalytics.steps.api` or `.ui`.
- Keep shared hooks, `ApiClientProvider`, `GeneralDefinitions`, and generic Jackson
  transformers in `testsupport.cucumber`.
- Keep `TransactionFilters`, `TransactionFilter`, and `TransactionsGrid.Column` mappings
  in `salesanalytics.definitions.ParameterTypeAdapter`.
- Use `testsupport.context.Context` only for scenario data shared between steps. It is
  test support, not a framework production API.

Cucumber-PicoContainer provides constructor injection and scenario scope. Prefer passing
dependencies through constructors. Do not introduce a service locator or manually create
another instance when the scenario container already owns that dependency.

For a new API scenario, add the application service/DTO only when needed, expose the
scenario operation through a step class, then add a Gherkin binding and feature. For a new
UI scenario, reuse the existing Page Object/components where possible; add a page or
component only for a real UI concept.

## Resource lifecycle and reporting

The current per-scenario lifecycle is intentional:

- The API provider creates an `APIRequestContext` through `PlaywrightSession`, wraps it in
  `PlaywrightApiClient`, then in `AllureApiClient`. The API `@After` hook closes the client
  before closing the Playwright session.
- The UI `@Before` hook initializes the scenario's `PageWrapper`. The UI `@After` hook
  attaches a screenshot when the scenario failed and the page is available, then closes the
  session.
- `PlaywrightSession.closeSession()` attempts to close `BrowserContext`, `Browser`, and
  `Playwright` in that order. Closing the context finalizes its HAR recording.
- `Cleanup.run(...)` attempts every cleanup action, rethrows the first runtime exception,
  and adds later cleanup exceptions as suppressed errors.

The current session stores one browser/context pair and reads `headless` through static
configuration. `getNewPage()` launches a new pair; the current hooks call it once per
scenario and close the session afterward. Browser reuse or multiple pages per session would
need an explicit lifecycle redesign; do not assume the current session already supports it.

On macOS 27, Playwright Firefox may need a temporary `CFFIXED_USER_HOME`; the verified
command is documented in README Troubleshooting. Do not change system permissions to work
around the OS-protected Firefox application-data folders.

## Configuration and commands

`framework.config.PropertyLoader` reads `configs/{env}.properties`. The checked-in `local`
configuration is `src/main/resources/configs/local.properties`; system properties override
the configured values. Current keys include:

```properties
ui.base.url=http://localhost:3000
api.base.url=http://localhost:3000/api
```

Run commands from the repository root:

```bash
mvn test
mvn test -Dtest=BackendTests
mvn test -Dtest=FrontendTests -Dheadless=true
mvn test -Dtag=@api
mvn test -Dtag=@ui -Dheadless=true
mvn test -Dheadless=true -Dthreads=2
```

Use `-Dbrowser=firefox` for Firefox and `-Denv=...` to select another configuration.
Surefire retries a failing test once; adjust `rerunFailingTestsCount` in `pom.xml` to
change the retry count.

## Change checklist for an automation agent

Before creating or editing framework code:

1. Identify whether the requested behavior belongs to shared `framework` infrastructure,
   Sales Analytics application code, or test-only support.
2. Read the relevant classes and existing scenario/test patterns. Do not infer missing
   business rules from names or examples.
3. If expected behavior, test data, language, or scope is unclear, ask the user instead of
   inventing it.
4. Make the smallest change that fits the existing dependency direction. Do not implement
   future-roadmap items unless the user selects them.
5. Add or update focused validation, run the smallest relevant command, and report actual
   results. Update the improvement plan only for tasks that were explicitly requested.
6. Write improvement plans and progress notes in Ukrainian while implementation is in
   progress. After all approved stages and validation are complete, translate the finished
   plan into English as a final documentation step. Follow another language if the user
   explicitly asks for it.

## Current roadmap and accepted decisions

Implemented: package separation between `framework`, `salesanalytics`, and `testsupport`;
provider-based API client/Allure wiring; and ArchUnit rules for the current package
boundaries.

Still planned: a separate Maven module when there is a second consumer, a transport-neutral
API response, stronger ArchUnit rules against direct test-runner dependencies, role-aware
authentication, owned test-data fixtures, a higher-level Page Object API, declarative UI
element initialization, browser reuse, and object-based assertions.

The user has explicitly rejected a type-safe scenario context refactor, larger
`PropertyLoader` changes, session closed/reinitialization guards, and decoupling the UI
filter component from `TransactionFilter`. Do not reintroduce those proposals without
asking first. The existing per-scenario browser lifecycle and one-module package split are
accepted for the current project.
