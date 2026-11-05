# Framework contributor guide

This guide describes the TypeScript framework as it exists today. Use it when adding tests
or framework code, and update it when an approved architecture change alters package
ownership, dependency flow, or resource lifecycle. Check the current code and tests before
extending it; this guide is not authorization to implement roadmap items.

Keep additions small and follow the existing layers. Do not add a pattern, module, or
abstraction just because it might be useful to a hypothetical second consumer. Planned and
rejected architecture work is tracked in the [architecture roadmap](roadmap.md).

## Contents

- [Architecture and ownership](#architecture-and-ownership)
- [API services and reporting](#api-services-and-reporting)
- [UI elements and PageFactory](#ui-elements-and-pagefactory)
- [Cucumber composition and scenario context](#cucumber-composition-and-scenario-context)
- [Common tasks](#common-tasks)
- [Lifecycle, cleanup, and artifacts](#lifecycle-cleanup-and-artifacts)
- [Configuration and validation](#configuration-and-validation)
- [Change checklist for an automation agent](#change-checklist-for-an-automation-agent)
- [Decisions and roadmap constraints](#decisions-and-roadmap-constraints)

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

| Location                                                   | Responsibility                                                                   | Must not own                                |
|------------------------------------------------------------|----------------------------------------------------------------------------------|---------------------------------------------|
| `src/framework/api/`                                       | API client contract, request options, response wrapper, Playwright transport     | Application endpoints, filters, and DTOs    |
| `src/framework/reporting/allure/`                          | API request/response reporting decorator                                         | Reporting calls from application services   |
| `src/framework/playwright/`                                | Browser and API request contexts; per-scenario resource ownership                | Application selectors or endpoint names     |
| `src/framework/ui/`                                        | Page wrapper, base page, generic controls, PageFactory                           | Application pages and business assertions   |
| `src/framework/config/`, `json/`, `lifecycle/`, `logging/` | Shared configuration, lossless JSON decoding (`JsonCodec`), cleanup, and logging | Application-specific behavior               |
| `src/salesanalytics/api/`                                  | Transactions service, filters, request builder, response model                   | Playwright resource construction            |
| `src/salesanalytics/ui/`                                   | Transactions page and application-specific components                            | Cucumber hooks or framework-wide controls   |
| `src/salesanalytics/steps/`                                | Scenario operations and business assertions                                      | Browser/client construction                 |
| `src/salesanalytics/definitions/`                          | Application Gherkin bindings and table/parameter mappings                        | Shared lifecycle or generic framework logic |
| `src/testsupport/`                                         | Scenario Context, World, providers, hooks, and shared definitions                | Sales Analytics business rules              |

`framework` may depend on Playwright, Allure, and shared framework libraries. It must not
import `salesanalytics`, `testsupport`, or application test definitions. The application
API/UI packages may depend on `framework`, but not on `testsupport`. Run both
`npm run architecture` and `npm run test:unit` after changing package dependencies; the
architecture tests include a deliberately invalid import to verify the rule itself.
The rule also applies to indirect coupling: framework code must not reach application
code through dynamic imports, class names, or hidden reads of application-specific
resources.

`src/salesanalytics/` represents one functional module of the application under test, not
a separate application. Do not split it into a separate application or package without a
new need and explicit review. If a second application needs the framework, a separate npm package
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
query-parameter mapping, and response decoding in `src/salesanalytics/api/`; do not construct
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

Other API behavior to preserve:

- `PlaywrightSession` appends a trailing `/` to `api.base.url`, so relative endpoints such as
  `transactions` keep the `/api` prefix.
- A request timeout must be finite and non-negative; invalid values fail fast.
- Responses are decoded by explicit decoder functions with field-level error messages. Do
  not cast parsed JSON with a blanket `as T`, and do not add schema rejection rules that the
  API contract does not require (unknown fields are ignored).
- Filter assertions require a non-empty result before checking every returned
  region/category value, so an empty response or grid cannot pass a filter test.

## UI elements and PageFactory

Use the standard TypeScript decorator implementation in
`src/framework/ui/pagefactory/FindBy.ts`. TypeScript field types are not available to the
factory at runtime, so every decorated field explicitly declares its element kind and
constructor:

```ts

@FindBy({selector: "#filters"})
class Filters {
    constructor(readonly root: Locator) {
    }
}

class TransactionsPage extends BasePage {
    @FindBy({type: Filters})
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
The initializer would overwrite the value assigned by the factory. The custom ESLint rule
`framework/no-readonly-findby-fields` (`npm run lint`) rejects `readonly` decorated fields. Call
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
current matching locators; a snapshot retains its membership for that operation.
Positional locators do not promise stable element identity after reordering or removal.

Keep application selectors in `src/salesanalytics/ui/` components. Page Objects own UI
actions, synchronization, and reading state; business assertions stay in
`src/salesanalytics/steps/`.
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
`src/salesanalytics/definitions/ParameterTypeAdapter.ts`. Preserve enum normalization,
transposition, and `<empty>` handling.

Current feature locations are `features/be/` and `features/fe/`. The `api` and `ui` profiles
select these paths and their tags; the unnamed profile selects all current application
features. Avoid modifying feature text or adding application coverage unless requested.
Runtime/worker behavior belongs in isolated `tests/acceptance/` fixtures, not in application
feature files.

## Common tasks

These recipes follow the existing Sales Analytics code. Ask the user for expected behavior,
test data, and assertions before adding coverage; do not infer them.

**Add an API endpoint call**

1. Add a method to the service in `src/salesanalytics/api/` (see `TransactionsService`).
   Use a relative endpoint (`"transactions"`, no leading `/`) and build query parameters
   with `RequestOptionsBuilder`.
2. Model the response in `src/salesanalytics/api/models/` with an explicit decoder built
   from the `src/framework/json/JsonCodec.ts` helpers (`readDecimal`,
   `readLosslessInteger`, and similar).
3. Receive the service's `ApiClient` through its constructor; `TestWorld.initializeApi()`
   wires it with the client from `ApiClientProvider`. Do not create Playwright clients.
4. Add a unit test in `tests/framework/` for decoding and parameter mapping.

**Add a page or component**

1. Create the class in `src/salesanalytics/ui/` (pages) or `src/salesanalytics/ui/component/`
   (components) with a constructor that accepts a `Locator` (components) or `PageWrapper`
   (pages extending `BasePage`).
2. Declare elements with `@FindBy` and an explicit `type`, `locator: true`, or `listItem`.
   Reuse `Button`, `Dropdown`, and `Table` from `src/framework/ui/control/`.
3. Expose business-level operations (for example `select(...)`, `apply()`); keep
   synchronization in the Page Object and assertions in steps.
4. Wire a new page through `UiPageProvider` so `PageFactory.initElements` runs after
   construction.

**Add a Gherkin step**

1. Put the binding in `src/salesanalytics/definitions/api/` or `.../ui/`; `cucumber.mjs`
   imports compiled definitions from `dist/src/salesanalytics/definitions/` and
   `dist/src/testsupport/`, so new files are discovered automatically.
2. Keep the definition thin: map table data through `ParameterTypeAdapter`, call a method on
   the steps class from `this.requireApiSteps()` / `this.requireUiSteps()`, and type `this`
   as `TestWorld`.
3. Put scenario logic and assertions in `src/salesanalytics/steps/`. Keep the non-empty
   result checks for filter assertions.

**Share data between steps**

Add a member to `ContextKey` (`src/testsupport/context/ContextKey.ts`), store it with
`this.context.set(...)`, and read it with `this.context.get<T>(...)`. Fail with a clear
message when the value is missing. The `Context` is scenario-scoped; do not use module-level
variables to share state.

## Lifecycle, cleanup, and artifacts

The current API and UI resource lifecycle is per scenario. API clients own and dispose
their API request context. UI cleanup closes the browser context before the browser so HAR
recording can finalize. Failed UI scenarios attempt a screenshot attachment before
cleanup. Preserve attachment errors and cleanup errors; cleanup must attempt every action
in order and must not hide a prior scenario failure.

Logging uses Pino (`src/framework/logging/Logger.ts`; level from `LOG_LEVEL`). Its redaction
list hides authorization, cookie, password, token, and secret values; extend it rather than
logging credentials.

Browser reuse is not implemented; it would require an explicit lifecycle redesign (see
[roadmap](roadmap.md) item 10). Session guards are rejected; see
[Decisions and roadmap constraints](#decisions-and-roadmap-constraints).

All generated output must remain inside the repository root, primarily under `target/`,
`dist/`, and the Allure report directories. `npm run build` cleans these outputs.
The Allure CLI wrapper requires a Java runtime (8+) when generating HTML reports; the build
and test execution themselves do not need it.

## Configuration and validation

Configuration is loaded from `resources/configs/{env}.json`; missing environment files
are errors. Process environment overrides the JSON file. The supported runtime variables
include `ENV`, `BROWSER`, `HEADLESS`, `PARALLEL`, `RETRY`, and `TAG`; endpoint
overrides include `UI_BASE_URL` and `API_BASE_URL`. Cucumber CLI options can override
profile values. Defaults are local, Chromium, headed, one worker, and one retry.

From the repository root, use focused validation while developing:

```bash
npm run typecheck
npm run lint
npm run architecture
npm run test:unit
npm run test:api              # or test:ui, depending on the change
```

Before reporting a change as complete, run the full verification with the application
running:

```bash
npm run test:acceptance       # parallel overlap, retry, rerun, and reporting fixtures
npm run cucumber              # all application scenarios
npm run test:parallel         # all scenarios with two workers
npm run test:rerun            # failed-only rerun; skips when nothing failed
npm run allure:generate       # requires a Java runtime
```

Run `npm run test:rerun` before any `npm run build`, because build cleans `target/`. Browser
availability is host-dependent. On
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

The full list of planned architecture work, with implementation status, is in
[`roadmap.md`](roadmap.md). Roadmap items are not implementation authorization.

The current design keeps package separation, `ApiClientProvider` composition, the
UI component dependency on `src/salesanalytics/api/TransactionFilter.ts`, the current
`PropertyLoader` behavior, and the per-scenario resource model. Do not add a provider per
class, another module, or layers for hypothetical consumers.

Rejected proposals, not to be reintroduced unless the user asks to revisit them:

- a type-safe `Context` replacement;
- a larger configuration redesign;
- session closed-state guards, repeated-initialization guards, and idempotent close
  behavior (explicitly rejected and reverted);
- decoupling the UI filter component from `TransactionFilter`.

`TESTS_COVERAGE.md` is a planning source, not evidence of implemented coverage. New
improvement plans go in `improvements/` (see the framework-improvement-planner agent).
