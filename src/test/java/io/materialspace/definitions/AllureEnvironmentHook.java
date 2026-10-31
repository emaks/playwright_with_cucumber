package io.materialspace.definitions;

import io.cucumber.java.BeforeAll;
import io.materialspace.lib.utils.PropertyLoader;
import io.qameta.allure.util.PropertiesUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public class AllureEnvironmentHook {
    @BeforeAll
    public static void writeEnvironmentProperties() throws IOException {
        Properties allureProperties = PropertiesUtils.loadAllureProperties();
        Path resultsDirectory = Path.of(
            allureProperties.getProperty("allure.results.directory", "allure-results")
        );
        if (!resultsDirectory.isAbsolute()) {
            resultsDirectory = Path.of(System.getProperty("user.dir")).resolve(resultsDirectory);
        }

        Files.createDirectories(resultsDirectory);
        Properties environment = new Properties();
        environment.putAll(PropertyLoader.getAll());
        try (var output = Files.newOutputStream(resultsDirectory.resolve("environment.properties"))) {
            environment.store(output, "Test environment");
        }
    }
}
