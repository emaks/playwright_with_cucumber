# Stage 11: transfer manifest (executed)

> **Later change:** after stage 11 the user approved deleting the Java-era `improvements/01–03`
> plans; their still-relevant rules were merged into `README.md` and
> `docs/framework-contributor-guide.md`. References to them below are historical.

**Status: executed after explicit user approval.** This document records the TypeScript
files moved from the former `typescript_framework/` staging directory to the repository
root and the Java-only paths deleted during stage 11. The Java implementation remains
available in git history. Execution details are recorded in `migration_ts.md`.

Transfer paths below were relative to `typescript_framework/` and are now relative to the
repository root. Generated outputs and the isolated Java baseline were not transferred.

## TypeScript files transferred

### Project configuration and documentation

```text
.dependency-cruiser.cjs
.gitignore
README.md
cucumber.mjs
docs/framework-contributor-guide.md
docs/stage-11-transfer-manifest.md
eslint.config.mjs
package-lock.json
package.json
tsconfig.json
```

### Application features, configuration, and scripts

```text
features/be/SalesTransactions.feature
features/fe/SalesTransactions.feature
resources/configs/local.json
scripts/clean.mjs
scripts/rerun.mjs
```

### Framework source

```text
src/framework/api/ApiClient.ts
src/framework/api/ApiRequestOptions.ts
src/framework/api/ApiResponse.ts
src/framework/api/clients/PlaywrightApiClient.ts
src/framework/config/PropertyLoader.ts
src/framework/json/ObjectMapperUtils.ts
src/framework/lifecycle/Cleanup.ts
src/framework/logging/Logger.ts
src/framework/playwright/PlaywrightSession.ts
src/framework/reporting/allure/AllureApiClient.ts
src/framework/ui/BasePage.ts
src/framework/ui/PageWrapper.ts
src/framework/ui/control/Button.ts
src/framework/ui/control/Dropdown.ts
src/framework/ui/control/Table.ts
src/framework/ui/pagefactory/FindBy.ts
src/framework/ui/pagefactory/LocatorList.ts
src/framework/ui/pagefactory/PageFactory.ts
```

### Sales Analytics source

```text
src/salesanalytics/api/RequestOptionsBuilder.ts
src/salesanalytics/api/TransactionFilter.ts
src/salesanalytics/api/TransactionFilters.ts
src/salesanalytics/api/TransactionsService.ts
src/salesanalytics/api/models/TransactionsResponse.ts
src/salesanalytics/definitions/ParameterTypeAdapter.ts
src/salesanalytics/definitions/api/SalesTransactionsDefinitions.ts
src/salesanalytics/definitions/ui/SalesTransactionsDefinitions.ts
src/salesanalytics/steps/api/SalesTransactionsSteps.ts
src/salesanalytics/steps/ui/SalesTransactionsSteps.ts
src/salesanalytics/ui/TransactionsPage.ts
src/salesanalytics/ui/component/Filters.ts
src/salesanalytics/ui/component/TransactionsGrid.ts
```

### Test support and tests

```text
src/testsupport/context/Context.ts
src/testsupport/context/ContextKey.ts
src/testsupport/cucumber/World.ts
src/testsupport/cucumber/WorldRegistration.ts
src/testsupport/cucumber/api/ApiClientProvider.ts
src/testsupport/cucumber/api/GeneralDefinitions.ts
src/testsupport/cucumber/api/Hooks.ts
src/testsupport/cucumber/ui/Hooks.ts
src/testsupport/cucumber/ui/UiPageProvider.ts
tests/acceptance/cucumber-runtime.test.ts
tests/acceptance/features/Runtime.feature
tests/acceptance/steps/RuntimeSteps.ts
tests/architecture/dependency-boundaries.test.ts
tests/architecture/fixtures/framework/IllegalApplicationImport.ts
tests/framework/api-client.test.ts
tests/framework/config-json-cleanup.test.ts
tests/framework/page-factory.test.ts
tests/framework/parameter-adapter.test.ts
tests/framework/salesanalytics-model.test.ts
tests/framework/salesanalytics-service.test.ts
tests/framework/toolchain.test.ts
```

`docs/stage-11-transfer-manifest.md` is the review record and should remain available at
the repository root after any approved transfer. `migration_ts.md` also remains a root
migration record; it is not part of this source manifest.

## Explicitly excluded from transfer

Do not transfer:

- `baseline/java/` (isolated Java comparison copy, reports, and Maven artifacts);
- `node_modules/`, `.playwright-browsers/`, `dist/`, `target/`, `allure-report/`,
  `allure-report-single/`, coverage, HAR recordings, Cucumber/Allure outputs, or logs;
- the application-under-test directory `sales-analytics-qa-task/`;
- root `TESTS_COVERAGE.md`, existing `improvements/` plans, or unrelated repository files.

Generated artifacts remain in staging until reviewed; they are not source files and are
not to be copied into root. Remove staging-only artifacts only by their explicit known
paths, after the root implementation has passed its approved verification.

## Java-only root paths deleted

The following paths were re-checked against the tracked tree and deleted individually with
`git rm` after stage-11 approval; no recursive deletion was used against `src/` or any
parent directory. Only the then-empty Java directories were removed afterwards.

### Maven build

```text
pom.xml
```

### Java production sources

```text
src/main/java/io/materialspace/framework/api/ApiClient.java
src/main/java/io/materialspace/framework/api/ApiRequestOptions.java
src/main/java/io/materialspace/framework/api/ApiResponse.java
src/main/java/io/materialspace/framework/api/clients/PlaywrightApiClient.java
src/main/java/io/materialspace/framework/config/PropertyLoader.java
src/main/java/io/materialspace/framework/json/ObjectMapperUtils.java
src/main/java/io/materialspace/framework/lifecycle/Cleanup.java
src/main/java/io/materialspace/framework/playwright/PlaywrightSession.java
src/main/java/io/materialspace/framework/reporting/allure/AllureApiClient.java
src/main/java/io/materialspace/framework/ui/BasePage.java
src/main/java/io/materialspace/framework/ui/PageWrapper.java
src/main/java/io/materialspace/framework/ui/control/Button.java
src/main/java/io/materialspace/framework/ui/control/Dropdown.java
src/main/java/io/materialspace/framework/ui/control/Table.java
src/main/java/io/materialspace/framework/ui/pagefactory/FindBy.java
src/main/java/io/materialspace/framework/ui/pagefactory/LazyLocatorList.java
src/main/java/io/materialspace/framework/ui/pagefactory/PageFactory.java
src/main/java/io/materialspace/framework/ui/pagefactory/PageObjectInitializer.java
src/main/java/io/materialspace/salesanalytics/api/RequestOptionsBuilder.java
src/main/java/io/materialspace/salesanalytics/api/TransactionFilter.java
src/main/java/io/materialspace/salesanalytics/api/TransactionFilters.java
src/main/java/io/materialspace/salesanalytics/api/TransactionsService.java
src/main/java/io/materialspace/salesanalytics/api/models/TransactionsResponse.java
src/main/java/io/materialspace/salesanalytics/ui/TransactionsPage.java
src/main/java/io/materialspace/salesanalytics/ui/component/Filters.java
src/main/java/io/materialspace/salesanalytics/ui/component/TransactionsGrid.java
```

### Java resources and test sources

```text
src/main/resources/allure.properties
src/main/resources/configs/local.properties
src/main/resources/log4j.properties
src/test/java/io/materialspace/architecture/ArchitectureTest.java
src/test/java/io/materialspace/framework/ui/pagefactory/PageFactoryTest.java
src/test/java/io/materialspace/salesanalytics/definitions/ParameterTypeAdapter.java
src/test/java/io/materialspace/salesanalytics/definitions/api/SalesTransactionsDefinitions.java
src/test/java/io/materialspace/salesanalytics/definitions/ui/SalesTransactionsDefinitions.java
src/test/java/io/materialspace/salesanalytics/steps/api/SalesTransactionsSteps.java
src/test/java/io/materialspace/salesanalytics/steps/ui/SalesTransactionsSteps.java
src/test/java/io/materialspace/suites/BackendTests.java
src/test/java/io/materialspace/suites/FrontendTests.java
src/test/java/io/materialspace/testsupport/context/Context.java
src/test/java/io/materialspace/testsupport/context/ContextKey.java
src/test/java/io/materialspace/testsupport/cucumber/AllureEnvironmentHook.java
src/test/java/io/materialspace/testsupport/cucumber/JacksonTransformer.java
src/test/java/io/materialspace/testsupport/cucumber/api/ApiClientProvider.java
src/test/java/io/materialspace/testsupport/cucumber/api/GeneralDefinitions.java
src/test/java/io/materialspace/testsupport/cucumber/api/Hooks.java
src/test/java/io/materialspace/testsupport/cucumber/ui/Hooks.java
src/test/resources/archunit.properties
src/test/resources/cucumber.properties
src/test/resources/features/be/SalesTransactions.feature
src/test/resources/features/fe/SalesTransactions.feature
```

## Root conflicts and preservation rules

The staged project must not be copied over root paths wholesale. Resolve these conflicts
manually after approval:

| Root path | Required handling |
|---|---|
| `src/` | Contains the Java tree above. Verify every current path, remove only approved Java files, then move the TypeScript `src/` tree into the resulting location. |
| `pom.xml` | Java build file; delete only with explicit stage-11 approval. |
| `README.md` | Merge useful root application/setup/coverage context with the TypeScript README; do not blindly overwrite. |
| `.gitignore` | Merge TS ignore entries into the existing rules; preserve application and Java history/output rules still needed. |
| `docs/framework-contributor-guide.md` | Merge the TypeScript guide with settled root architecture decisions; preserve rejected-proposal constraints. |
| `TESTS_COVERAGE.md` | Preserve; it is a separate application coverage plan, not Java build output. |
| `improvements/01_framework_application_separation.md` | Preserve as completed historical plan and decision record. |
| `improvements/02_provider_dependency_wiring.md` | Preserve settled provider composition and avoid adding providers per class. |
| `improvements/03_declarative_ui_elements.md` | Preserve as completed Java implementation record; add TS-specific details only when appropriate. |
| `sales-analytics-qa-task/` | Preserve unchanged; it is the application under test. |
| `migration_ts.md` | Preserve as the migration/checklist/journal document. |

The root `README.md`, `.gitignore`, contributor guide, Maven build, and `src/` all need
conflict review. Do not remove root `target/`, reports, or arbitrary untracked files as
part of Java deletion. Keep a reachable Git version of Java before any approved deletion.

**Resolution:** `README.md`, `.gitignore`, and `docs/framework-contributor-guide.md` were
merged manually: the README keeps the application/coverage introduction and the numbered
architecture roadmap rewritten for TypeScript; the guide keeps the root intro, the agent
change checklist, and all rejected-proposal constraints; `.gitignore` drops Java-only
patterns and adds Node/TypeScript outputs. `npm run build` cleans root `target/` and
`allure-report/`, so old Java outputs there were removed by the first TypeScript build.

## Roadmap-document mapping

| Existing source of truth | Staged TypeScript counterpart / disposition |
|---|---|
| `improvements/01_framework_application_separation.md` | Package ownership is carried by `src/framework/`, `src/salesanalytics/`, and `src/testsupport/`; keep the original plan as historical evidence. `salesanalytics` remains a functional module, not a second application. |
| `improvements/02_provider_dependency_wiring.md` | `src/testsupport/cucumber/api/ApiClientProvider.ts` composes API reporting/transport; `World` and the UI provider construct scenario-owned objects. Do not generalize to a provider per class. |
| `improvements/03_declarative_ui_elements.md` | `FindBy`, `PageFactory`, `LocatorList`, and PageFactory tests carry the design into TypeScript with explicit constructors and async collections; Java plan remains historical. |
| Root `docs/framework-contributor-guide.md` | TypeScript-specific companion is `docs/framework-contributor-guide.md` under staging; merge rather than erase settled root decisions during stage 11. |
| Root `TESTS_COVERAGE.md` | Remains unchanged and is not evidence that planned business cases have been implemented. |
| `migration_ts.md` | Root migration journal, decision record, completion checklist, and stage-11 approval boundary; preserve it. |

Browser reuse, a transport-independent API response, stronger architecture rules,
object-based assertions, additional application coverage, and any separate module remain
roadmap options, not tasks implied by this manifest. Preserve the explicitly rejected
Context, PropertyLoader, session-guard, and UI-filter decoupling proposals as rejected
unless the user requests a new review.
