package com.sentinelscan.parser;

/**
 * Aggregated finding counts across all severity levels from a single tool scan.
 */
public record FindingCounts(int critical, int high, int medium, int low) {

    public static FindingCounts empty() {
        return new FindingCounts(0, 0, 0, 0);
    }
}
