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
     * - If "results" array is missing/null → treat as 0 findings
     * - If severity is missing/null → default to INFO (low)
     * - Semgrep severity values: CRITICAL, ERROR (→ high), WARNING (→ medium), INFO (→ low)
     */
    public FindingCounts parse(String json) {
        if (json == null || json.isBlank()) {
            log.warn("Semgrep JSON output is null or empty — returning 0 findings");
            return new FindingCounts(0, 0, 0, 0);
        }

        int critical = 0, high = 0, medium = 0, low = 0;

        try {
            JsonNode root = objectMapper.readTree(json);
            
            // STRICT NULL-CHECK: results array may be missing or null
            JsonNode results = root.path("results");
            if (results == null || results.isMissingNode()) {
                log.warn("Semgrep 'results' field is missing — no findings found");
                return new FindingCounts(0, 0, 0, 0);
            }

            if (!results.isArray()) {
                log.warn("Semgrep 'results' field is not an array — no findings found");
                return new FindingCounts(0, 0, 0, 0);
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
        } catch (Exception e) {
            log.error("Failed to parse Semgrep JSON output: {}", e.getMessage(), e);
            // Return 0 findings rather than crashing on malformed JSON
            return new FindingCounts(0, 0, 0, 0);
        }

        log.info("Semgrep findings — critical:{} high:{} medium:{} low:{}", critical, high, medium, low);
        return new FindingCounts(critical, high, medium, low);
    }
}
