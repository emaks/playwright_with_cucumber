package io.materialspace.framework.ui.pagefactory;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import io.materialspace.framework.ui.control.Dropdown;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PageFactoryTest {
    @Test
    void fieldSelectorOverridesTypeSelectorAndTypeSelectorIsFallback() {
        List<String> locatedSelectors = new ArrayList<>();
        PageObject page = new PageObject();

        PageFactory.initElements(page, locator("page-root", locatedSelectors));

        assertEquals("page-root/#field-selector", page.overridden.selector());
        assertEquals("page-root/#type-selector", page.fallback.selector());
        assertEquals(2, locatedSelectors.size());
        assertTrue(locatedSelectors.contains("page-root -> #field-selector"));
        assertTrue(locatedSelectors.contains("page-root -> #type-selector"));
    }

    @Test
    void recursivelyInitializesNestedComponentsAndScopesChildLocatorToParent() {
        List<String> locatedSelectors = new ArrayList<>();
        PageWithNestedComponent page = new PageWithNestedComponent();

        PageFactory.initElements(page, locator("page-root", locatedSelectors));

        assertNotNull(page.filters);
        assertNotNull(page.filters.regionDropdown);
        assertEquals(
            List.of("page-root -> #filters", "page-root/#filters -> #region"),
            locatedSelectors
        );
    }

    @Test
    void rejectsFinalAnnotatedFields() {
        List<String> locatedSelectors = new ArrayList<>();
        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithFinalField(), locator("page-root", locatedSelectors)
            )
        );

        assertEquals(0, locatedSelectors.size());
        assertTrue(error.getMessage().contains("final"));
        assertTrue(error.getMessage().contains("element"));
    }

    @Test
    void initializesAnnotatedLocatorFieldsWithoutOverwritingTheRootLocator() {
        List<String> locatedSelectors = new ArrayList<>();
        Locator rootLocator = locator("page-root", locatedSelectors);
        PageWithLocatorField page = new PageWithLocatorField(rootLocator);

        PageFactory.initElements(page, rootLocator);

        assertSame(rootLocator, page.root());
        assertEquals("page-root/#status", page.statusBar().toString());
        assertEquals(List.of("page-root -> #status"), locatedSelectors);
    }

    @Test
    void reportsTheFieldChainForRecursiveComponentCycles() {
        IllegalStateException error = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithCycle(), locator("page-root", new ArrayList<>())
            )
        );

        assertTrue(error.getMessage().contains("Recursive UI component cycle"));
        assertTrue(error.getMessage().contains("CycleComponentA"));
        assertTrue(error.getMessage().contains("CycleComponentB"));
        assertTrue(error.getMessage().contains("#componentA"));
        assertTrue(error.getMessage().contains("#componentB"));
    }

    @Test
    void initializesTypedListsLazilyAndResolvesCurrentElementsForEachOperation() {
        List<String> locatedSelectors = new ArrayList<>();
        List<String> listReads = new ArrayList<>();
        AtomicReference<List<String>> matches =
            new AtomicReference<>(List.of("item-a", "item-b"));
        PageWithList page = new PageWithList();

        PageFactory.initElements(
            page, locator("page-root", locatedSelectors, listReads, matches::get)
        );

        assertTrue(listReads.isEmpty(), "PageFactory initialization must not query list items");
        assertEquals(List.of("page-root -> #field-items"), locatedSelectors);
        assertEquals(2, page.items.size());
        assertEquals(1, listReads.size());

        Iterator<RepeatedComponent> iterator = page.items.iterator();
        assertEquals(2, listReads.size());
        matches.set(List.of("item-c"));
        assertEquals("page-root/#field-items/item-a", iterator.next().selector());

        RepeatedComponent currentItem = page.items.get(0);
        assertEquals("page-root/#field-items/item-c", currentItem.selector());
        assertEquals(
            "page-root/#field-items/item-c/#child",
            currentItem.child().selector()
        );
        assertEquals(3, listReads.size());

        matches.set(List.of("item-d"));
        var streamSnapshot = page.items.stream();
        matches.set(List.of("item-e"));
        assertEquals(
            List.of("page-root/#field-items/item-d"),
            streamSnapshot.map(RepeatedComponent::selector).toList()
        );
        assertEquals(4, listReads.size());

        matches.set(List.of());
        assertTrue(page.items.isEmpty());
        assertEquals(5, listReads.size());
    }

    @Test
    void usesItemTypeSelectorAsFallbackForLists() {
        List<String> locatedSelectors = new ArrayList<>();
        PageWithFallbackList page = new PageWithFallbackList();

        PageFactory.initElements(page, locator("page-root", locatedSelectors));

        assertEquals(List.of("page-root -> #type-items"), locatedSelectors);
    }

    @Test
    void createsControlWrappersFromListItems() {
        List<String> locatedSelectors = new ArrayList<>();
        List<String> listReads = new ArrayList<>();
        PageWithControlList page = new PageWithControlList();

        PageFactory.initElements(
            page,
            locator("page-root", locatedSelectors, listReads, () -> List.of("item-a", "item-b"))
        );

        assertTrue(listReads.isEmpty());
        assertNotNull(page.controls.get(0));
        assertEquals(1, listReads.size());
    }

    @Test
    void integratesWithRealPlaywrightLocatorsAndResolvesListsLazily() {
        Playwright playwright = Playwright.create();
        try {
            Browser browser = playwright.chromium().launch(
                new BrowserType.LaunchOptions().setHeadless(true)
            );
            try {
                Page browserPage = browser.newPage();
                browserPage.setContent("<main id='root'></main>");

                BrowserPageObject pageObject = new BrowserPageObject();
                PageFactory.initElements(pageObject, browserPage.locator("#root"));
                browserPage.locator("#root").evaluate(
                    "root => root.insertAdjacentHTML('beforeend', "
                        + "'<article class=\"record\"><span class=\"label\">Alpha</span></article>"
                        + "<article class=\"record\"><span class=\"label\">Beta</span></article>')"
                );

                assertEquals(
                    List.of("Alpha", "Beta"),
                    pageObject.records.stream().map(BrowserRecord::labelText).toList()
                );

                Iterator<BrowserRecord> snapshot = pageObject.records.iterator();
                browserPage.locator("#root").evaluate(
                    "root => root.insertAdjacentHTML('beforeend', "
                        + "'<article class=\"record\"><span class=\"label\">Gamma</span></article>')"
                );
                List<String> snapshotTexts = new ArrayList<>();
                snapshot.forEachRemaining(record -> snapshotTexts.add(record.labelText()));
                assertEquals(List.of("Alpha", "Beta"), snapshotTexts);
                assertEquals(3, pageObject.records.size());
            } finally {
                browser.close();
            }
        } finally {
            playwright.close();
        }
    }

    @Test
    void rejectsRawListsAndOtherCollectionTypes() {
        IllegalStateException rawListError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithRawList(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(rawListError.getMessage().contains("concrete generic item type"));

        IllegalStateException setError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithSet(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(setError.getMessage().contains("Only List<T>"));

        IllegalStateException wildcardError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithWildcardList(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(wildcardError.getMessage().contains("concrete class"));
    }

    @Test
    void reportsInvalidAnnotatedFieldConfigurations() {
        IllegalStateException staticFieldError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithStaticField(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(staticFieldError.getMessage().contains("instance and non-final"));

        IllegalStateException blankSelectorError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithBlankSelector(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(blankSelectorError.getMessage().contains("Selector must not be blank"));

        IllegalStateException missingConstructorError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithMissingConstructor(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(
            missingConstructorError.getMessage().contains("constructor that accepts Locator")
        );

        IllegalStateException missingListConstructorError = assertThrows(
            IllegalStateException.class,
            () -> PageFactory.initElements(
                new PageWithListMissingConstructor(), locator("page-root", new ArrayList<>())
            )
        );
        assertTrue(
            missingListConstructorError.getMessage().contains("constructor that accepts Locator")
        );
    }

    private static Locator locator(String selector, List<String> locatedSelectors) {
        return locator(selector, locatedSelectors, new ArrayList<>(), List::of);
    }

    private static Locator locator(
        String selector,
        List<String> locatedSelectors,
        List<String> listReads,
        Supplier<List<String>> matches
    ) {
        return (Locator) Proxy.newProxyInstance(
            Locator.class.getClassLoader(),
            new Class<?>[]{Locator.class},
            (proxy, method, args) -> {
                if ("locator".equals(method.getName())) {
                    String childSelector = (String) args[0];
                    locatedSelectors.add(selector + " -> " + childSelector);
                    return locator(
                        selector + "/" + childSelector, locatedSelectors, listReads, matches
                    );
                }
                if ("all".equals(method.getName())) {
                    listReads.add(selector);
                    return matches.get().stream()
                        .map(item -> locator(
                            selector + "/" + item, locatedSelectors, listReads, List::of
                        ))
                        .toList();
                }
                if ("toString".equals(method.getName())) {
                    return selector;
                }
                if ("hashCode".equals(method.getName())) {
                    return System.identityHashCode(proxy);
                }
                if ("equals".equals(method.getName())) {
                    return proxy == args[0];
                }
                return null;
            }
        );
    }

    private static class PageObject {
        @FindBy("#field-selector")
        private LocatedComponent overridden;
        private LocatedComponent fallback;
    }

    private static class PageWithFinalField {
        @FindBy("#element")
        private final LocatedComponent element = null;
    }

    private static class PageWithLocatorField {
        private final Locator root;

        @FindBy("#status")
        private Locator statusBar;

        private PageWithLocatorField(Locator root) {
            this.root = root;
        }

        private Locator root() {
            return root;
        }

        private Locator statusBar() {
            return statusBar;
        }
    }

    private static class PageWithNestedComponent {
        private FilterComponent filters;
    }

    private static class PageWithCycle {
        private CycleComponentA componentA;
    }

    private static class PageWithList {
        @FindBy("#field-items")
        private List<RepeatedComponent> items;
    }

    private static class PageWithRawList {
        @FindBy("#raw-items")
        @SuppressWarnings("rawtypes")
        private List items;
    }

    private static class PageWithWildcardList {
        @FindBy("#wildcard-items")
        private List<?> items;
    }

    private static class PageWithStaticField {
        @FindBy("#static")
        private static LocatedComponent element;
    }

    private static class PageWithBlankSelector {
        @FindBy(" ")
        private LocatedComponent element;
    }

    private static class PageWithMissingConstructor {
        @FindBy("#missing-constructor")
        private ComponentWithoutLocatorConstructor element;
    }

    private static class PageWithListMissingConstructor {
        @FindBy("#missing-list-constructor")
        private List<ComponentWithoutLocatorConstructor> elements;
    }

    private static class ComponentWithoutLocatorConstructor {
    }

    private static class PageWithFallbackList {
        private List<RepeatedComponent> items;
    }

    private static class PageWithControlList {
        @FindBy("#controls")
        private List<Dropdown> controls;
    }

    private static class PageWithSet {
        @FindBy("#set-items")
        private Set<RepeatedComponent> items;
    }

    private static class BrowserPageObject {
        private List<BrowserRecord> records;
    }

    @FindBy(".record")
    public static class BrowserRecord {
        @FindBy(".label")
        private BrowserLabel label;

        public BrowserRecord(Locator locator) {
        }

        private String labelText() {
            return label.text();
        }
    }

    public static class BrowserLabel {
        private final Locator locator;

        public BrowserLabel(Locator locator) {
            this.locator = locator;
        }

        private String text() {
            return locator.textContent();
        }
    }

    @FindBy("#type-items")
    public static class RepeatedComponent {
        private final Locator locator;

        @FindBy("#child")
        private LocatedComponent child;

        public RepeatedComponent(Locator locator) {
            this.locator = locator;
        }

        private String selector() {
            return locator.toString();
        }

        private LocatedComponent child() {
            return child;
        }
    }

    @FindBy("#componentA")
    public static class CycleComponentA {
        @FindBy("#componentB")
        private CycleComponentB componentB;

        public CycleComponentA(Locator locator) {
        }
    }

    @FindBy("#componentB")
    public static class CycleComponentB {
        @FindBy("#componentA")
        private CycleComponentA componentA;

        public CycleComponentB(Locator locator) {
        }
    }

    @FindBy("#filters")
    public static class FilterComponent {
        @FindBy("#region")
        private Dropdown regionDropdown;

        public FilterComponent(Locator locator) {
        }
    }

    @FindBy("#type-selector")
    public static class LocatedComponent {
        private final Locator locator;

        public LocatedComponent(Locator locator) {
            this.locator = locator;
        }

        private String selector() {
            return locator.toString();
        }
    }
}
