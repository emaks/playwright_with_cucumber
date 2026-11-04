package io.materialspace.framework.ui.pagefactory;

import com.microsoft.playwright.Locator;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiFunction;

final class LazyLocatorList {
    private LazyLocatorList() {
    }

    static List<?> create(
        Locator locator,
        String fieldDescription,
        String selector,
        BiFunction<Integer, Locator, Object> itemFactory
    ) {
        InvocationHandler handler = (proxy, method, arguments) -> {
            if (method.getDeclaringClass() == Object.class && method.getName().equals("toString")) {
                return "Lazy UI list " + fieldDescription + " (" + selector + ")";
            }

            List<Object> elements = new ArrayList<>();
            List<Locator> elementLocators = locator.all();
            for (int index = 0; index < elementLocators.size(); index++) {
                elements.add(itemFactory.apply(index, elementLocators.get(index)));
            }

            try {
                return method.invoke(elements, arguments);
            } catch (InvocationTargetException exception) {
                throw exception.getCause();
            } catch (IllegalAccessException exception) {
                throw new IllegalStateException(
                    "Cannot initialize " + fieldDescription + " for selector '" + selector
                        + "': Cannot invoke List operation",
                    exception
                );
            }
        };
        return (List<?>) Proxy.newProxyInstance(
            List.class.getClassLoader(),
            new Class<?>[]{List.class},
            handler
        );
    }
}
