# Plan: PageFactory for Declarative UI Element Declarations

## Goal

Reduce repetitive code in Page Object and component constructors: declare a selector
alongside the typed control/component, and create the locator and object using a shared
PageFactory.

This applies only to UI elements. Cucumber-PicoContainer remains the mechanism for
constructor injection of dependencies and lifecycle. All stages of this plan are complete
and verified; the approved decisions and results are recorded below.

## Current state

`BasePage` runs `PageFactory` in its constructor with `PageWrapper` as the root context.
PageFactory recursively creates components with class-level `@FindBy`, and their annotated
fields from the parent locator. `TransactionsPage` declares `Filters` and
`TransactionsGrid` without explicit field initializers.

```java
@FindBy("//section[h2='Filters']")
public class Filters {
    private final Locator root;

    @FindBy("#region")
    private Dropdown regionDropdown;

    public Filters(Locator root) {
        this.root = root;
    }
}
```

`TransactionsGrid` uses `@FindBy` for the status `Locator` leaf and `Table`; its `root`
remains an explicit `final` field. `Filters` retains its root, waits, fluent getters, and
`select(...)`. Generic wrappers (`Button`, `Dropdown`, `Table`) and application components
have constructors that accept `Locator`.

## Considerations from the old Selenium implementation

Reviewed `framework/PageFactory.java`, `framework/pagefactory/ElementDecorator.java`,
`ElementLoader.java`, `AnnotationsFieldHandler.java`, list proxy handlers, as well as
`BonusPrizes` / `Options` and `FieldsTable` / `ReflectionForm` in the old
`wl-selenium-tests` project.

The old implementation had the following useful properties:

- `@FindBy` could be placed on a field or on a UI element/block class. A field annotation
  overrode the class-level selector; if the field had no selector, the selector of the
  field's type was used.
- After finding a component/block, its fields were recursively decorated from the found
  parent element. For example, `BonusPrizes` specified the root locator with a class
  annotation, while `Options` described its row fields; `FieldsTable` contained a list of
  typed `ReflectionForm` objects.
- Lists of `WebElement`, `BaseElement`, and `TypifiedElement` were lazy proxies. The proxy
  reran `findElements` for each list method call and materialized the collection for that
  call. It did not retain an old DOM snapshot between separate operations.

The new initializer should preserve these important capabilities using Playwright
`Locator`, but should not port Selenium `SearchContext`, `WebElement`, proxy handlers, or
the implementation one-to-one. The current boundary for controls remains: they are leaf
elements, although the type model should allow container controls to be added later.

## Scope and exclusions

- Add a separate `framework.ui.pagefactory` package for the entire subsystem:
  annotation, PageFactory, and related types.
- Support selector annotations on a component class and on a field; the field selector
  takes precedence, and the class-level selector is used as a fallback for a nested
  component or list item.
- Support nested UI components, creating each component from its parent locator.
- In the first stage, generic controls (`Button`, `Dropdown`, `Table`) are leaf elements:
  the initializer creates them from a `Locator` but does not traverse fields inside
  controls.
- Annotated `Locator` fields are also supported as leaf elements: PageFactory assigns the
  parent-scoped locator to them directly, without wrapper construction or recursive field
  traversal. Unannotated root Locator fields remain explicit and unchanged.
- Support `List<Control>` and `List<Component>` without querying the DOM when creating the
  parent.
- Preserve the lazy list behavior of the old example: each list operation finds the current
  elements again; iteration works with the collection found at the start of that iteration.
  Do not cache elements between separate list operations.
- Do not require a separate `@UiComponent` marker. Start initialization once when creating
  a Page Object; the initializer then recursively traverses annotated UI fields. Existing
  controls are naturally leaf elements because they have no annotated child fields.
- Preserve this recursive model so a control can contain annotated child elements in the
  future without changing the traversal mechanism. Do not implement nested controls as a
  separate current use case.
- Preserve Playwright lazy locator resolution and auto-waiting: build locators during
  initialization, but do not search the DOM for elements.
- Scope selectors to the supplied root component locator, not to the entire page.
- Do not change locators, public control behavior, scenarios, assertions, browser
  lifecycle, or the framework API.
- Do not add a Selenium dependency, DI framework, service locator, or general
  reflection-based object factory.
- Do not turn every field into a magical hidden dependency: the root locator must remain an
  explicit component parameter.
- Fields populated by the initializer must be non-`final`. Do not use reflection to modify
  `final` fields.
- This is a convenience improvement for writing UI code, not a prerequisite for further
  framework use. Do not migrate classes where constructor assignments remain simpler.

## Proposed contract

Use a project-owned runtime annotation with `TYPE` and `FIELD` targets, for example:

```java
@FindBy("#filters")
public class Filters {
    private final Locator root;

    @FindBy("#region")
    private Dropdown regionDropdown;

    public Filters(Locator root) {
        this.root = root;
    }
}

public class TransactionsPage extends BasePage {
    private Filters filters;

    public TransactionsPage(PageWrapper page) {
        super(page);
    }
}
```

`TransactionsPage` is the root initialization entry point through inheritance from
`BasePage`. `Filters` has no field-level selector, so its class-level `@FindBy("#filters")`
defines its root; `regionDropdown` uses its own field selector. The selectors in the
example are schematic. `@FindBy` must be a project-owned annotation in
`io.materialspace.framework.ui.pagefactory`, and not a Selenium annotation. A field-level
annotation takes precedence and allows the
same component type to be used in different places with different selectors. This mirrors
the selector precedence of the old PageFactory. Likewise, for `List<T>`, the selector is
taken from the field, or, if absent, from the class-level annotation of type `T`.

Components may contain other components and controls; controls are leaf elements in this
version. Support parameterized `List<Control>` and `List<Component>` with a field selector
or a class-level selector on the element type. As in the old implementation, a list must
not capture a DOM snapshot during initialization: find the current matching elements in
the parent-scoped locator for each public List operation; one iterator/stream works with
the result obtained when it is created. Do not implement `Set`, raw `List`, arrays, or
arbitrary collection types without a separate need.

The old PageFactory also accepted field-level and type-level `@FindBy`, recursively
initialized nested `BaseElement`/`TypifiedElement`, supported typed element lists, and
found list elements again during each List operation. Use this as a behavioral reference,
but do not port Selenium proxies, `SearchContext`, `WebElement`, or the full implementation
one-to-one: Playwright locators are already lazy, and the new contract must work through
`Locator`.

If the name `@FindBy` causes confusion with Selenium, stop before writing the first line of
code and agree on another name, such as `@UiElement`.

The initializer accepts a target object and an explicit root `Locator` or `PageWrapper`.
For each annotated element field or supported list field, it must:

1. verify that the field is an instance field, and is neither `final` nor `static`;
2. determine the field type; for a list, parse the concrete generic item type and reject
   raw or unsupported collections;
3. determine the selector: the field annotation takes precedence over the class-level
   annotation on the field/item type; if both are absent, fail fast;
4. verify that the type is an allowed component/control with a `Type(Locator)` constructor,
   an annotated raw `Locator` leaf field, or a supported `List<T>` of that wrapper type;
5. create a parent-scoped `root.locator(selector)` without a DOM action;
6. create the nested UI object from the locator; after its creation, recursively initialize
   its own annotated fields;
7. for a list, create a lazy List view that materializes the current elements for each
   operation; create each typed wrapper from its corresponding indexed locator and
   recursively initialize it if it is a component;
8. assign the fully created object to the field;
9. on error, report the class, field, selector, and reason without swallowing the exception.

In the first stage, allow controls/components with an explicit `Locator` constructor,
separate annotated raw `Locator` leaf fields, and parameterized `List<T>` of supported
wrapper types. Do not support `List<Locator>`. Do not introduce a `@UiComponent` marker or
a separate classifier: the initializer recursively traverses `@FindBy` fields in the
created UI object. Existing controls are leaf elements because they contain no annotated
child fields; a future composite control can declare such fields and use the same
recursion logic.

For each List operation, follow the old behavior: find the current elements again and
create typed wrappers, rather than caching a DOM snapshot between separate operations.
Iterator and stream must be consistent snapshots of the elements found when they are
created. Parent initialization must not call `count`, `all`, `isVisible`, `waitFor`, or any
other DOM action. If the exact List semantics are incompatible with Playwright, stop and
clarify the expected contract before implementation.

Track the current component initialization chain and fail fast with diagnostics if
declarations produce infinite nesting. Do not support raw `List`, arbitrary types,
automatic state propagation, static fields, setters, or creating elements by class name.
The initializer ignores unannotated fields; a missing root and errors creating an
annotated field must produce a clear fail-fast message.

The initializer creates `Filters` from `pageRoot.locator("#filters")`, and its controls
from the locator of that `Filters`. Search tree: `pageRoot → Filters → Dropdown/Button`.
For `List<OptionsComponent>`, each wrapper is likewise created from its corresponding
indexed locator and initializes its child fields from it. Existing accessors and
`select(TransactionFilter, String)` must be preserved. Do not add a separate factory for
each control.

## Stage 1. Record UI Component Behavior

- [x] Review `Filters`, `TransactionsGrid`, `TransactionsPage`, generic controls, and all
  their callers.
- [x] Compare the plan with the old Selenium PageFactory: class-level/field-level selector
  resolution, recursive component initialization, and list proxy behavior.
- [x] Record existing selectors, public fluent getters, `select(...)`, table data mapping,
  and wait methods.
- [x] For future lists, separately record the expected semantics of `size`, `get`, iterator,
  stream, DOM changes between operations, and empty collections.
- [x] Record the baseline commands:

  ```bash
  mvn -q -Dtest=FrontendTests -Dheadless=true test
  CFFIXED_USER_HOME=/tmp/taf-playwright-firefox-home-stage7 \
    mvn -Dmaven.repo.local="$HOME/.m2/repository" -q \
    -Dtest=FrontendTests -Dbrowser=firefox -Dheadless=true test
  ```

- [x] If the demo is needed, start it with `npm start`; if runtime validation is impossible,
  record the blocker rather than replacing validation with compilation alone.
- [x] Compare Cucumber scenarios and screenshots/HAR behavior before changes.

**Complete when:** selectors, available methods, and UI suite results are recorded for
comparison after migration.

**Comments — completed 2026-11-04:**

- Reviewed `TransactionsPage`, `Filters`, `TransactionsGrid`, generic controls,
  Cucumber definitions/steps, and all callers of these UI components.
- Selector/API contract, which must not be changed without separate approval:
  - `TransactionsPage` creates `Filters` from `//section[h2='Filters']` and the grid from
    `//section[h2='Sales Transactions']`.
  - `Filters` contains controls with selectors `#dateRange`, `#region`, `#category`, `#sort`,
    `#apply`, `#clear`; its public fluent getters are `dateRangeDropdown()`,
    `regionDropdown()`, `categoryDropdown()`, `sortByDropdown()`, `applyButton()`, and
    `clearButton()`. `select(TransactionFilter, String)` dispatches the four enum values:
    `DATE_RANGE`, `REGION`, `CATEGORY`, `SORT`. `waitForLoaded()` waits for the root locator.
  - `TransactionsGrid` contains `#status` and the table
    `table[aria-label='Sales transactions']`; its public getter is `salesTable()`.
    `Column` maps `Date`, `Region`, `Category`, `Revenue (USD)`, `Order ID`.
    The Loading locator searches for the text `Loading transactions…`. `waitForLoaded()`
    waits for the root, then waits for the Loading indicator to become visible and then
    hidden. `getDataForColumn` reads `thead th`, finds the header index, and reads the
    corresponding `tbody` cells.
  - `TransactionsPage` has fluent getters `filtersComponent()` and
    `transactionsGridComponent()`. `waitForGridReload` waits for `GET /api/transactions`,
    checks `response.ok()`, and waits for the Loading indicator to be hidden.
- The old PageFactory was reviewed in `wl-selenium-tests`:
  `framework/pagefactory/AnnotationsFieldHandler.java` first uses field-level `@FindBy`,
  and if absent, uses the class-level annotation of the field/item type. `ElementLoader`
  creates an element wrapper and recursively calls `populatePageObject`; `ElementDecorator`
  supports WebElement, typed elements, and their Lists. Examples of nested blocks/lists:
  `admin/bonus/blocks/BonusPrizes.java`, `admin/bonus/blocks/prizes/Options.java`, and
  `admin/lib/elements/FieldsTable.java`.
- The old list proxy reruns `findElements` for each List operation, creating typed wrappers
  for that result. `iterator()`/`stream()` work with the result obtained at the start of the
  corresponding operation; an empty collection is returned as an empty list. This is
  recorded as the behavioral target for new Playwright lists, not as a requirement to port
  Selenium proxies.
- The UI feature contains three examples: a single REGION=Europe, a single
  CATEGORY=Furniture, and a combined REGION=Europe + CATEGORY=Furniture. Both baseline
  suites passed
  3 scenarios / 18 steps passed:

  | Browser | Command | Result |
  |---------|---------|--------|
  | Chromium | `mvn -q -Dtest=FrontendTests -Dheadless=true test` | 3 scenarios / 18 steps passed |
  | Firefox | `CFFIXED_USER_HOME=/tmp/taf-playwright-firefox-home-stage7 mvn -Dmaven.repo.local="$HOME/.m2/repository" -q -Dtest=FrontendTests -Dbrowser=firefox -Dheadless=true test` | 3 scenarios / 18 steps passed |

- The demo returned HTTP 200 for the UI and API before the tests. Allure recorded three
  passed UI results for each browser. No screenshot is expected on a passing run; the UI
  hook adds one only for a failed scenario when a page is available. A valid HAR with three
  network entries was created after each UI scenario; the HAR is closed with the
  BrowserContext.
- Full baseline logs were saved outside Git:
  `stage3-ui-chromium-baseline.log` and `stage3-ui-firefox-baseline.log` in session
  artifacts `.../files/`. Firefox on macOS 27 requires a temporary `CFFIXED_USER_HOME`, as
  described in README Troubleshooting. Source code and working files were not changed at
  this stage.

## Stage 2. Approve the Annotation and Supported Field Types

Depends on Stage 1.

- [x] Confirm the project-owned annotation name and package:
  project-owned `@FindBy` and PageFactory in `io.materialspace.framework.ui.pagefactory`,
  not a Selenium annotation.
- [x] Confirm that the first version supports class-level and field-level selectors; the
  field-level selector takes precedence, and the class-level selector is the fallback.
- [x] Confirm support for nested components, `List<Control>`, and `List<Component>` with a
  `Locator` constructor.
- [x] Agree on the lazy-list contract: each List operation finds the current elements again;
  iterator/stream uses the snapshot obtained when it is created.
- [x] Record that components are initialized recursively, while controls are currently
  leaf elements.
- [x] Do not add a `@UiComponent` marker or a separate component/control classifier.
  Each concrete `BasePage` subclass is a root: when the Page Object is created, the
  initializer starts traversing its annotated fields. Nested components and their controls
  are created recursively from the parent locator. Current controls are leaf elements
  because they have no annotated child fields; a future composite control can add them
  without changing the recursion mechanism.
- [x] Confirm that fields initialized by the initializer will not be `final`; other `final`
  fields (for example, a component root locator) remain ordinary explicit fields.
  Annotated raw `Locator` leaf fields can be non-final and managed by the initializer.
- [x] Agree on field access: keep annotated fields `private non-final` and allow restricted
  reflection assignment only for `@FindBy` fields.
- [x] Record that annotated fields must not have field initializers; `BasePage` runs the
  initializer before the subclass constructor body, and explicit field initializers could
  overwrite values assigned through reflection.
- [x] Record that creating a Page Object subclass starts the initializer with a
  `PageWrapper` root context; the initializer recursively creates nested UI objects but
  does not manage Cucumber/scenario dependencies.

**Complete when:** the annotation name, supported types, and field access rules are agreed.

**Stage 2 completed 2026-11-04.**

**Comments:**

- The user approved project-owned `@FindBy` and the entire PageFactory mechanism in
  `io.materialspace.framework.ui.pagefactory`.
- Do not add a Selenium dependency or import `org.openqa.selenium.support.FindBy`.
  The annotation, PageFactory, and related types must be in the same package,
  `io.materialspace.framework.ui.pagefactory`.
- Selector precedence was confirmed against the old PageFactory: field-level `@FindBy`
  overrides the class-level selector; if the field has no selector, the nested component
  or list item takes the selector from its type.
- Fields populated by the initializer must be non-final. `final` root locators and other
  fields not managed by the initializer remain explicit constructor-assigned fields.
  Modifying `final` fields through reflection is prohibited.
- The user approved `private non-final` annotated fields with restricted reflection
  assignment only for `@FindBy`. The implementation must check field access and fail fast
  with class/field diagnostics; do not make fields package-private for the initializer.
- The user clarified the root/discovery model: concrete classes that extend `BasePage` are
  initialization entry points. When a page is created, the initializer must recursively
  create nested components and controls from their parent locator; a separate
  `@UiComponent` marker is not needed.
- The boundaries of the first version were agreed: nested components and typed lists are
  supported; controls without annotated children are leaf elements. A future composite
  control can declare child fields that the existing recursion logic will process without
  a marker.
- The old PageFactory list behavior is preserved: find elements again for each List
  operation; iterator/stream is a snapshot at creation time. The implementation must check
  exact compatibility of this contract with Playwright and ask the user if it cannot be
  achieved.

The next step is Stage 3, after a separate user request.
- The first version supports recursive components and parameterized `List<Control>` /
  `List<Component>` if the types have a `Locator` constructor. Controls remain leaf
  elements: a component can contain controls, but a control does not undergo recursive
  field initialization in this version.
- The lazy list contract is based on the old `BaseElementListProxyHandler` /
  `TypifiedElementListProxyHandler`: each List operation finds elements again and creates
  wrappers; iterator/stream works with the result materialized for that operation. The DOM
  is not read during parent component initialization.
- The remaining Stage 2 decisions are still open and must be confirmed before implementing
  the initializer.

## Stage 3. Implement PageFactory

Depends on Stage 2 and explicit user approval.

- [x] Add a runtime annotation for fields and component types in
  `framework.ui.pagefactory`.
- [x] Add a project-owned `PageFactory` in `framework.ui.pagefactory` with explicit overloads
  `initElements(pageObject, rootLocator)` and `initElements(pageObject, rootPage)`.
- [x] Determine the selector using this rule: the field annotation takes precedence; the
  class-level annotation of the field/item type is used as a fallback.
- [x] Recursively traverse the Page Object from a root `PageWrapper` or `Locator` and create
  nested UI objects from parent-scoped locators without a `@UiComponent` marker.
- [x] Add cycle detection for the component tree so an erroneous cyclic declaration fails
  with a clear component/field chain.
- [x] Support only parameterized `List<T>` for allowed controls/components; fail fast for
  raw List, unsupported item types, and other collection types.
- [x] Support separate `@FindBy` fields of Playwright `Locator` type as lazy leaf values;
  leave unannotated root Locator fields unchanged and untraversed.
- [x] Implement a lazy list view: each List operation finds the current elements again;
  iterator/stream gets a snapshot when it is created. Do not materialize DOM elements
  during component initialization.
- [x] Do not classify types using a fixed list of class names. Controls without annotated
  children remain leaf elements; if a control receives annotated fields in the future, the
  same recursion must process them without a new marker.
- [x] Create first-level locators from the explicit `PageWrapper`/root `Locator`, and nested
  locators from the parent Locator; do not call `count`, `isVisible`, `waitFor`, or any other
  DOM action during initialization.
- [x] Instantiate wrappers of allowed types through their `Locator` constructor, and assign
  annotated raw `Locator` leaf fields directly.
- [x] Fail fast for `static`, `final`, unsupported types, a missing constructor, an empty
  selector, or inaccessible field assignment. The error must include the target class,
  field name, and reason.
- [x] Do not add a fallback that silently skips an invalid annotation or returns a partially
  initialized component.
- [x] Add initializer tests: start from a Page Object, correct parent scoping, field type →
  wrapper mapping, nested components at multiple levels, controls inside components without
  a marker, class-level selector fallback, field-level selector override, raw Locator leaf
  injection with verification that the root locator is preserved, lazy typed lists,
  re-resolution between List operations, iterator/stream snapshot semantics, empty lists,
  component-cycle detection, and every unsupported/error case.
- [x] Ensure tests do not require an unnecessary full demo run for pure reflection/metadata
  checks; use a minimal local browser/page setup with the existing test infrastructure to
  check Playwright locator behavior.

**Interim result — first item completed 2026-11-04:**

- Added project-owned `io.materialspace.framework.ui.pagefactory.FindBy`.
- By user decision, the entire mechanism (annotation, PageFactory, and related types) must
  reside in one package, `io.materialspace.framework.ui.pagefactory`; existing generic page
  wrappers and controls in `framework.ui` / `framework.ui.control` are not moved.
- The annotation has runtime retention, supports `TYPE` and `FIELD` targets, and contains
  the selector in `value()`. This enables the class-level fallback and field-level override
  defined in Stage 2.
- No Selenium dependency or initializer was added; only the first item of the stage was
  completed.
- After moving the annotation to the new package, `mvn -q -DskipTests test-compile` passed.
  The only output was the existing Lombok warning about deprecated
  `sun.misc.Unsafe::objectFieldOffset`.

**Interim result — items 2–4 completed 2026-11-04:**

- Added `PageFactory.initElements(Object pageObject, Locator rootLocator)` in
  `io.materialspace.framework.ui.pagefactory`.
- Implemented selector resolution for direct fields: field-level `@FindBy` takes
  precedence over the class-level `@FindBy` on the field type. PageFactory also traverses
  fields declared in superclasses.
- `PageFactory.initElements(...)` recursively creates nested annotated objects through
  their `Locator` constructor, passing a locator scoped to the parent. Recursion does not
  require a `@UiComponent` marker; controls without annotated children are naturally leaf
  elements.
- Added a test fixture with a nested Page Object → component → `Dropdown`; the test confirms
  recursive initialization and selector scoping at each level. Production `TransactionsPage`
  is not yet connected to PageFactory; this will be checked during a separate pilot
  migration.
- An annotated field must be an instance/non-final field; the selector must be non-empty;
  the type must have a constructor that accepts `Locator`. Private field and constructor
  access is enabled only for reflection assignment/invocation; errors include the class,
  field, and selector. `List` currently fails explicitly with "not supported yet" until
  the separate list item is implemented.
- Added four focused unit tests: field override/class fallback, fail-fast for a `final`
  field, recursive nested-component initialization with scoped locators, and cycle
  detection. `mvn -q -Dtest=PageFactoryTest,ArchitectureTest test` passed: PageFactory —
  4 tests, ArchUnit — 2 rules, 0 failures.
  The existing Lombok warning about deprecated Unsafe API remains.
- List support and connecting PageFactory to production page/component constructors are
  not yet implemented; they remain separate next items.

**Interim result — cycle detection completed 2026-11-04:**

- `PageFactory` tracks types and the field chain only along the current recursion path.
  Repeating the same component type in another tree branch is allowed; a cycle among
  ancestors fails with `IllegalStateException` including the class/field chain.
- Added a test for the cycle `CycleComponentA → CycleComponentB → CycleComponentA`.
  Verified the error type and that both components and fields appear in the message.
- Validation: `mvn -q -Dtest=PageFactoryTest,ArchitectureTest test` — PageFactory 4/4,
  ArchUnit 2/2; all passed.

**Interim result — typed lists and lazy list view completed 2026-11-04:**

- `List<T>` is supported only for a concrete item class with a `Type(Locator)` constructor.
  The field-level selector takes precedence over the item type's class-level selector; raw
  lists, wildcard/type-variable item types with a defined UI selector, and other collection
  types are rejected with diagnostics.
- Initialization creates a parent-scoped list locator and a lazy `List` proxy; the DOM is
  not queried. Each List operation gets a fresh `Locator.all()` result, creates typed
  wrappers, and recursively initializes annotated child fields. Iterator and stream work
  with their own snapshot materialized during the corresponding call.
- Constructor availability/accessibility is checked before assigning the lazy list field;
  the wrappers themselves are created only during a List operation. Repeating a component
  type in different list items is not treated as a cycle; nested annotated fields are
  checked using the ordinary path-based cycle detection.
- PageFactory tests cover no-DOM list initialization, field selector override and type
  selector fallback, re-resolution between `size`/`get` and other operations,
  iterator/stream snapshots, an empty list, controls and components in lists, recursive
  child initialization, and fail-fast behavior for raw/wildcard lists, `Set`, `static`,
  `final`, a blank selector, and a missing `Locator` constructor. A separate minimal
  Chromium test uses `Page.setContent()` without the demo: it initializes PageFactory
  before adding list items, confirms their lazy appearance, scoped child locators, renewed
  lookup after a DOM change, and an iterator snapshot.
- Validation `mvn -q -Dtest=PageFactoryTest,ArchitectureTest test` passed:
  PageFactory — 10 tests, ArchUnit — 2 rules; 0 failures. The existing Lombok deprecation
  warning about `sun.misc.Unsafe::objectFieldOffset` remains.

**Stage 3 completed 2026-11-05.** The annotation-based PageFactory, selector precedence,
recursion/cycle detection, typed lazy lists, fail-fast validation, and behavior of real
Playwright locators have been implemented and verified. Production `Filters` migration is
not part of this stage and remains a separate pilot stage.

**Complete when:** the initializer has a narrow contract, errors are explicit, and positive
and negative tests pass.

**Comments:** _implementation, supported types, tests, and limitations._

## Stage 4. Migrate One Component as a Pilot

Depends on Stage 3.

- [x] Migrate only `Filters`: replace repetitive `new Control(root.locator(...))`
  assignments with annotated fields and one initializer call.
- [x] If the current Sales Analytics UI structure has no nested component or list, add a
  test-only fixture to verify these capabilities; do not create artificial business logic
  in production components for the initializer test.
- [x] Keep `root` final and explicit; do not move `waitForLoaded()` or `select(...)` into the
  initializer.
- [x] Preserve fluent getter names, control types, selector strings, and switch behavior.
- [x] Ensure the child locator is created from the parent component's locator, not from the
  `Page` or a global root.
- [x] Run the frontend suite and compare scenarios with Stage 1.
- [x] Do not migrate additional components before a separate user review of the pilot result.

**Complete when:** `Filters` works as before, constructor boilerplate is reduced, and the
frontend baseline passes.

**Stage 4 completed 2026-11-05.**

- `Filters` now declares selectors through `@FindBy` on six typed control fields; the
  constructor keeps `root` as `final` and makes one `PageFactory.initElements(this, root)`
  call.
- `waitForLoaded()`, `select(...)`, fluent getter names, control types, and switch dispatch
  are unchanged. `TransactionsPage` continues to pass the root locator of the Filters
  section, so child controls remain scoped to the component.
- Test-only fixtures added in Stage 3 were used for nested component/list scenarios; the
  production Sales Analytics structure was not expanded for the tests.
- `mvn -q -Dtest=FrontendTests -Dheadless=true test` passed: 3 scenarios / 18 steps,
  matching the Stage 1 baseline. No other production components were migrated.

**Comments:** pilot completed; subsequent component migrations await a separate review.

## Stage 5. Migrate Other Components Only After Review

Depends on approval of the pilot.

- [x] Determine which `TransactionsGrid` fields benefit from the annotation initializer.
- [x] Separately decide whether to create `Filters` and `TransactionsGrid` in
  `TransactionsPage` through the same annotation; the page root must remain parent-scoped.
- [x] Migrate lists only where they correspond to a real UI contract. Do not add production
  lists only to demonstrate the initializer capability.
- [x] Migrate only components where this reduces real boilerplate and does not hide
  important constructor logic.
- [x] Preserve the status locator, loading waits, table mapping, page construction, and
  ownership.
- [x] Do not add package/classpath scanning or external lifecycle hooks; PageFactory is
  launched from the `BasePage` constructor for the defined Page Object root.
- [x] After each approved migration, run the minimal frontend suite and record the result.

**Complete when:** each migration is approved, behavior is unchanged, and unnecessary
components retain explicit constructors.

**Stage 5 completed 2026-11-05.**

- `TransactionsPage` declares `Filters` and `TransactionsGrid` as annotated fields using
  class-level `@FindBy` on their respective types. `BasePage` runs
  `PageFactory.initElements(this, page)` after storing the `PageWrapper`; this is the shared
  root initialization point for all its concrete subclasses.
- Fields with `@FindBy` are declared without explicit field initializers: the `BasePage`
  constructor runs before subclass field initializers, which could otherwise overwrite
  values assigned by PageFactory through reflection. `TransactionsPage` has no such
  initializers.
- `PageFactory` accepts `PageWrapper` as the root search context for Page Object fields;
  component children are then created from the parent component's Locator. Existing XPath
  selectors for both sections were preserved.
- `Filters` no longer runs the initializer itself: components and controls are initialized
  once, recursively from `TransactionsPage`. `TransactionsGrid` keeps `root` explicit/final;
  `statusBar` receives `@FindBy("#status")` as a raw Locator leaf, and the typed `Table`
  retains its `@FindBy`. Status/loading behavior and table mapping were not changed.
- There is no real production list contract in the Sales Analytics UI; Lists remain only in
  PageFactory tests. Raw Locator injection is limited to annotated single fields;
  unannotated component roots, including the final `TransactionsGrid.root`, are ignored by
  PageFactory.
- Validation `mvn -q -Dtest=FrontendTests,PageFactoryTest,ArchitectureTest -Dheadless=true test`
  passed: UI — 3 scenarios / 18 steps, PageFactory — 11 tests, ArchUnit — 2 rules; 0
  failures. The UI scenario count matches the Stage 1 baseline.

## Stage 6. Verify Integration and Documentation

Depends on all approved migrations.

- [x] Run `mvn -q -DskipTests test-compile` and the full headless API/UI suite.
- [x] Confirm scenarios, HAR, screenshot-on-failure, and cleanup behavior.
- [x] Check ArchUnit; framework UI code must not depend on `salesanalytics`.
- [x] Update `docs/framework-contributor-guide.md` with the annotation contract, supported
  controls, initialization rules, and an example based on the actual implementation.
- [x] Update the README roadmap: mark the item implemented only after execution and
  validation.
- [x] Review the diff for unplanned selector, assertion, wait, lifecycle, or business changes.

**Complete when:** integration checks pass, the documentation describes the actual API,
and the roadmap status matches the code.

**Stage 6 completed 2026-11-05.**

- `mvn -q -DskipTests test-compile` and `mvn -q -Dheadless=true test` passed.
  API suite: 2 scenarios / 8 steps; UI suite: 3 scenarios / 18 steps; PageFactory: 11 tests;
  ArchUnit: 2 rules; all passed.
- The three HAR files from the latest UI run are valid JSON, each with 3 entries: UI
  navigation and the corresponding transactions API calls. All scenarios passed, so the
  latest Allure UI results contain no screenshot attachments. The UI hook adds a
  screenshot only for a failed scenario; API/UI cleanup closes the clients, browser
  context, browser, and Playwright, and closing the BrowserContext completes HAR recording.
- ArchUnit passed: 2 rules; framework UI/PageFactory does not depend on `salesanalytics`.
- Updated the contributor guide, README roadmap, and project improvement planner. README
  marks PageFactory as implemented; the guide describes raw Locator leaves, typed
  wrappers, lazy lists, root exclusion, `@FindBy` field restrictions, and the 10,000 ms
  global UI action timeout.
- Diff review found no changes to selectors, assertions, UI waits, lifecycle/reporting
  hooks, or business behavior beyond the approved 10,000 ms Playwright default action
  timeout.
- `improvements/03_declarative_ui_elements.md` was translated into English after all
  implementation stages were complete.

## Acceptance Criteria

- [x] A UI component declares a selector alongside its typed control/component.
- [x] Initialization starts when the Page Object is created and recursively traverses
  annotated fields of nested UI objects without a separate `@UiComponent` marker.
- [x] The class-level selector is used as a fallback, and the field-level selector
  overrides it.
- [x] Typed `List<T>` remains lazy and returns current elements according to the agreed
  semantics.
- [x] Existing controls without annotated children are leaf elements; a future composite
  control can declare nested fields without changing the recursion mechanism.
- [x] A Locator is created from the explicit parent root and remains lazy until actual
  interaction.
- [x] Invalid annotations and fields produce a readable error with class/field context.
- [x] `final` fields are not modified through reflection.
- [x] PicoContainer as the dependency injection mechanism is unchanged.
- [x] UI behavior, selectors, synchronization, reporting, HAR, and cleanup are preserved.
- [x] The framework implementation does not depend on Sales Analytics modules.
- [x] README and the contributor guide describe only the verified implementation state.

**Status:** Stages 1–6 are complete; the plan has been translated into English.
