# Framework contributor guide

This guide describes the TypeScript framework as it exists today. Use it when adding tests
or framework code, and update it when an approved architecture change alters package
ownership, dependency flow, or resource lifecycle. Check the current code and tests before
extending it; this guide is not authorization to implement roadmap items.

The repository contains test automation for a demo of the application under test.
`salesanalytics` represents one functional module of that application, not a separate app.
Keep additions small and follow the existing layers. Do not add a pattern, module, or
abstraction just because it might be useful to a hypothetical second consumer.
## Architecture and ownership

```text
Gherkin feature
  └── salesanalytics definition
        └── salesanalytics test step
              ├── TransactionsService → framework API client
              └── TransactionsPage → components → framework controls → Playwright

Cucumber World / testsupport
  ├── scenario-scoped Context
  ├── API/UI hooks
  ├── API-client and UI-page providers
  └── shared parameter and status-code definitions
```

| TypeScript location | Responsibility | Must not own |
|---|---|---|
| `src/framework/api/` | API client contract, request options, response wrapper, Playwright transport | Application endpoints, filters, and DTOs |
| `src/framework/reporting/allure/` | API request/response reporting decorator | Reporting calls from application services |
| `src/framework/playwright/` | Browser and API request contexts; per-scenario resource ownership | Application selectors or endpoint names |
| `src/framework/ui/` | Page wrapper, base page, generic controls, PageFactory | Application pages and business assertions |
| `src/framework/config/`, `json/`, `lifecycle/`, `logging/` | Shared configuration, JSON conversion, cleanup, and logging | Application-specific behavior |
| `src/salesanalytics/api/` | Transactions service, filters, request builder, response model | Playwright resource construction |
| `src/salesanalytics/ui/` | Transactions page and application-specific components | Cucumber hooks or framework-wide controls |
| `src/salesanalytics/steps/` | Scenario operations and business assertions | Browser/client construction |
| `src/salesanalytics/definitions/` | Application Gherkin bindings and table/parameter mappings | Shared lifecycle or generic framework logic |
| `src/testsupport/` | Scenario Context, World, providers, hooks, and shared definitions | Sales Analytics business rules |

`framework` may depend on Playwright, Allure, and shared framework libraries. It must not
import `salesanalytics`, `testsupport`, or application test definitions. The application
API/UI packages may depend on `framework`, but not on `testsupport`. Run both
`npm run architecture` and `npm run test:unit` after changing package dependencies; the
architecture tests include a deliberately invalid import to verify the rule itself.
The rule also applies to indirect coupling: framework code must not reach application
code through dynamic imports, class names, or hidden reads of application-specific
resources.

The `salesanalytics` namespace represents one functional module of the application under
test. Do not make it a separate application or package/module without a new need and
explicit review. If a second application needs the framework, a separate npm package
requires its own review of dependency scopes, test-support placement, configuration
resources, public API, and versioning; the directory split alone is not a publishable
library.

## API services and reporting

The current request composition is:

```text
definition → API test step → TransactionsService
           → AllureApiClient → PlaywrightApiClient → APIRequestContext
```

`ApiClientProvider` creates the transport/reporting chain, and
`TransactionsService` receives its client through a constructor. Keep endpoints,
query-parameter mapping, and response decoding in `salesanalytics.api`; do not construct
Playwright clients in a service or add a provider for every ordinary class.

### Adding a provider

Add a provider only when creating a dependency needs configuration, a decorator, or
resource ownership that the `World` cannot express with a plain constructor call. Before
implementing one, define and agree with the user:

- the consumer and the dependency it needs;
- where its values come from (configuration, secrets, scenario data, or another
  dependency); never store secrets in code or report attachments;
- its lifetime (scenario by default; worker or another scope only when explicitly agreed);
- the single owner that closes or resets it, and the required cleanup order;
- whether it needs a decorator (for example reporting), another transport, or role-specific
  behavior.

Place reusable transport/reporting providers in `src/testsupport/cucumber/` and
application-specific providers next to that application's test glue. Return the narrowest
existing contract (for example `ApiClient`), compose decorators at the provider boundary,
and rethrow original errors. Pass dependencies through constructors; do not use static
state, global registries, or a service locator. Verify discovery, one instance per scope,
reporting, and cleanup after both passing and deliberately failing scenarios.

`ApiRequestOptions` copies request parameters and omits only `undefined` values; explicit
empty strings remain explicit query parameters. API timeout defaults to 30,000 ms; zero
disables the timeout. The response remains backed by Playwright's `APIResponse`—a
transport-neutral contract is a future roadmap item, not an assumed property.

`AllureApiClient` attaches request method, endpoint, query, and timeout before sending the
request. On success it attaches the resolved URL and response details. On transport
failure it attaches the error and rethrows; do not swallow the exception or duplicate
reporting in services/steps. Decimal response values use `decimal.js` with lossless JSON
parsing; do not convert them through JavaScript `number`.

## UI elements and PageFactory

Use the standard TypeScript decorator implementation in
`src/framework/ui/pagefactory/FindBy.ts`. TypeScript field types are not available to the
factory at runtime, so every decorated field explicitly declares its element kind and
constructor:

```ts
@FindBy({ selector: "#filters" })
class Filters {
  constructor(readonly root: Locator) {}
}

class TransactionsPage extends BasePage {
  @FindBy({ type: Filters })
  filtersComponent!: Filters;

  constructor(page: PageWrapper) {
    super(page);
  }
}
```

The component's class selector supplies the selector when the field omits one; a
field-level selector overrides it. Supported declarations are:

- `{ type: Constructor }` for a nested component or control.
- `{ locator: true }` for a raw `Locator` leaf.
- `{ listItem: Constructor }` for an async `LocatorList<T>`.

Component/list-item constructors must explicitly accept a Playwright `Locator`. Decorated
fields must be public instance fields; they must not be `readonly` or have an initializer.
The initializer would overwrite the value assigned by the factory. Call
`PageFactory.initElements(object, root)` only after the object's constructor has completed.
The Cucumber `UiPageProvider` follows this ordering. Factory setup creates parent-scoped
Locator objects and does not query or interact with the DOM.

Initialization is recursive: after a component is constructed from its parent-scoped
locator, its own decorated fields are initialized from that locator
(`page root → Filters → Dropdown/Button`). Existing controls (`Button`, `Dropdown`,
`Table`) are leaf elements only because they declare no decorated fields; a future
composite control can declare them without changing the mechanism. Undecorated fields,
including an explicit root `Locator`, are ignored. Invalid declarations (blank selector,
missing selector, non-constructor type, static/private field) and recursive component
cycles fail fast with the class, field, and selector in the error message. Do not add a
separate component marker, setters, static fields, or creation of elements by name.

`LocatorList<T>` deliberately is not a synchronous JavaScript array. Use `count()`,
`isEmpty()`, `get(index)`, or `snapshot()` and await the result. Every operation resolves
current matching locators; a snapshot retains its membership for that operation. As in the
Java implementation, positional locators do not promise stable element identity after
reordering or removal.

Keep application selectors in `salesanalytics.ui` components. Page Objects own UI actions,
synchronization, and reading state; business assertions stay in `salesanalytics.steps`.
Wait for the relevant response before triggering an action, check its method/path/status,
and use loading-state synchronization rather than fixed sleeps.

## Cucumber composition and scenario context

`TestWorld` is a scenario-scoped composition root. It constructs application services and
steps through explicit constructors and providers. The API provider creates only API
resources; the UI provider creates the browser page, wrapper, Page Object, and declarative
elements. Preserve this separation so API-only runs do not launch browsers.

Use the existing `Context` and `ContextKey` for data shared between steps in a scenario.
A type-safe replacement was rejected; do not reintroduce it as a refactoring. Keep
definitions thin and map Gherkin data tables through the explicit adapters in
`salesanalytics.definitions.ParameterTypeAdapter`. Preserve enum normalization,
transposition, and `<empty>` handling.

Current feature locations are `features/be/` and `features/fe/`. The `api` and `ui` profiles
select these paths and their tags; the unnamed profile selects all current application
features. Avoid modifying feature text or adding application coverage unless requested.
Runtime/worker behavior belongs in isolated `tests/acceptance/` fixtures, not in application
feature files.

## Lifecycle, cleanup, and artifacts

The current API and UI resource lifecycle is per scenario. API clients own and dispose
their API request context. UI cleanup closes the browser context before the browser so HAR
recording can finalize. Failed UI scenarios attempt a screenshot attachment before
cleanup. Preserve attachment errors and cleanup errors; cleanup must attempt every action
in order and must not hide a prior scenario failure.

Session closed-state guards, repeated-initialization guards, and idempotent close behavior
were explicitly rejected and reverted. Do not add them without a new request. Browser
reuse is not implemented; it would require an explicit lifecycle redesign.

All generated output must remain inside the repository root, primarily under `target/`,
`dist/`, and the Allure report directories. `npm run build` cleans these outputs.
The Allure CLI wrapper requires Java 8+ when generating HTML reports; the build and test
execution themselves do not use Java or Maven.

## Configuration and validation

Configuration is loaded from `resources/configs/{env}.json`; missing environment files
are errors. Process environment overrides the JSON file. The supported runtime variables
include `ENV`, `BROWSER`, `HEADLESS`, `PARALLEL`, `THREADS`, `RETRY`, and `TAG`; endpoint
overrides include `UI_BASE_URL` and `API_BASE_URL`. Cucumber CLI options can override
profile values. Defaults are local, Chromium, headed, one worker, and one retry.

From the repository root, use focused validation while developing, then run:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:acceptance
npm run architecture
npm run test:api
npm run test:ui
```

Before reporting full parity, run all five application scenarios, parallel acceptance,
retry/rerun checks, and Allure generation. Browser availability is host-dependent. On
macOS, Firefox may fail profile initialization with `Operation not permitted`; run it
with a temporary `CFFIXED_USER_HOME` as described in the README troubleshooting section.
Do not weaken system security to force a local pass.

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

## Decisions and roadmap constraints

The migration preserves package separation, `ApiClientProvider` composition, the current
UI component dependency on `salesanalytics.api.TransactionFilter`, the current
`PropertyLoader` behavior, and the per-scenario resource model. It does not add a provider
per class, another module, or layers for hypothetical consumers.

Implemented: package separation between `framework`, `salesanalytics`, and `testsupport`;
provider-based API client/Allure wiring; Dependency Cruiser rules for the current package
boundaries; and declarative UI element initialization.

Still planned: a separate framework package when there is a second consumer, a
transport-neutral API response, stronger architecture rules against direct test-runner
dependencies, role-aware authentication, owned test-data fixtures, a higher-level Page
Object API, browser reuse, and object-based assertions. These are roadmap items, not implementation authorization. A
type-safe `Context`, larger configuration redesign, session guards, and decoupling the
UI filter component from `TransactionFilter` are rejected proposals unless the user asks
to revisit them.

`TESTS_COVERAGE.md` remains a planning source, not evidence of implemented coverage. The
earlier Java-era improvement plans were removed after their still-relevant rules were
merged into this guide and the README; they remain in git history. New improvement plans
go in `improvements/` (see the framework-improvement-planner agent). See `../migration_ts.md` and
`stage-11-transfer-manifest.md` for the migration record and final transfer inventory.
