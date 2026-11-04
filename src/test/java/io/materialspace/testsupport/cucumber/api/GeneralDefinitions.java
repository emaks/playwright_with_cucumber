package io.materialspace.testsupport.cucumber.api;

import io.cucumber.java.en.Then;
import io.materialspace.framework.api.ApiResponse;
import io.materialspace.testsupport.context.Context;
import io.materialspace.testsupport.context.ContextKey;
import lombok.AllArgsConstructor;
import org.assertj.core.api.Assertions;

@AllArgsConstructor
public class GeneralDefinitions {
    private final Context context;

    @Then("the response status code should be {int}")
    public void responseShouldHaveStatusCode(int expectedStatusCode) {
        ApiResponse response = context.get(ContextKey.RESPONSE);
        Assertions.assertThat(response.getStatusCode())
            .as("Expected status code to be %d but was %d",
                expectedStatusCode, response.getStatusCode())
            .isEqualTo(expectedStatusCode);
    }
}
