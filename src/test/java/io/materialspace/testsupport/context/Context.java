package io.materialspace.testsupport.context;

import java.util.HashMap;
import java.util.Map;

public class Context {
    private final Map<ContextKey, Object> scenarioContext = new HashMap<>();

    public void set(ContextKey key, Object value) {
        scenarioContext.put(key, value);
    }

    public <T> T get(ContextKey key) {
        //noinspection unchecked
        return (T) scenarioContext.get(key);
    }

    public boolean hasValue(ContextKey key) {
        return scenarioContext.containsKey(key);
    }
}
