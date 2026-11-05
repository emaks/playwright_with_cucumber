@REQ_STORY-002 @api
Feature: Filter Sales Transactions

    @TEST_BE-CASE-001
    Scenario Outline: Send a GET request to the transactions endpoint with a '<filterName>' filter
        When I send a GET request to the 'transactions' endpoint with these parameters:
            | <filterName> | <value> |
        Then the response status code should be 200
        And the response should contain only transactions matching:
            | <filterName> | <value> |

        Examples:
            | filterName | value     |
            | region     | Europe    |
            | category   | Furniture |
