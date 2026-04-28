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
     * Trivy severity values: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN.
     * UNKNOWN is counted as LOW.
     */
    public FindingCounts parse(String json) {
        if (json == null || json.isBlank()) {
            throw new IllegalArgumentException("Trivy JSON output is null or empty");
        }

        int critical = 0, high = 0, medium = 0, low = 0;

        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode results = root.path("Results");

            if (results.isArray()) {
                for (JsonNode result : results) {
                    JsonNode vulnerabilities = result.path("Vulnerabilities");
                    if (vulnerabilities.isArray()) {
                        for (JsonNode vuln : vulnerabilities) {
                            String severity = vuln.path("Severity").asText("LOW").toUpperCase();
                            switch (severity) {
                                case "CRITICAL"          -> critical++;
                                case "HIGH"              -> high++;
                                case "MEDIUM"            -> medium++;
                                case "LOW", "UNKNOWN"    -> low++;
                                default                  -> low++;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Trivy JSON output: {}", e.getMessage());
            throw new RuntimeException("Failed to parse Trivy scan results", e);
        }

        log.info("Trivy findings — critical:{} high:{} medium:{} low:{}", critical, high, medium, low);
        return new FindingCounts(critical, high, medium, low);
    }
}
