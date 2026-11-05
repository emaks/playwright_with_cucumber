@acceptance
Feature: Cucumber runtime acceptance

  @parallel
  Scenario: first parallel scenario
    Given I record parallel work "first"

  @parallel
  Scenario: second parallel scenario
    Given I record parallel work "second"

  @retry-once
  Scenario: retry succeeds after its first attempt
    When I fail once on the first attempt

  @permanent
  Scenario: permanent failure reaches the retry limit
    When I always fail

  @retry-zero
  Scenario: retry zero executes once
    When I always fail

  @api @api-transport
  Scenario: API transport failure is attached and propagated
    When I trigger a controlled API transport failure

  @rerun
  Scenario Outline: rerun selects only the failed row "<outcome>"
    When I evaluate rerun row "<outcome>"

    Examples:
      | outcome |
      | failure |
      | success |

  @ui @ui-retry
  Scenario: UI retry creates new resources and captures the failed attempt
    When I open the UI and fail once
