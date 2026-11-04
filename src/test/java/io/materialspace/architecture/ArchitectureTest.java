package io.materialspace.architecture;

import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "io.materialspace")
class ArchitectureTest {
    @ArchTest
    static final ArchRule frameworkDoesNotDependOnSalesAnalyticsOrTestCode = noClasses()
        .that()
        .resideInAPackage("io.materialspace.framework..")
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(
            "io.materialspace.salesanalytics..",
            "io.materialspace.testsupport..",
            "io.materialspace.steps..",
            "io.materialspace.definitions..",
            "io.materialspace.suites.."
        );

    @ArchTest
    static final ArchRule salesAnalyticsModuleDoesNotDependOnTestSupport = noClasses()
        .that()
        .resideInAnyPackage(
            "io.materialspace.salesanalytics.api..",
            "io.materialspace.salesanalytics.ui.."
        )
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage("io.materialspace.testsupport..");
}
