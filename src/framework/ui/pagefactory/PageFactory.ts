import type {Locator} from "playwright";
import {
    type ElementConstructor,
    type FieldDeclaration,
    type FieldFindByOptions,
    getClassSelector,
    getFieldDeclarations
} from "./FindBy.js";
import {LocatorList} from "./LocatorList.js";

export interface LocatorRoot {
  locator(selector: string): Locator;
}

export class PageFactory {
  static initElements<T extends object>(pageObject: T, root: LocatorRoot): void {
    if (pageObject === null || typeof pageObject !== "object") {
      throw new TypeError("Page object must not be null");
    }
    initializeFields(pageObject, (selector) => root.locator(selector), new Set(), []);
  }

  private constructor() {}
}

function initializeFields(
  pageObject: object,
  locate: (selector: string) => Locator,
  activeTypes: Set<object>,
  path: string[]
): void {
  const pageType = (pageObject as { constructor: object }).constructor;
  activeTypes.add(pageType);
  path.push(className(pageType));
  try {
    for (const declaration of getFieldDeclarations(pageType)) {
      initializeField(pageObject, declaration, locate, activeTypes, path);
    }
  } finally {
    path.pop();
    activeTypes.delete(pageType);
  }
}

function initializeField(
  target: object,
  declaration: FieldDeclaration,
  locate: (selector: string) => Locator,
  activeTypes: Set<object>,
  path: string[]
): void {
  const description = `${className((target as { constructor: object }).constructor)}#${String(declaration.name)}`;
  const selector = resolveSelector(declaration.options, description);
  if (selector.trim().length === 0) {
    throw initializationError(description, selector, "Selector must not be blank");
  }
  const parentScopedLocator = locate(selector);
  const options = declaration.options;

  let element: unknown;
  if ("locator" in options) {
    element = parentScopedLocator;
  } else if ("listItem" in options) {
    const itemType = options.listItem;
    validateConstructor(itemType, description, selector);
    element = new LocatorList(
      parentScopedLocator,
      description,
      selector,
      (index, itemLocator) => createAndInitialize(
        itemType,
        itemLocator,
        `${description}[${index}]`,
        selector,
        new Set(),
        []
      )
    );
  } else {
    const elementType = options.type;
    if (activeTypes.has(elementType)) {
      const cycle = [...path, `${description} -> ${className(elementType)}`].join(" -> ");
      throw initializationError(
        description,
        selector,
        `Recursive UI component cycle: ${cycle}`
      );
    }
    element = createAndInitialize(
      elementType,
      parentScopedLocator,
      description,
      selector,
      activeTypes,
      path
    );
  }

  Object.defineProperty(target, declaration.name, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: element
  });
}

function createAndInitialize<T extends object>(
  type: ElementConstructor<T>,
  locator: Locator,
  description: string,
  selector: string,
  activeTypes: Set<object>,
  path: string[]
): T {
  validateConstructor(type, description, selector);
  let element: T;
  try {
    element = new type(locator);
  } catch (error) {
    throw initializationError(description, selector, "Cannot create field value", error);
  }

  path.push(description);
  try {
    initializeFields(element, (childSelector) => locator.locator(childSelector), activeTypes, path);
  } finally {
    path.pop();
  }
  return element;
}

function validateConstructor(
  type: ElementConstructor,
  description: string,
  selector: string
): void {
  if (typeof type !== "function") {
    throw initializationError(description, selector, "Field type must be a concrete class");
  }
}

function resolveSelector(options: FieldFindByOptions, description: string): string {
  if (options.selector !== undefined) return options.selector;
  const elementType = "type" in options ? options.type : "listItem" in options ? options.listItem : undefined;
  const selector = elementType === undefined ? undefined : getClassSelector(elementType);
  if (selector === undefined) {
    throw initializationError(
      description,
      "<missing>",
      "A field selector or class-level @FindBy selector is required"
    );
  }
  return selector;
}

function className(type: object): string {
  if ("name" in type && typeof type.name === "string") return type.name;
  return "UnknownClass";
}

function initializationError(
  description: string,
  selector: string,
  reason: string,
  cause?: unknown
): Error {
  const message = `Cannot initialize ${description} for selector '${selector}': ${reason}`;
  return cause === undefined
    ? new Error(message)
    : new Error(message, { cause });
}
