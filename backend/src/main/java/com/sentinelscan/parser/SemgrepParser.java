package com.sentinelscan.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SemgrepParser {

    private final ObjectMapper objectMapper;

    /**
     * Parses Semgrep JSON output and returns severity counts.
     * Implements strict null-checking per requirements:
     * - If "results" array is missing/null → throw exception
     * - If severity is missing/null → default to INFO (low)
     * - Semgrep severity values: CRITICAL, ERROR (→ high), WARNING (→ medium), INFO (→ low)
     */
    public FindingCounts parse(String json) throws com.fasterxml.jackson.core.JsonProcessingException {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException("Semgrep JSON output is null or empty");
        }

        int critical = 0, high = 0, medium = 0, low = 0;

        JsonNode root = objectMapper.readTree(json);
        
        // STRICT NULL-CHECK: results array may be missing or null
        JsonNode results = root.path("results");
        if (results == null || results.isMissingNode()) {
            throw new IllegalArgumentException("Semgrep 'results' field is missing");
        }

        if (!results.isArray()) {
            throw new IllegalArgumentException("Semgrep 'results' field is not an array");
        }

        // Count each finding by severity
        for (JsonNode result : results) {
            if (result == null) {
                continue;
            }

            // Navigate to extra.severity path with strict null-checking
            JsonNode extra = result.path("extra");
            if (extra == null || extra.isMissingNode()) {
                // Default to LOW if "extra" field missing
                low++;
                continue;
            }

            // STRICT NULL-CHECK: severity field may be missing — default to INFO (low)
            String severity = extra.path("severity").asText("INFO");
            if (severity == null || severity.isBlank()) {
                severity = "INFO";
            }
            
            severity = severity.toUpperCase();
            switch (severity) {
                case "CRITICAL" -> critical++;
                case "ERROR", "HIGH" -> high++;
                case "WARNING", "MEDIUM" -> medium++;
                case "INFO", "LOW" -> low++;
                default -> {
                    log.debug("Unknown Semgrep severity: {}", severity);
                    low++;
                }
            }
        }

        log.info("Semgrep findings — critical:{} high:{} medium:{} low:{}", critical, high, medium, low);
        return new FindingCounts(critical, high, medium, low);
    }
}
