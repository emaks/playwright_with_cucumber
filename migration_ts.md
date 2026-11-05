# Migration to TypeScript + Playwright + Cucumber + Allure

## Status and scope

**Status:** complete. Stages 2–11 are implemented and verified. The TypeScript framework is
now the sole implementation at the repository root; the Java implementation was deleted in
stage 11 and remains available in git history. Firefox UI passes with the documented
`CFFIXED_USER_HOME` workaround on macOS.

The user approved implementation through stages 2–10, accepted recommendations D1–D11, and
then explicitly approved stage 11 (Java deletion and root transfer). The application under
test remains unchanged. The rules below applied while the work was staged.

- New implementation, configuration, dependencies, local documentation, tests, and
  generated outputs stay under `typescript_framework/`.
- This migration record stays at the repository root as explicitly requested.
- The Java implementation remains the comparison baseline pending separate final review.
- Both implementations use `sales-analytics-qa-task/` without changing the application.
- Before stage 11, do not edit root `pom.xml`, `src/`, `.gitignore`, README, or existing
  documentation. Add staging-specific ignore rules and instructions inside
  `typescript_framework/`.
- Do not change other projects, system settings, or globally installed tools. Ask before
  any action outside the repository or any system-level change.
- The old `ui-automation-testing` project was reviewed only as an example. Do not copy its
  Protractor dependencies, global browser, file-based service locator, or fixed sleeps.
- Do not add business coverage from `TESTS_COVERAGE.md`; migrate only implemented behavior.
- Do not commit or push unless explicitly asked.

## Completion rules

`[ ]` means incomplete; `[x]` means completed and verified. Acceptance criteria are
mandatory; code existing by itself does not complete a stage.

After each stage:

1. Check only work actually completed and validated.
2. Record changed files, changes, commands, actual results, and blockers in the journal.
3. Explain preserved Java behavior and necessary language/tooling differences.
4. Record unresolved checks and the next action.
5. Ask before making any new decision that affects behavior or architecture.

The plan and progress notes were kept in Ukrainian while implementation was underway.
After the approved work and its available validation were completed, this record was
translated to English. Stage 11 was executed after separate explicit approval.

## 0. Inspected baseline

- [x] Review Maven dependencies, suites, hooks, configuration, and contributor guide.
- [x] Review API contracts/client, Allure decorator, models, builders, and steps.
- [x] Review UI wrappers/pages/components, PageFactory, lazy lists, and tests.
- [x] Review both feature files and ArchUnit rules.
- [x] Review `initChild()` and `ElementsArray` in the old TypeScript project.
- [x] Receive approval for the plan and D1–D11.
- [x] Run an isolated Java baseline under `typescript_framework/baseline/java`.

Current dependency flow:

```text
Gherkin -> definitions -> steps
                          |-> TransactionsService -> AllureApiClient -> PlaywrightApiClient
                          |-> TransactionsPage -> components -> controls -> Locator

testsupport -> scenario context, Cucumber hooks, providers, converters
framework   -> reusable infrastructure; no application/testsupport dependency
```

The baseline contains two API and three UI scenarios: **five executable scenarios**.
Also migrate existing controls, filters, builders, and methods not currently used by a
feature.

| Area | Behavior to preserve |
|---|---|
| Execution | API/UI suites and tag expressions; one worker and one retry by default |
| Browsers | Chromium and Firefox; `headless=false`; 1790 × 1120 viewport |
| Timeouts | UI 10,000 ms; API 30,000 ms; request timeout `0` disables the timeout |
| API URL | Normalize the trailing `/`; preserve `/api` when requesting `transactions` |
| Request options | Omit absent filters; preserve explicit empty string; finite non-negative timeout |
| Assertions | Require non-empty results and verify all returned region/category values |
| UI synchronization | Wait for the relevant GET before triggering; check HTTP status and loading state |
| Resources | Scenario-scoped lifecycle; dispose API; close context before browser |
| Cleanup | Attempt every action; preserve the first and later errors; never turn failure into success |
| Allure | Attach request before transport, URL/response after, stack trace on transport failure |
| Artifacts | Failed-UI screenshot when a page exists; unique HAR; Environment; Cucumber JSON |
| Layering | Framework cannot import application/testsupport; application API/UI cannot import testsupport |

The root documentation mentions a failed-scenario list, but the Java
`cucumber.properties` has no rerun formatter. TypeScript rerun support is an explicitly
approved capability, not a claim about existing Java output.

## 1. Approved decisions (D1–D11)

The user approved the recommendations below. Concrete package versions were selected by
checking Node engine requirements and peer dependencies, then pinned in the lockfile.

| ID | Approved choice |
|---|---|
| D1 | Node.js, npm, ESM, strict TypeScript, compile with `tsc` before execution |
| D2 | Declarative `@FindBy` using standard TypeScript decorators, explicit constructors, and a small owned PageFactory |
| D3 | `node:assert/strict` and `node:test` for infrastructure tests |
| D4 | Cucumber World as scenario composition root, small providers, constructor injection |
| D5 | JSON environment files, thin loader, process/CLI overrides, documented Java-key mapping |
| D6 | Explicit converters/decoders; no blanket `as T` or new schema rejection rules |
| D7 | `decimal.js` plus `lossless-json` for precise decimal handling |
| D8 | Pino logging with credential redaction |
| D9 | Dependency Cruiser for the two existing ArchUnit boundaries; ESLint for TypeScript |
| D10 | Default parallelism 1, retry 1, CLI overrides, rerun formatter/script |
| D11 | `allure-cucumberjs`, `allure-js-commons`, project-local CLI, and single-file report |

The final tested toolchain is Node `26.0.0`, npm `11.12.1`, Cucumber `13.3.0`, Playwright
`1.64.1`, TypeScript `5.9.3`, ESLint `10.14.0`, and `typescript-eslint` `8.72.1`.
`package.json` supports Node `^24.0.0 || >=26.0.0`. Allure's CLI wrapper additionally
requires Java 8+ to generate HTML; compiling and running the TypeScript tests does not
require Maven or the Java framework.

## 2. Baseline and standalone TypeScript skeleton

**Prerequisite:** approved D1 and overall plan.

- [x] Check available Node/npm/Java/Maven and worktree without altering unrelated changes.
- [x] Keep the Java baseline copy and outputs inside `typescript_framework/`, not root `target/`.
- [x] Run both Java API/UI suites against the unchanged application and record five scenarios,
  browser, tags, timeouts, and actual results; do not silently fix baseline/application defects.
- [x] Run and retain baseline PageFactory and architecture test results.
- [x] Create TypeScript package manifest/lockfile, tsconfig, local `.gitignore`, and README.
- [x] Add build/typecheck/lint/unit/Cucumber scripts rooted in the TypeScript directory.
- [x] Keep all project outputs inside the staging directory.
- [x] Copy feature files without editing text, tags, or Examples.
- [x] Verify dry-run discovery finds exactly five scenarios.
- [x] Verify clean install and skeleton compilation without globally installing tools.

Target structure before the final transfer:

```text
typescript_framework/
  package.json, package-lock.json, tsconfig.json, cucumber.mjs, .gitignore, README.md
  src/{framework,salesanalytics,testsupport}/
  resources/configs/
  features/{be,fe}/
  tests/{architecture,framework,acceptance}/
  scripts/
  dist/                 # generated, ignored
  target/               # generated, ignored; baseline/results/HAR/rerun
  allure-report/         # generated, ignored
```

**Acceptance:** the TypeScript project installs/compiles independently; Java baseline is
recorded or its blocker is approved; feature discovery is unchanged.

## 3. Configuration, JSON, decimal, cleanup, and logging

**Prerequisite:** stage 2; approved D5–D8.

- [x] Migrate environment selection, defaults, and override precedence.
- [x] Preserve `local` values and expose effective Cucumber CLI values in Allure Environment.
- [x] Fail explicitly for a missing environment file; do not silently fall back to local.
- [x] Migrate JSON serialization/conversion, including empty, null, omitted, and supported numeric values.
- [x] Match the Jackson contract without adding unapproved schema rejection.
- [x] Verify decimal parsing/serialization without rounding through JavaScript `number`.
- [x] Make cleanup asynchronous while preserving order, primary error, and later errors.
- [x] Configure logging without leaking secrets or hiding failures.
- [x] Test overrides, missing environment, invalid timeout, nullable/empty values, decimal precision,
  multiple cleanup failures, and success.

**Acceptance:** configuration is equivalent in meaning, decimal precision is preserved,
and cleanup attempts every action without masking failures.

## 4. Playwright session and API framework

**Prerequisite:** stage 3.

- [x] Migrate scenario-scoped `PlaywrightSession`.
- [x] Preserve Chromium/Firefox, headed default, viewport, and UI timeout.
- [x] Create `APIRequestContext` without launching a browser for API-only scenarios.
- [x] Preserve URL normalization, API default timeout, and per-request override.
- [x] Migrate `ApiClient`, `ApiRequestOptions`, and Playwright-backed `ApiResponse` using Promises.
- [x] Do not implement the deferred transport-neutral response roadmap item.
- [x] Preserve defensive parameter copies and omission semantics.
- [x] Migrate `AllureApiClient -> PlaywrightApiClient` composition.
- [x] Dispose API context through the client; close UI context before browser; avoid duplicate ownership.
- [x] Use unique HAR paths per scenario attempt.
- [x] Test URL resolution, query parameters, timeout `0`, HTTP response, transport failure,
  partial initialization, and cleanup failure.

**Acceptance:** API-only runs do not launch browsers; `/api/transactions`, success/error behavior,
and cleanup ordering are preserved.

## 5. `@FindBy`, PageFactory, and lazy collections

**Prerequisite:** stage 4; approved D2.

First prove the decorators in the real toolchain. Do not automatically replace them with
`initChild()` if the prototype fails.

- [x] Verify modern decorators, field/accessor initialization, and inheritance.
- [x] Define initialization after `PageWrapper`/component construction, avoiding superclass
  initialization that would be overwritten by subclass fields.
- [x] Implement class-selector metadata and explicit constructor references for fields.
- [x] Preserve field-selector precedence and class-selector fallback.
- [x] Document that TypeScript does not retain ordinary field types at runtime; fallback fields
  need explicit declaration/constructor metadata.
- [x] Implement raw `Locator` leaves and nested wrappers/components with parent-scoped selectors.
- [x] Perform no DOM reads/actions during factory initialization.
- [x] Use a dedicated async typed collection API, not a fake synchronous JavaScript array.
- [x] Verify snapshot membership after DOM insertion; do not promise node identity across
  reorder/removal of positional locators.
- [x] Verify inherited metadata does not leak to sibling subclasses.
- [x] Preserve cycle diagnostics with field chain, selector, and reason.
- [x] Reject invalid declarations using actual TypeScript compile-time/runtime checks instead of
  nonexistent reflection checks for Java final/raw/wildcard declarations.
- [x] Migrate PageFactory behavior tests to async TypeScript APIs, including real Chromium DOM tests.

**Acceptance:** typed components initialize without DOM queries; precedence, nested scoping,
collections, and diagnostics are tested; decorators need no hidden globals, `as any`, or
unsupported compiler flags.

## 6. Sales Analytics API/UI and test steps

**Prerequisite:** stage 5; approved D3.

- [x] Migrate `TransactionFilter`, `TransactionFilters`, and `RequestOptionsBuilder`.
- [x] Migrate `TransactionsResponse`, metadata/filter fields, and decimal revenue.
- [x] Migrate `TransactionsService` without Allure/Cucumber dependencies.
- [x] Migrate `PageWrapper`, `BasePage`, `Button`, `Dropdown`, and `Table`.
- [x] Migrate `TransactionsPage`, `Filters`, and `TransactionsGrid`, including all current methods.
- [x] Preserve selectors, header mapping, trimming, select-by-value, Apply, and Clear.
- [x] Register response wait before click; verify endpoint, GET, and HTTP status.
- [x] Preserve loading synchronization without sleeps; describe and separately approve any baseline race.
- [x] Migrate API/UI steps; keep assertions in steps, not controls/services.
- [x] Verify positive/negative paths, non-empty results, and every filter value.
- [x] Compare public Java/TypeScript operations; do not omit methods unused by features.

**Acceptance:** application layer is functionally equivalent; API/UI operations do not know
about lifecycle/container; business assertions remain in the test layer.

## 7. Cucumber World, definitions, hooks, and profiles

**Prerequisite:** stage 6; approved D4.

- [x] Create scenario-scoped World/providers with constructor injection in ordinary classes.
- [x] Preserve the role of `Context`/`ContextKey`; do not redesign scenario state.
- [x] Respect async initialization and wait until the page is ready before PageFactory/provider wiring.
- [x] Do not create API/browser resources a scenario does not need.
- [x] Migrate definitions without changing Gherkin expressions.
- [x] Replace JVM DataTable transformers with explicit JS adapters preserving transposition,
  case-insensitive enum names, and `<empty>`.
- [x] Migrate shared status-code definition and `@api`/`@ui` hooks.
- [x] Define mixed-tag behavior without double disposal; current features have one scenario type each.
- [x] Add API/UI path profiles, tag overrides, and default all-scenarios profile.
- [x] Preserve Cucumber JSON/summary and disable external publishing.
- [x] Verify dry-run and serial execution of all five scenarios.

**Acceptance:** API=2, UI=3, all=5; no undefined/ambiguous bindings; World/resources are
not shared across scenarios.

## 8. Allure and artifacts

**Prerequisite:** stage 7; approved D11.

- [x] Configure compatible Cucumber formatter and Allure runtime.
- [x] Attach request before transport, URL/response after, and failure stack trace before rethrow.
- [x] Attach screenshot only for failed UI scenarios with an available page, before cleanup.
- [x] Verify attachment/cleanup error preservation through the shared cleanup contract and hooks.
- [x] Write effective Environment once, without concurrent worker overwrites.
- [x] Check tags/labels/links without inventing Java-absent Jira/TestRail mappings.
- [x] Add report generation/opening and verify the single-file command.
- [x] Keep Java baseline and TypeScript results separate.
- [x] Verify attachment contents/files, JSON validity, and generated report.

**Acceptance:** reports contain the required data; reporting errors are not hidden; HAR
finalization and screenshots are verified as files.

## 9. Parallelism, retries, and failed-only rerun

**Prerequisite:** stage 8; approved D10.

- [x] Implement defaults `parallel=1` / `retry=1` and CLI overrides.
- [x] Add controlled acceptance fixtures under `tests/acceptance/`, not application features.
- [x] Prove actual overlap of at least two scenario execution intervals.
- [x] Prove World/context/page/API isolation and no attachment/HAR collisions.
- [x] Test failed-first/passed-second: exactly two attempts, fresh resources, repeated hooks.
- [x] Test permanent failure: at most retry+1 attempts and non-zero exit.
- [x] Test `retry=0`; no retry-specific tag filter was selected (D10 keeps global retry).
- [x] Test failed UI screenshots and distinct HAR per attempt.
- [x] Verify Allure retry grouping: same logical test identity/history across attempts.
- [x] Add rerun formatter and verify failed-only selection of one Scenario Outline row.
- [x] Use a rerun filename beginning with `@`, e.g. `target/@rerun.txt`.
- [x] Verify absent/empty rerun selects zero scenarios, not the all-scenarios profile.
- [x] Do not chain rerun after a failing main run with `&&`; preserve exit codes deliberately.
- [x] Run parallel+retry together and verify report/cleanup.

**Acceptance:** concurrency, isolation, attempt count, failed-only selection, and exit codes
are demonstrated; synthetic failures do not pollute the main Allure report.

## 10. Architecture, documentation, and parity

**Prerequisite:** stage 9; approved D9.

- [x] Reproduce the two existing ArchUnit import boundaries.
- [x] Prove a deliberate invalid import is rejected; a positive run alone is insufficient.
- [x] Run typecheck, lint, unit/integration/acceptance tests.
- [x] Run API and Chromium UI serially; run the full suite in parallel. API and Chromium pass
  in the required profiles.
- [x] Run Firefox UI serially and in parallel; passes on macOS with a temporary
  `CFFIXED_USER_HOME` (verified during stage 11, see journal).
- [x] Verify headed default, headless override, tags, and suite profiles.
- [x] Compare Java/TypeScript scenario names, tags, filters, counts, status, and assertions.
- [x] Compare report meaning without requiring identical timestamps/UUIDs/layout.
- [x] Create local README/contributor guide for setup, config mapping, PageFactory, lifecycle,
  commands, retries, rerun, reports, and troubleshooting.
- [x] Do not claim tests ran based only on compile/dry-run.
- [x] Verify clean install without global npm tools and project outputs outside staging.
- [x] Prepare exact transfer manifest and Java-only deletion-path inventory.
- [x] Map existing roadmap documents without losing unresolved decisions.
- [x] Prepare review summary, differences, blockers, and verification commands.

**Acceptance:** all checks pass or exceptions are explicit; TypeScript runs autonomously;
Java remains undeleted; the next stage has an exact manifest.

## 11. Final review and transfer to repository root

**Separate approval gate:** do not begin until the user explicitly approves the completed
implementation and manifest. Review of this plan is not approval for stage 11.

- [x] Obtain explicit approval to delete Java and move TypeScript.
- [x] Recheck current worktree and conflicts with root files.
- [x] Preserve reachable Git history for Java; do not run destructive rollback commands.
- [x] Transfer only approved manifest files; exclude `node_modules`, baseline, dist, HAR,
  results, and Allure reports.
- [x] Delete only specifically approved Java source/resource/build paths; do not recursively
  remove root or `src/` without a fresh inventory.
- [x] Move TypeScript configuration/resources/features/scripts and update cwd-relative paths.
- [x] Merge root `.gitignore`, README, contributor guide, and roadmap docs while preserving
  independent materials and `sales-analytics-qa-task/`.
- [x] Preserve `TESTS_COVERAGE.md` unless review decides otherwise; it is a business test plan,
  not Java implementation.
- [x] Repeat install/build/typecheck/lint/tests, API/UI, parallel+retry, rerun, and Allure from root.
- [x] Remove only known temporary files created by the approved transfer.
- [x] Remove the staging directory only after proving no required files remain.
- [x] Finish the journal and record actual results/approved differences.
- [x] Translate completed documentation as required.

**Acceptance:** root is the sole TypeScript framework; Java is deleted only after review;
commands/reports work from the new location; the application is unchanged.

## Blockers and confirmation rule

If data is missing, stop only the dependent action, record the blocker, and ask a specific
question with options. Continue independent approved work.

Ask before changing assertions, synchronization, lifecycle/timeouts, decimal/JSON behavior,
element declaration style, Firefox/single-file/retry/rerun support, existing methods,
pre-existing Java/application defects, CI, external/system/global changes, or the final
Java deletion/root transfer.

Resolved blocker: Firefox 157.0 could not initialize its profile on this macOS host with the
default CoreFoundation home. Running with `CFFIXED_USER_HOME="$TMPDIR/playwright-firefox-home"`
(the workaround already documented for Java) resolves it without weakening system security.

## Execution journal

### 2026-11-05 — plan preparation

- **Done:** read-only review of the current implementation and old TypeScript example;
  created the staged plan, checklist, gates, and acceptance criteria.
- **Reasoning:** preserve logical layers; replacing JVM DI/reflection/runner mechanisms is
  a necessary language adaptation, not permission to implement unrelated roadmap ideas.
- **Findings:** `BigDecimal` precision needs a deliberate choice; TypeScript cannot discover
  ordinary field types at runtime; lazy collection operations become async; Java
  `BasePage` initialization order cannot be copied literally; Java docs mention rerun but
  its Cucumber config has no rerun formatter.
- **Verification:** source/config review only. No tests, builds, install, or report generation.
  Java and application were not changed.
- **Blocker/next:** await user review/approval of D1–D11; then stage 2. Stage 11 remains separate.

### 2026-11-05 — stage 2: baseline and TypeScript skeleton

- **Approved decisions:** D1–D11: Node ESM/strict TypeScript, standard decorators,
  `node:test`, World composition root, JSON config, lossless decimals, Pino, Dependency
  Cruiser, and Allure Cucumber.js. Initial dependency selection was checked against engines
  and peers; ESLint 9.39.5 was used because the then-pinned `typescript-eslint@8.46.4`
  peer range excluded ESLint 10. Stage 10 later refreshed these pins after checking current
  supported releases.
- **Checklist:** every stage-2 item completed.
- **Files:** TypeScript package/lock, tsconfig, local ignore/config, Cucumber/ESLint config,
  initial README, local config, clean script, smoke test, copied feature files, and isolated
  Java baseline under `baseline/java/`.
- **Changes/behavior:** created a standalone project with local dependency/output paths;
  copied Gherkin unchanged; did not change Java or the application.
- **Java parity:** same two API and three UI scenarios against the local app, headless
  Chromium; retained Java config and reports in `baseline/java/`.
- **Verification (cwd noted):**
  - `mvn -B test -Dheadless=true`, `typescript_framework/baseline/java`: BUILD SUCCESS;
    5/5 scenarios passed; ArchitectureTest 2/2 and PageFactoryTest 11/11 passed.
  - `npm ci --no-audit --no-fund`, build/lint/unit, `typescript_framework`: clean install,
    compilation/lint, and initial smoke test 1/1 passed.
  - Cucumber dry-run found five scenarios (18 TS summary steps); Java baseline summary
    showed 26 steps. The count difference was to be revisited after migration.
  - Runtime: Node 26.0.0, npm 11.12.1, Java 27.0.1, Maven 3.10.0; local API returned HTTP 200.
- **Differences/issues:** architecture command was not yet applicable before its config existed;
  the initial lint had no TS files, so a runtime smoke test was added. ESLint 9 later emitted
  a deprecation warning and was upgraded in stage 10.
- **Status/next:** complete; stage 3.

### 2026-11-05 — stage 3: config, JSON/decimal, cleanup, logging

- **Decisions:** JSON `configs/{env}.json`; runtime overrides above file values; explicit
  decoders; `Decimal` + `lossless-json`; asynchronous ordered cleanup with primary and
  suppressed errors; Pino credential redaction.
- **Checklist:** config loader/missing-file error, JSON helpers/contract, lossless decimal,
  cleanup/logging, and focused unit tests.
- **Files:** `PropertyLoader.ts`, `ObjectMapperUtils.ts`, `Cleanup.ts`, `Logger.ts`,
  `config-json-cleanup.test.ts`, package lint scripts.
- **Behavior:** missing env is explicit; JSON preserves empty/null/omitted values and safe
  integers; decimal avoids JS-number rounding; cleanup awaits every action and preserves
  later errors; non-Error primary failures use `CleanupError`.
- **Verification:** build and lint passed; 9/9 unit tests passed, including decimal round-trip,
  multiple cleanup errors, and redaction.
- **Differences/blockers:** Java `BigDecimal`/Jackson reflection became `Decimal` and explicit
  decoders. Allure CLI parameter Environment check was deferred to stages 7–8; timeout test
  followed with API options in stage 4.
- **Status/next:** base implementation complete; remaining dependent checks completed in
  stages 4 and 8. Next stage 4.

### 2026-11-05 — stage 4: Playwright session and API framework

- **Decisions:** Playwright Node has public browser/API context lifecycle APIs but no per-session
  `Playwright.close()` equivalent; API context belongs to client; close UI context before
  browser; keep Playwright-backed response.
- **Checklist/files:** all stage-4 items; API contracts/options/response, Playwright transport,
  session, Allure decorator/provider, API client tests.
- **Behavior:** async API contract, defensive query copy, timeout validation, details/body
  decoder, API-only context, `/api/` URL normalization, unique timestamp+UUID HAR.
- **Java parity:** API 30,000 ms, UI 10,000 ms, timeout `0`, Chromium/Firefox, headed default,
  1790 × 1120 viewport, query omission/empty semantics, error propagation, context-before-browser.
- **Verification:** build/lint passed; 14/14 unit tests; HTTP test confirmed query serialization,
  `/api/transactions`, URL/status/headers/body, timeout behavior, and transport error.
  Project-local Chromium 156.0.8078.4 and Firefox 157.0 binaries installed under
  `.playwright-browsers/`.
- **Difference/blocker:** Node uses shared browser type APIs rather than one Java Playwright
  wrapper per scenario; actual API/browser resources remain scenario-scoped. Cucumber/Allure
  runs were deferred to later stages.
- **Status/next:** complete; stage 5.

### 2026-11-05 — stage 5: decorators, PageFactory, lazy collections

- **Decisions:** standard decorators, no legacy decorators/reflect metadata/globals; fields
  declare `{ type: Constructor }`, `{ locator: true }`, or `{ listItem: Constructor }`;
  constructors require `Locator`; call `PageFactory.initElements` after construction; async
  `LocatorList<T>`.
- **Checklist/files:** decorator metadata/selector precedence, nested/raw locators, lazy lists,
  snapshot/inheritance/cycle diagnostics, invalid declarations and Chromium tests.
- **Implementation:** metadata uses `WeakMap`; decorators register on concrete runtime
  constructors; initialization creates locators only; each list operation resolves current
  matches. ESLint rejects decorated readonly fields; compile-time checks reject invalid field/
  constructor types.
- **Java parity:** preserve declarative selectors, nested scoping, leaves, lazy typed components,
  fallback, cycles, and diagnostics. Java synchronous `List` became explicit async
  (`count`, `isEmpty`, `get`, `snapshot`); positional locator identity is not promised after
  reorder/removal.
- **Verification:** build/lint passed; 19/19 tests; real headless Chromium verified precedence,
  fallback, nesting, snapshots after DOM insertion, inheritance isolation and errors.
  `@ts-expect-error` checks invalid component/Locator/array/constructor declarations; lint
  fixture rejects readonly.
- **Difference/blocker:** README PageFactory documentation deferred to stage 10; behavior was
  already implemented and tested.
- **Status/next:** implementation/tests complete; stage 6.

### 2026-11-05 — stage 6: Sales Analytics API/UI and test steps

- **Decisions:** keep application separate from framework/testsupport; `salesanalytics` is one
  functional module; assertions stay in steps; do not put Playwright/Allure lifecycle in
  services/controls.
- **Checklist/files:** all stage-6 operations, including unused methods; migrated models,
  filters/builders/service, UI wrappers/controls/page/components, API/UI steps, focused tests.
- **Behavior:** response wait precedes trigger; check GET `/api/transactions` and status; wait
  for loading completion without fixed sleeps. Preserve selectors, header mapping, trimming,
  dropdown-by-value, Apply/Clear, non-empty results, all filter values and decimal precision.
- **Verification:** build/lint/unit passed; API profile 2/2, headless Chromium UI 3/3, headed
  full suite 5/5, and two-worker suite 5/5.
- **Differences/blockers:** Java URI/synchronous APIs/exceptions became Node URL/Promises/TS
  errors without changing selectors, endpoint, trigger order, or external behavior. Firefox
  validation remains for stage 10; no application defects were changed.
- **Status/next:** complete; stage 7.

### 2026-11-05 — stage 7: Cucumber World, definitions, hooks, profiles

- **Decisions:** scenario-scoped `TestWorld`, explicit providers/constructors, preserve existing
  `Context`/`ContextKey`, no type-safe redesign. Hooks are tag-scoped to prevent double disposal.
- **Checklist/files:** all profiles, adapters, shared status-code, hooks, JSON/summary, disabled
  publishing, dry-run; `cucumber.mjs`, World/providers/hooks, definitions, adapters, features.
- **Implementation:** Cucumber ESM config uses named exports including `default`; previous
  default-object shape did not load compiled support imports. World initializes only needed
  API/UI resources. Table adapters preserve transpose, case-insensitive enums, `<empty>`.
- **Java parity:** unchanged Gherkin expressions/examples/tags; API 2, UI 3; API context does
  not launch browser.
- **Verification:** dry-run discovered five scenarios with no undefined/ambiguous bindings;
  API 2/2, UI 3/3, default 5/5, including parallel default profile.
- **Difference/blocker:** Cucumber-Pico replaced with World composition root/providers; scope
  and feature behavior preserved. Named profile export was required and fixed.
- **Status/next:** complete; stage 8.

### 2026-11-05 — stage 8: Allure and artifacts

- **Decisions:** compatible `allure-cucumberjs`/`allure-js-commons`; no invented Jira/TestRail
  links; Java baseline and TS output isolated.
- **Checklist/files:** formatter/runtime, API attachments, failed UI screenshot, Environment,
  reports, artifact verification; Cucumber config, Allure client, World, hooks, acceptance tests.
- **Implementation:** importing `allure-cucumberjs` from World registers runtime before API
  attachments. Keep summary as the one stdout formatter; JSON, Allure, and rerun write to
  files. Write effective Environment once per run.
- **Java parity:** request before transport; URL/response after; transport failure attaches
  and rethrows; screenshot only on failed UI with available page before cleanup; close context
  before browser to finalize HAR.
- **Verification:** standard and single-file report generation succeeded. Final parallel Allure
  run had five passed result JSON, 21 unique attachment files/references, three UI HAR files,
  correct Environment (`local`, Chromium, headed, parallel 2, retry 1), API attachment order
  request → URL → response, valid reports/files.
- **Difference:** Java strips leading `@` from Allure tag labels; TS reporter preserves it.
  Tag sets match after prefix normalization. Timestamps/UUIDs/layout are not byte-compared.
- **Error-path note:** generic cleanup tests prove later actions run and preserve failures; the
  UI hook passes screenshot attachment then session close as ordered cleanup actions. No
  separate Cucumber fault injection forced `this.attach` itself to fail.
- **Issue/status:** API attachments were initially missing until the runtime import ordering was
  fixed. Build cleans generated reports, so final reports were regenerated. Complete; stage 9.

### 2026-11-05 — stage 9: parallelism, retries, failed-only rerun

- **Decisions:** default parallel=1/retry=1 with CLI override; global retry remains per D10;
  acceptance fixtures isolated from app features; rerun basename starts with `@`.
- **Checklist/files:** all stage-9 behavior; acceptance feature/steps/tests, Cucumber config,
  rerun script, package script.
- **Implementation:** controlled acceptance scenarios; formatter writes `target/@rerun.txt`;
  rerun profile reads it. Script skips absent/empty input and does not build first, preserving
  rerun data and final exit status.
- **Verification:** Node reported 8/8 test entries passed (the grouped parent test plus seven
  child scenarios), covering actual interval overlap,
  World/context isolation, attachment uniqueness, retry-to-pass, permanent-failure exit,
  retry=0, API failure attach/rethrow, failed Outline row, empty rerun, and failed-UI screenshot/
  HAR per attempt. Retry results shared history/test-case identities. Full two-worker app suite
  passed 5/5. Final rerun command safely skipped an empty file.
- **Difference/issue:** Java Cucumber config had no rerun formatter; TS adds it per D10.
  The incorrect `@target/@rerun.txt` path was corrected to `target/@rerun.txt`.
- **Status/next:** complete; stage 10.

### 2026-11-05 — stage 10: architecture, docs, parity review

- **Decisions:** reproduce only the two existing ArchUnit boundaries; keep README, contributor
  guide, and transfer manifest in staging; do not weaken macOS security for Firefox.
- **Checklist/files:** positive/negative architecture rules, all available validations, profiles,
  parity, local docs, roadmap mapping, exact transfer/deletion manifest. Firefox remains
  unchecked. Changed staging Dependency Cruiser/config/test, README, contributor guide,
  stage-11 manifest, package/lockfile; updated this root migration record. No Java/application
  source/config/docs changed.
- **Implementation:** negative fixture proves forbidden import is rejected. Documentation covers
  real commands, config mapping, decorators, lifecycle, reports/retries/rerun/troubleshooting.
  Manifest inventory cross-check: 67/67 staging transfer paths and 51/51 root Java deletion
  candidates match the current tree.
- **Java parity:** both feature files are byte-identical. Java and TS Allure results each contain
  five passed scenarios with matching names, tags after removing TS `@` prefix, and 18 identical
  top-level executed Gherkin step names. API/UI filters/assertions were retained and passed.
- **Verification:**
  - `npm ci --no-audit --no-fund`, cwd `typescript_framework`: clean lockfile install. A first
    attempt from repository root was invalid because root has no package lock; it was rerun in
    staging.
  - Checked ESLint 10.14.0 Node engine (`^20.19 || ^22.13 || >=24`) and
    `typescript-eslint@8.72.1` peers (ESLint 10 and TypeScript `<6.1`). Upgraded the earlier
    deprecated ESLint 9.39.5 pin and lockfile; Node 26.0.0 satisfies engines.
  - `npm run typecheck`, `npm run lint` passed; `npm run test:unit` 25/25; `npm run
  test:acceptance` reported 8/8 test entries (one parent plus seven subtests);
  `npm run architecture` reported 53 modules/67 dependencies, no violations;
    deliberate negative fixture rejected.
  - `npm run cucumber`: 5/5 passed headed Chromium; `npm run test:parallel`: 5/5 passed with
    two workers. `HEADLESS=true npm run test:api`: 2/2; `HEADLESS=true npm run test:ui`: 3/3.
  - `npm run allure:generate` and `npm run allure:single` both succeeded; 21 unique attachment
    files and three UI HAR files exist. Allure CLI requires Java 8+; generation used the
    available Java 27.0.1. TypeScript build/test execution remains Node-only.
  - `cmp` confirmed both feature pairs identical; Java/TS Allure parity confirmed five names,
    18 executed Gherkin steps, and passed statuses.
  - Cucumber summary totals differ: Java baseline 26 steps, TS 33. Allure top-level per-scenario
    executed steps/names match; no cause is assumed from this count alone.
- **Differences:** Java baseline Cucumber JSON had been overwritten by an individual suite run;
  full Java comparison therefore used its five Allure result JSON files. TS tag labels retain
  `@`; Java strips it. Feature bytes, scenario names, normalized tags, Allure step names, and
  statuses match.
- **Blocker/status:** Firefox 157.0 profile initialization fails on this macOS host with sandbox
  `Operation not permitted`; the headed probe also blocked `plugin-container`. Reinstalling
  project-local binaries did not resolve it. Do not weaken security. Implementation and all
  available checks are complete; stage 10 remains partially blocked only on Firefox UI.
  Stage 11 has not started.
- **Next:** present working TypeScript implementation, evidence, and blocker for review. Do not
  delete Java or move TypeScript to root without separate approval.

### 2026-11-05 — stage 11: final review and transfer to repository root
- **Approval:** the user explicitly approved stage 11 ("роби 11 етап") after reviewing stages
  2–10 and confirmed that `typescript_framework/baseline` was not needed.
- **Pre-checks:** Java recoverable at HEAD `d08ca09`. Manifest lists (67 TS files, 51 tracked Java
  paths) re-extracted and compared with the tree: every TS file existed, every Java path was
  tracked, and the only root conflicts were `README.md`, `.gitignore`, and
  `docs/framework-contributor-guide.md`. No untracked files existed under root `src/`.
- **Java deletion:** `git rm` of the 51 explicit manifest paths (`pom.xml`, `src/main/**`,
  `src/test/**`); then only empty directories under `src/` were removed. No recursive
  deletion of `src/` or root was used.
- **Transfer:** 64 non-conflicting manifest files moved with relative paths preserved. The
  existing `node_modules/` and `.playwright-browsers/` were moved to avoid re-downloading;
  `npm ci` was then run from root. All runtime paths are cwd-relative (`process.cwd()`,
  `resources/configs`, `target/`, `dist/`), so no source/config changes were needed.
- **Merges:** `README.md` — TS README adapted to root plus the original application/coverage
  introduction and the numbered architecture roadmap (items 1–12) rewritten for TypeScript
  (Dependency Cruiser, `World`, npm package, `LocatorList`, `node:assert`, TS snippets, TS
  source links). `docs/framework-contributor-guide.md` — TS guide plus the root introduction,
  the automation-agent change checklist, the implemented/planned roadmap lists, and all
  rejected-proposal constraints. `.gitignore` — Java-only patterns dropped; Node/TS outputs
  (`node_modules/`, `dist/`, `coverage/`, `.playwright-browsers/`, `allure-report-single/`)
  added; `target/`, `.allure/`, `allure-report/`, `.idea`, and logs kept.
- **Other docs:** `docs/stage-11-transfer-manifest.md` marked executed with a resolution note;
  `.github/agents/framework-improvement-planner.agent.md` updated from Java/Maven/Pico/ArchUnit
  to TypeScript/World/Dependency Cruiser. `improvements/`, `TESTS_COVERAGE.md`,
  `sales-analytics-qa-task/`, `.editorconfig`, and `.allure/` preserved unchanged.
- **Verification (cwd = repository root, application on port 3000):** `npm ci` OK; `typecheck`,
  `lint` exit 0; `test:unit` 25/25; `architecture` no violations (53 modules, 67 dependencies);
  `test:acceptance` 8/8; `HEADLESS=true` `cucumber` 5/5 scenarios (33 steps), `test:api` 2/2,
  `test:ui` 3/3, `test:parallel` 5/5; Firefox UI with `CFFIXED_USER_HOME` 3/3 serially and with
  `PARALLEL=2`; `test:rerun` skipped correctly with no failures; `allure:generate` and
  `allure:single` produced `index.html`.
- **Side effects / differences:** `npm run build` cleans root `target/` and `allure-report/`, so the
  old ignored Java outputs there were removed by the first TS build. `allure-report/index.html`
  is a tracked Java single-file report from the original task commit; it was overwritten by
  report generation and then restored with `git checkout` so it stays unchanged. Generated TS
  outputs were cleaned afterwards.
- **Cleanup:** `typescript_framework/` removed only after verifying it contained just the three
  merged files, empty directories, generated outputs, and `baseline/`.
- **Status:** stage 11 complete. Nothing committed.
- **Next:** user review and commit when requested. Decide whether to keep, delete, or replace the
  tracked Java `allure-report/index.html`.

### 2026-11-05 — post-stage 11: removal of Java-era improvement plans
- **Approval:** the user asked to delete `improvements/` after checking that no
  TypeScript-relevant information would be lost from `README.md` and the contributor guide.
- **Gap review:** compared `improvements/01–03` with the current docs and code. Already covered:
  package ownership, rejected proposals, `ApiClientProvider` composition, `@FindBy` precedence,
  `LocatorList` semantics, lazy locators, and the roadmap. Missing and now added to
  `docs/framework-contributor-guide.md`: no indirect framework→application coupling
  (dynamic imports/class names/hidden resources); prerequisites for a separate npm package;
  the "Adding a provider" criteria (consumer, value source, no secrets, lifetime, single
  cleanup owner, decorators, placement, narrowest contract, verification); and the recursive
  PageFactory contract (leaf controls, ignored undecorated fields, fail-fast diagnostics, and
  cycle detection, which the TS `PageFactory` already implements).
- **Changes:** `git rm improvements/01–03`; README plan links removed and provider criteria
  linked; the agent file and guide no longer reference the deleted plans. New plans may still
  be created in `improvements/` by the framework-improvement-planner agent. The stage-11
  manifest has a note marking its `improvements/` references as historical.
- **Verification:** documentation-only change; no remaining `improvements/0*` references
  outside historical records (`migration_ts.md` and the manifest).
- **Status:** complete. Nothing committed.

### Journal template for a future approved stage

```text
Date / stage:
Approved decisions:
Completed checklist items:
Changed files:
Changes and rationale:
Java behavior preserved:
Verification (command, cwd, expected and actual result):
Approved differences:
Errors / blockers / incomplete checks:
Status:
Next action:
```
