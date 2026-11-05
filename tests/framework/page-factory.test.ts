import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import {test} from "node:test";
import {chromium, type Locator} from "playwright";
import {type ElementConstructor, FindBy} from "../../src/framework/ui/pagefactory/FindBy.js";
import {LocatorList} from "../../src/framework/ui/pagefactory/LocatorList.js";
import {PageFactory} from "../../src/framework/ui/pagefactory/PageFactory.js";

class ConstructorWithoutLocator {}
// @ts-expect-error A decorated component constructor must explicitly require a Locator.
FindBy({ selector: "#invalid", type: ConstructorWithoutLocator });

@FindBy({ selector: "#type-selector" })
class Widget {
  constructor(readonly root: Locator) {}
}

class UnselectedWidget {
  constructor(readonly root: Locator) {}
}

class InvalidFieldTypes {
  // @ts-expect-error The field type must match the explicit element constructor.
  @FindBy({ selector: "#widget", type: Widget })
  widget!: string;

  // @ts-expect-error Raw locator declarations must use the Playwright Locator type.
  @FindBy({ selector: "#locator", locator: true })
  locator!: string;

  // @ts-expect-error List fields use the explicit async LocatorList API, not JS arrays.
  @FindBy({ selector: ".widget", listItem: Widget })
  widgets!: Widget[];
}
void InvalidFieldTypes;

@FindBy({ selector: ".record" })
class RecordComponent {
  @FindBy({ selector: ".label", locator: true })
  label!: Locator;

  constructor(readonly root: Locator) {}

  async labelText(): Promise<string> {
    return this.label.innerText();
  }
}

@FindBy({ selector: "#nested" })
class NestedComponent {
  @FindBy({ selector: "#child", locator: true })
  child!: Locator;

  constructor(readonly root: Locator) {}
}

class PageWithElements {
  @FindBy({ selector: "#field-selector", type: Widget })
  overridden!: Widget;

  @FindBy({ type: Widget })
  fallback!: Widget;

  @FindBy({ selector: "#status", locator: true })
  status!: Locator;

  @FindBy({ type: NestedComponent })
  nested!: NestedComponent;

  @FindBy({ selector: ".record", listItem: RecordComponent })
  records!: LocatorList<RecordComponent>;

  constructor(readonly root: Locator) {}
}

class BasePageFields {
  @FindBy({ type: Widget })
  inherited!: Widget;

  constructor(readonly root: Locator) {}
}

class ChildPageFields extends BasePageFields {
  @FindBy({ selector: "#child-only", type: Widget })
  childOnly!: Widget;
}

class SiblingPageFields extends BasePageFields {
  @FindBy({ selector: "#sibling-only", type: Widget })
  siblingOnly!: Widget;
}

test("modern decorators initialize typed fields with field selector precedence and nested scoping", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <main id="root">
        <div id="field-selector"></div>
        <div id="type-selector"></div>
        <div id="status"></div>
        <section id="nested"><span id="child"></span></section>
      </main>
    `);
    const pageObject = new PageWithElements(page.locator("#root"));
    PageFactory.initElements(pageObject, pageObject.root);

    assert.ok(pageObject.overridden.root.toString().includes("#field-selector"));
    assert.ok(pageObject.fallback.root.toString().includes("#type-selector"));
    assert.ok(pageObject.status.toString().includes("#status"));
    assert.ok(pageObject.nested.root.toString().includes("#nested"));
    assert.ok(pageObject.nested.child.toString().includes("#child"));
    assert.ok(pageObject.nested.child.toString().includes("#nested"));
    assert.equal(await pageObject.records.count(), 0);
  } finally {
    await browser.close();
  }
});

test("lazy typed lists resolve the current DOM on each operation and preserve snapshots", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <main id="root">
        <article class="record"><span class="label">Alpha</span></article>
        <article class="record"><span class="label">Beta</span></article>
      </main>
    `);
    const pageObject = new PageWithElements(page.locator("#root"));
    PageFactory.initElements(pageObject, pageObject.root);
    const snapshot = await pageObject.records.snapshot();
    assert.deepEqual(await Promise.all(snapshot.map((item) => item.labelText())), ["Alpha", "Beta"]);

    await page.locator("#root").evaluate((root) => {
      root.insertAdjacentHTML(
        "beforeend",
        '<article class="record"><span class="label">Gamma</span></article>'
      );
    });
    assert.equal(await pageObject.records.count(), 3);
    assert.deepEqual(await Promise.all(snapshot.map((item) => item.labelText())), ["Alpha", "Beta"]);
    assert.deepEqual(
      await Promise.all((await pageObject.records.snapshot()).map((item) => item.labelText())),
      ["Alpha", "Beta", "Gamma"]
    );
    assert.equal(await pageObject.records.isEmpty(), false);
    await assert.rejects(pageObject.records.get(4), /count is 3/);
  } finally {
    await browser.close();
  }
});

test("inherited field registrations are applied per concrete page without sibling leakage", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<main id='root'></main>");
    const child = new ChildPageFields(page.locator("#root"));
    const sibling = new SiblingPageFields(page.locator("#root"));
    PageFactory.initElements(child, child.root);
    PageFactory.initElements(sibling, sibling.root);

    assert.ok(child.inherited.root.toString().includes("#type-selector"));
    assert.ok(child.childOnly.root.toString().includes("#child-only"));
    assert.ok(sibling.inherited.root.toString().includes("#type-selector"));
    assert.ok(sibling.siblingOnly.root.toString().includes("#sibling-only"));
    assert.equal("siblingOnly" in child, false);
    assert.equal("childOnly" in sibling, false);
  } finally {
    await browser.close();
  }
});

test("field cycles and invalid declarations fail with selector and field diagnostics", async () => {
  const cycleReference = {
    get component(): ElementConstructor {
      return SecondComponentClass;
    }
  };
  @FindBy({ selector: "#first" })
  class FirstComponent {
    @FindBy({ selector: "#second", get type() { return cycleReference.component; } })
    second!: object;

    constructor(readonly root: Locator) {}
  }
  @FindBy({ selector: "#second" })
  class SecondComponentClass {
    @FindBy({ selector: "#first", type: FirstComponent })
    first!: FirstComponent;

    constructor(readonly root: Locator) {}
  }

  class CyclicPage {
    @FindBy({ selector: "#first", type: FirstComponent })
    first!: FirstComponent;

    constructor(readonly root: Locator) {}
  }
  class BlankSelectorPage {
    @FindBy({ selector: " ", type: Widget })
    widget!: Widget;

    constructor(readonly root: Locator) {}
  }
  class MissingSelectorPage {
    @FindBy({ type: UnselectedWidget })
    widget!: UnselectedWidget;

    constructor(readonly root: Locator) {}
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const root = page.locator("body");
    const cyclicPage = new CyclicPage(root);
    assert.throws(
      () => PageFactory.initElements(cyclicPage, root),
      /Recursive UI component cycle.*FirstComponent.*SecondComponentClass/
    );
    const invalidPage = new BlankSelectorPage(root);
    assert.throws(
      () => PageFactory.initElements(invalidPage, root),
      /BlankSelectorPage#widget.*Selector must not be blank/
    );
    const missingSelectorPage = new MissingSelectorPage(root);
    assert.throws(
      () => PageFactory.initElements(missingSelectorPage, root),
      /MissingSelectorPage#widget.*A field selector or class-level @FindBy selector is required/
    );

    const invalidStaticField = () => {
      class StaticFieldPage {
        @FindBy({ selector: "#static", type: Widget })
        static widget: Widget;
      }
      return StaticFieldPage;
    };
    assert.throws(invalidStaticField, /public instance fields/);
  } finally {
    await browser.close();
  }
});

test("lint rejects readonly fields because PageFactory must assign decorated fields", () => {
  const eslint = resolve("node_modules", "eslint", "bin", "eslint.js");
  const source = `
    class Component {}
    class Page {
      @FindBy({ selector: "#component", type: Component })
      readonly component!: Component;
    }
  `;
  const result = spawnSync(
    process.execPath,
    [eslint, "--stdin", "--stdin-filename", "src/framework/PageFixture.ts"],
    { encoding: "utf8", input: source }
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /cannot be readonly/);
});
