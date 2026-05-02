package com.sentinelscan.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrivyParser {

    private final ObjectMapper objectMapper;

    /**
     * Parses Trivy JSON filesystem scan output and returns severity counts.
     * Implements strict null-checking per requirements:
     * - If "Results" array is missing/null → throw exception
     * - If "Vulnerabilities" is missing/null in any result → treat as 0 vulnerabilities
     * - Trivy severity values: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN → UNKNOWN counted as LOW
     */
    public FindingCounts parse(String json) throws com.fasterxml.jackson.core.JsonProcessingException {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException("Trivy JSON output is null or empty");
        }

        int critical = 0, high = 0, medium = 0, low = 0;

        JsonNode root = objectMapper.readTree(json);
        
        // STRICT NULL-CHECK: Results may be missing or null
        JsonNode results = root.path("Results");
        if (results == null || results.isMissingNode()) {
            throw new IllegalArgumentException("Trivy 'Results' field is missing");
        }

        // Results should be an array
        if (!results.isArray()) {
            throw new IllegalArgumentException("Trivy 'Results' field is not an array");
        }

        // Iterate over each scan result
        for (JsonNode result : results) {
            if (result == null) {
                continue;
            }

            // STRICT NULL-CHECK: Vulnerabilities may be missing or null in each result
            JsonNode vulnerabilities = result.path("Vulnerabilities");
            if (vulnerabilities == null || vulnerabilities.isMissingNode()) {
                // This target had no vulnerabilities
                continue;
            }

            if (!vulnerabilities.isArray()) {
                log.warn("Trivy Vulnerabilities field is not an array");
                continue;
            }

            // Count each vulnerability by severity
            for (JsonNode vuln : vulnerabilities) {
                if (vuln == null) {
                    continue;
                }

                // STRICT NULL-CHECK: Severity field may be missing — default to LOW
                String severity = vuln.path("Severity").asText("LOW");
                if (severity == null || severity.isBlank()) {
                    severity = "LOW";
                }
                
                severity = severity.toUpperCase();
                switch (severity) {
                    case "CRITICAL" -> critical++;
                    case "HIGH" -> high++;
                    case "MEDIUM" -> medium++;
                    case "LOW", "UNKNOWN" -> low++;
                    default -> {
                        log.debug("Unknown Trivy severity: {}", severity);
                        low++;
                    }
                }
            }
        }

        log.info("Trivy findings — critical:{} high:{} medium:{} low:{}", critical, high, medium, low);
        return new FindingCounts(critical, high, medium, low);
    }
}
