package io.materialspace.salesanalytics.api.models;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
public class TransactionsResponse {
    private List<Transaction> data;
    private Meta meta;

    @Data
    @NoArgsConstructor
    public static class Transaction {
        private String id;
        private String date;
        private String region;
        private String category;
        private BigDecimal revenue;
    }

    @Data
    @NoArgsConstructor
    public static class Meta {
        private int total;
        private int returned;
        private Filters filters;
    }

    @Data
    @NoArgsConstructor
    public static class Filters {
        private String dateRange;
        private String region;
        private String category;
        private String sort;
    }
}
