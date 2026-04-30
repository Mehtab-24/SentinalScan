package com.sentinelscan.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bug condition exploration tests for TrivyParser.
 *
 * These tests encode the EXPECTED (correct) behavior.
 * On UNFIXED code they are expected to FAIL — failure confirms Bug 5 exists.
 * After fixes are applied, these same tests should PASS.
 *
 * Bug 5 — Fragile JSON Parsing: isBugCondition_NullVulnerabilities —
 *   result.path("Vulnerabilities").isNull() OR isMissingNode() causes NPE.
 */
class TrivyParserTest {

    private final TrivyParser trivyParser = new TrivyParser(new ObjectMapper());

    /**
     * Bug 5a — Null Vulnerabilities exploration.
     *
     * Calls parse() with JSON where the Vulnerabilities field is explicitly null.
     * isBugCondition_NullVulnerabilities: resultNode.path("Vulnerabilities").isNull() == true
     *
     * Expected (correct) behavior: no exception thrown, total count == 0.
     * On UNFIXED code: throws NullPointerException — confirms Bug 5.
     *
     * Validates: Requirements 1.5, 2.5
     */
    @Test
    void bug5a_nullVulnerabilities_shouldReturnZeroCountsWithoutException() {
        String json = "{\"Results\":[{\"Target\":\"test\",\"Vulnerabilities\":null}]}";

        FindingCounts counts = assertDoesNotThrow(
                () -> trivyParser.parse(json),
                "Bug 5a confirmed: parse() threw an exception on null Vulnerabilities"
        );

        int total = counts.critical() + counts.high() + counts.medium() + counts.low();
        assertEquals(0, total,
                "Expected total count of 0 for null Vulnerabilities but got: " + total);
    }

    /**
     * Bug 5b — Missing Vulnerabilities exploration.
     *
     * Calls parse() with JSON where the Vulnerabilities key is absent entirely.
     * isBugCondition_NullVulnerabilities: resultNode.path("Vulnerabilities").isMissingNode() == true
     *
     * Expected (correct) behavior: no exception thrown, total count == 0.
     * On UNFIXED code: throws NullPointerException — confirms Bug 5.
     *
     * Validates: Requirements 1.5, 2.5
     */
    @Test
    void bug5b_missingVulnerabilities_shouldReturnZeroCountsWithoutException() {
        String json = "{\"Results\":[{\"Target\":\"test\"}]}";

        FindingCounts counts = assertDoesNotThrow(
                () -> trivyParser.parse(json),
                "Bug 5b confirmed: parse() threw an exception on missing Vulnerabilities key"
        );

        int total = counts.critical() + counts.high() + counts.medium() + counts.low();
        assertEquals(0, total,
                "Expected total count of 0 for missing Vulnerabilities but got: " + total);
    }

    // -------------------------------------------------------------------------
    // Preservation tests — these verify non-buggy inputs produce correct results
    // and MUST PASS on both unfixed and fixed code.
    // -------------------------------------------------------------------------

    /**
     * Preservation — Valid Vulnerabilities array.
     *
     * Calls parse() with JSON containing a result entry with a valid non-null
     * Vulnerabilities array.
     * isBugCondition_NullVulnerabilities is false — Vulnerabilities is a valid array.
     *
     * Expected behavior:
     * - No exception thrown
     * - counts.high() == 1
     * - counts.critical() == 1
     * - counts.medium() == 1
     * - total == 3
     *
     * Validates: Requirements 3.3, 3.4
     */
    @Test
    void preservation_validVulnerabilities_shouldCountSeveritiesCorrectly() {
        String json = "{\"Results\":[{\"Target\":\"go.sum\",\"Vulnerabilities\":[" +
                "{\"Severity\":\"HIGH\"}," +
                "{\"Severity\":\"CRITICAL\"}," +
                "{\"Severity\":\"MEDIUM\"}" +
                "]}]}";

        FindingCounts counts = assertDoesNotThrow(
                () -> trivyParser.parse(json),
                "parse() threw an exception on valid Vulnerabilities array"
        );

        assertEquals(1, counts.critical(),
                "Expected critical count of 1 but got: " + counts.critical());
        assertEquals(1, counts.high(),
                "Expected high count of 1 but got: " + counts.high());
        assertEquals(1, counts.medium(),
                "Expected medium count of 1 but got: " + counts.medium());

        int total = counts.critical() + counts.high() + counts.medium() + counts.low();
        assertEquals(3, total,
                "Expected total count of 3 but got: " + total);
    }

    /**
     * Preservation — Severity counting across multiple vulnerabilities.
     *
     * Calls parse() with JSON containing multiple vulnerabilities of different severities.
     * isBugCondition_NullVulnerabilities is false — Vulnerabilities is a valid array.
     *
     * Expected behavior:
     * - counts.critical() == 2
     * - counts.high() == 1
     * - counts.medium() == 3
     * - counts.low() == 1
     *
     * Validates: Requirements 3.3, 3.4
     */
    @Test
    void preservation_severityCounting_shouldCountEachSeverityBucketCorrectly() {
        String json = "{\"Results\":[{\"Target\":\"package-lock.json\",\"Vulnerabilities\":[" +
                "{\"Severity\":\"CRITICAL\"}," +
                "{\"Severity\":\"CRITICAL\"}," +
                "{\"Severity\":\"HIGH\"}," +
                "{\"Severity\":\"MEDIUM\"}," +
                "{\"Severity\":\"MEDIUM\"}," +
                "{\"Severity\":\"MEDIUM\"}," +
                "{\"Severity\":\"LOW\"}" +
                "]}]}";

        FindingCounts counts = assertDoesNotThrow(
                () -> trivyParser.parse(json),
                "parse() threw an exception on valid Vulnerabilities array"
        );

        assertEquals(2, counts.critical(),
                "Expected critical count of 2 but got: " + counts.critical());
        assertEquals(1, counts.high(),
                "Expected high count of 1 but got: " + counts.high());
        assertEquals(3, counts.medium(),
                "Expected medium count of 3 but got: " + counts.medium());
        assertEquals(1, counts.low(),
                "Expected low count of 1 but got: " + counts.low());
    }
}
