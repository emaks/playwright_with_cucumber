package io.materialspace.framework.ui.pagefactory;

import com.microsoft.playwright.Locator;
import io.materialspace.framework.ui.PageWrapper;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.lang.reflect.WildcardType;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

final class PageObjectInitializer {
    private PageObjectInitializer() {
    }

    static void initElements(Object pageObject, Locator rootLocator) {
        Objects.requireNonNull(pageObject, "Page object must not be null");
        Objects.requireNonNull(rootLocator, "Root locator must not be null");

        initializeFields(pageObject, rootLocator::locator, new HashSet<>(), new ArrayList<>());
    }

    static void initElements(Object pageObject, PageWrapper rootPage) {
        Objects.requireNonNull(pageObject, "Page object must not be null");
        Objects.requireNonNull(rootPage, "Root page must not be null");

        initializeFields(pageObject, rootPage::locator, new HashSet<>(), new ArrayList<>());
    }

    private static void initializeFields(
        Object pageObject,
        Function<String, Locator> locatorFactory,
        Set<Class<?>> activeTypes,
        List<String> initializationPath
    ) {
        Class<?> pageType = pageObject.getClass();
        activeTypes.add(pageType);
        initializationPath.add(pageType.getName());
        try {
            for (Class<?> type = pageObject.getClass(); type != Object.class; type = type.getSuperclass()) {
                for (Field field : type.getDeclaredFields()) {
                    FindBy fieldAnnotation = field.getAnnotation(FindBy.class);
                    Class<?> elementType = getElementType(field, fieldAnnotation);
                    if (elementType == null) {
                        continue;
                    }
                    FindBy typeAnnotation = elementType.getAnnotation(FindBy.class);
                    if (fieldAnnotation == null && typeAnnotation == null) {
                        continue;
                    }

                    String selector = fieldAnnotation != null
                        ? fieldAnnotation.value()
                        : typeAnnotation.value();
                    initializeField(
                        pageObject,
                        field,
                        elementType,
                        field.getType() == List.class,
                        selector,
                        locatorFactory,
                        activeTypes,
                        initializationPath
                    );
                }
            }
        } finally {
            initializationPath.removeLast();
            activeTypes.remove(pageType);
        }
    }

    private static void initializeField(
        Object target,
        Field field,
        Class<?> elementType,
        boolean listField,
        String selector,
        Function<String, Locator> locatorFactory,
        Set<Class<?>> activeTypes,
        List<String> initializationPath
    ) {
        String fieldDescription = field.getDeclaringClass().getName() + "#" + field.getName();
        if (Modifier.isStatic(field.getModifiers()) || Modifier.isFinal(field.getModifiers())) {
            throw initializationError(
                fieldDescription, selector, "Annotated fields must be instance and non-final"
            );
        }
        if (selector == null || selector.isBlank()) {
            throw initializationError(fieldDescription, selector, "Selector must not be blank");
        }
        if (!listField && activeTypes.contains(elementType)) {
            List<String> cycle = new ArrayList<>(initializationPath);
            cycle.add(fieldDescription + " -> " + elementType.getName());
            throw initializationError(
                fieldDescription,
                selector,
                "Recursive UI component cycle: " + String.join(" -> ", cycle)
            );
        }

        Locator elementLocator = locatorFactory.apply(selector);
        Object element;
        if (listField) {
            getLocatorConstructor(elementType, fieldDescription, selector);
            element = LazyLocatorList.create(
                elementLocator,
                fieldDescription,
                selector,
                (index, itemLocator) -> {
                    String itemDescription = fieldDescription + "[" + index + "]";
                    Object item = createElement(
                        elementType, itemLocator, itemDescription, selector
                    );
                    initializeFields(
                        item, itemLocator::locator, new HashSet<>(), new ArrayList<>()
                    );
                    return item;
                }
            );
        } else if (elementType == Locator.class) {
            element = elementLocator;
        } else {
            element = createElement(elementType, elementLocator, fieldDescription, selector);
            initializationPath.add(fieldDescription);
            try {
                initializeFields(
                    element, elementLocator::locator, activeTypes, initializationPath
                );
            } finally {
                initializationPath.removeLast();
            }
        }

        if (!field.trySetAccessible()) {
            throw initializationError(fieldDescription, selector, "Field is not accessible");
        }
        try {
            field.set(target, element);
        } catch (IllegalAccessException exception) {
            throw initializationError(fieldDescription, selector, "Cannot assign field", exception);
        }
    }

    private static Class<?> getElementType(Field field, FindBy fieldAnnotation) {
        Class<?> fieldType = field.getType();
        if (fieldType == List.class) {
            if (!(field.getGenericType() instanceof ParameterizedType parameterizedType)) {
                if (fieldAnnotation != null) {
                    throw initializationError(
                        field.getDeclaringClass().getName() + "#" + field.getName(),
                        fieldAnnotation.value(),
                        "List field must declare a concrete generic item type"
                    );
                }
                return null;
            }

            Type itemType = parameterizedType.getActualTypeArguments()[0];
            if (itemType instanceof Class<?> itemClass) {
                return itemClass;
            }
            if (fieldAnnotation != null || hasAnnotatedType(itemType)) {
                throw initializationError(
                    field.getDeclaringClass().getName() + "#" + field.getName(),
                    fieldAnnotation == null ? null : fieldAnnotation.value(),
                    "List item type must be a concrete class"
                );
            }
            return null;
        }

        if (Collection.class.isAssignableFrom(fieldType)) {
            if (fieldAnnotation != null || hasAnnotatedCollectionItemType(field)) {
                throw initializationError(
                    field.getDeclaringClass().getName() + "#" + field.getName(),
                    fieldAnnotation == null ? null : fieldAnnotation.value(),
                    "Only List<T> collection fields are supported"
                );
            }
            return null;
        }

        return fieldType;
    }

    private static boolean hasAnnotatedCollectionItemType(Field field) {
        if (!(field.getGenericType() instanceof ParameterizedType parameterizedType)) {
            return false;
        }
        Type itemType = parameterizedType.getActualTypeArguments()[0];
        return hasAnnotatedType(itemType);
    }

    private static boolean hasAnnotatedType(Type type) {
        if (type instanceof Class<?> typeClass) {
            return typeClass.isAnnotationPresent(FindBy.class);
        }
        if (type instanceof ParameterizedType parameterizedType) {
            Type rawType = parameterizedType.getRawType();
            return rawType instanceof Class<?> rawClass
                && rawClass.isAnnotationPresent(FindBy.class);
        }
        if (type instanceof WildcardType wildcardType) {
            for (Type bound : wildcardType.getUpperBounds()) {
                if (hasAnnotatedType(bound)) {
                    return true;
                }
            }
            for (Type bound : wildcardType.getLowerBounds()) {
                if (hasAnnotatedType(bound)) {
                    return true;
                }
            }
        }
        if (type instanceof TypeVariable<?> typeVariable) {
            for (Type bound : typeVariable.getBounds()) {
                if (hasAnnotatedType(bound)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static Object createElement(
        Class<?> elementType,
        Locator locator,
        String fieldDescription,
        String selector
    ) {
        Constructor<?> constructor = getLocatorConstructor(elementType, fieldDescription, selector);
        try {
            return constructor.newInstance(locator);
        } catch (InstantiationException | IllegalAccessException | IllegalArgumentException
                 | InvocationTargetException exception) {
            Throwable cause = exception instanceof InvocationTargetException invocation
                && invocation.getCause() != null
                ? invocation.getCause()
                : exception;
            throw initializationError(
                fieldDescription, selector, "Cannot create field value", cause
            );
        }
    }

    private static Constructor<?> getLocatorConstructor(
        Class<?> elementType,
        String fieldDescription,
        String selector
    ) {
        if (elementType.isInterface() || Modifier.isAbstract(elementType.getModifiers())) {
            throw initializationError(
                fieldDescription, selector, "Field type must be a concrete class"
            );
        }
        Constructor<?> constructor;
        try {
            constructor = elementType.getDeclaredConstructor(Locator.class);
        } catch (NoSuchMethodException exception) {
            throw initializationError(
                fieldDescription,
                selector,
                "Field type must have a constructor that accepts Locator",
                exception
            );
        }

        if (!constructor.trySetAccessible()) {
            throw initializationError(
                fieldDescription, selector, "Locator constructor is not accessible"
            );
        }
        return constructor;
    }

    private static IllegalStateException initializationError(
        String fieldDescription,
        String selector,
        String message
    ) {
        return initializationError(fieldDescription, selector, message, null);
    }

    private static IllegalStateException initializationError(
        String fieldDescription,
        String selector,
        String message,
        Throwable cause
    ) {
        String error = "Cannot initialize " + fieldDescription
            + " for selector '" + selector + "': " + message;
        return cause == null
            ? new IllegalStateException(error)
            : new IllegalStateException(error, cause);
    }
}
