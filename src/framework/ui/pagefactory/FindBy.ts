import type {Locator} from "playwright";
import type {LocatorList} from "./LocatorList.js";

export type ElementConstructor<T extends object = object> = new (root: Locator) => T;

export interface ClassFindByOptions {
  readonly selector: string;
}

export type FieldFindByOptions =
  | {
      readonly selector?: string;
      readonly type: ElementConstructor;
    }
  | {
      readonly selector?: string;
      readonly locator: true;
    }
  | {
      readonly selector?: string;
      readonly listItem: ElementConstructor;
    };

export interface FieldDeclaration {
  readonly name: string | symbol;
  readonly options: FieldFindByOptions;
  readonly static: boolean;
  readonly private: boolean;
}

const classSelectors = new WeakMap<object, string>();
const fieldDeclarations = new WeakMap<object, FieldDeclaration[]>();

export function FindBy(options: ClassFindByOptions): ClassDecoratorFunction;
export function FindBy<T extends ElementConstructor>(
  options: ComponentFieldOptions<T>
): FieldDecoratorFunction<InstanceType<T>>;
export function FindBy<T extends ElementConstructor>(
  options: ListFieldOptions<T>
): FieldDecoratorFunction<LocatorList<InstanceType<T>>>;
export function FindBy(options: LocatorFieldOptions): FieldDecoratorFunction<Locator>;
export function FindBy(
  options: ClassFindByOptions | FieldFindByOptions
): ClassDecoratorFunction | FieldDecoratorFunction<unknown> {
  if ("selector" in options && !("type" in options || "locator" in options || "listItem" in options)) {
    return (value: object, _context: ClassDecoratorContext) => {
      classSelectors.set(value, options.selector);
    };
  }
  if (!("type" in options || "locator" in options || "listItem" in options)) {
    throw new TypeError("@FindBy on a field requires an explicit type, locator, or listItem");
  }

  const fieldDecorator: FieldDecoratorFunction<unknown> = function <This, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>
  ): void {
    if (context.static || context.private) {
      throw new TypeError("@FindBy fields must be public instance fields");
    }

    const declaration: FieldDeclaration = {
      name: context.name,
      options,
      static: context.static,
      private: context.private
    };
    context.addInitializer(function (this: This) {
      if (typeof this !== "object" || this === null) {
        throw new TypeError("@FindBy field initializer requires an instance");
      }
      const owner = (this as { constructor: object }).constructor;
      const declarations = fieldDeclarations.get(owner) ?? [];
      if (!declarations.some((field) => field.name === declaration.name)) {
        declarations.push(declaration);
      }
      fieldDeclarations.set(owner, declarations);
    });
  };
  return fieldDecorator;
}

export function getClassSelector(type: object): string | undefined {
  return classSelectors.get(type);
}

export function getFieldDeclarations(type: object): readonly FieldDeclaration[] {
  return fieldDeclarations.get(type) ?? [];
}

type ClassDecoratorFunction = (
  value: object,
  context: ClassDecoratorContext
) => void;
type FieldDecoratorFunction<T> = <This, Value extends T>(
  value: undefined,
  context: ClassFieldDecoratorContext<This, Value>
) => void;

type LocatorConstructorCheck<T extends ElementConstructor> =
  ConstructorParameters<T> extends [Locator, ...unknown[]] ? unknown : never;
type ComponentFieldOptions<T extends ElementConstructor> = {
  readonly selector?: string;
  readonly type: T & LocatorConstructorCheck<T>;
};
type ListFieldOptions<T extends ElementConstructor> = {
  readonly selector?: string;
  readonly listItem: T & LocatorConstructorCheck<T>;
};
type LocatorFieldOptions = {
  readonly selector?: string;
  readonly locator: true;
};
