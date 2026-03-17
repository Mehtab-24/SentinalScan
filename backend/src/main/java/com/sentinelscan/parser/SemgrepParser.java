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
     * Semgrep exit codes: 0 = no findings, 1 = findings present, 2+ = error.
     * Extra.severity values: CRITICAL, ERROR (→ high), WARNING (→ medium), INFO (→ low).
     */
    public FindingCounts parse(String json) {
        if (json == null || json.isBlank()) {
            return new FindingCounts(0, 0, 0, 0);
        }

        int critical = 0, high = 0, medium = 0, low = 0;

        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode results = root.path("results");

            if (results.isArray()) {
                for (JsonNode result : results) {
                    String severity = result.path("extra").path("severity").asText("INFO").toUpperCase();
                    switch (severity) {
                        case "CRITICAL"         -> critical++;
                        case "ERROR", "HIGH"    -> high++;
                        case "WARNING", "MEDIUM" -> medium++;
                        default                 -> low++;  // INFO, LOW, unknown
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse Semgrep output: {}", e.getMessage());
        }

        log.info("Semgrep findings — critical:{} high:{} medium:{} low:{}", critical, high, medium, low);
        return new FindingCounts(critical, high, medium, low);
    }
}
