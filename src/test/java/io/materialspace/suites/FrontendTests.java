package io.materialspace.suites;

import org.junit.platform.suite.api.ConfigurationParametersResource;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectPackages;
import org.junit.platform.suite.api.Suite;

@Suite(failIfNoTests = false)
@IncludeEngines("cucumber")
@SelectPackages("features.fe")
@ConfigurationParametersResource("cucumber.properties")
public class FrontendTests {

}
