@REQ_STORY-001 @ui
Feature: Filter Sales Transactions

    @TEST_FE-CASE-001
    Scenario Outline: Filter transactions using a single filter: '<filterName>'
        Given I open the 'Sales Transactions' page
        When I select the following filter values:
            | <filterName> | <value> |
        And I click the 'Apply' button
        Then I should see transactions in the grid matching:
            | <columnName> | <value> |

        Examples:
            | filterName | columnName | value     |
            | REGION     | REGION     | Europe    |
            | CATEGORY   | CATEGORY   | Furniture |

    @TEST_FE-CASE-002
    Scenario Outline: Filter transactions using multiple filters: '<filterName1>' and '<filterName2>'
        Given I open the 'Sales Transactions' page
        When I select the following filter values:
            | <filterName1> | <value1> |
            | <filterName2> | <value2> |
        And I click the 'Apply' button
        Then I should see transactions in the grid matching:
            | <columnName1> | <value1> |
            | <columnName2> | <value2> |

        Examples:
            | filterName1 | filterName2 | columnName1 | columnName2 | value1 | value2    |
            | REGION      | CATEGORY    | REGION      | CATEGORY    | Europe | Furniture |
