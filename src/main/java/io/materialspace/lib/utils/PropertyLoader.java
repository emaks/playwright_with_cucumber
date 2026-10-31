package io.materialspace.lib.utils;

import lombok.SneakyThrows;

import java.io.InputStream;
import java.util.Map;
import java.util.Properties;
import java.util.TreeMap;

public class PropertyLoader {

    private static final String[] RUNTIME_PROPERTIES = {"headless", "threads", "tag"};

    private static final ThreadLocal<Properties> properties = new ThreadLocal<>() {
        @Override
        @SneakyThrows
        protected synchronized Properties initialValue() {
            String env = System.getProperty("env", "local");
            String browser = System.getProperty("browser", "chromium");

            ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
            try (InputStream stream =
                     classLoader.getResourceAsStream("configs/" + env + ".properties")) {
                if (stream == null) {
                    throw new RuntimeException(
                        "Can not find '" + env + ".properties' file in ./resources/configs folder"
                    );
                }
                Properties properties = new Properties();
                properties.load(stream);
                properties.setProperty("env", env);
                properties.setProperty("browser", browser);
                return properties;
            }
        }
    };

    public static String get(String propertyName) {
        return System.getProperty(propertyName, properties.get().getProperty(propertyName));
    }

    public static Map<String, String> getAll() {
        Properties loadedProperties = properties.get();
        Map<String, String> values = new TreeMap<>();
        for (String propertyName : loadedProperties.stringPropertyNames()) {
            values.put(propertyName, get(propertyName));
        }
        for (String propertyName : RUNTIME_PROPERTIES) {
            String value = System.getProperty(propertyName);
            if (value != null) {
                values.put(propertyName, value);
            }
        }
        return values;
    }
}
