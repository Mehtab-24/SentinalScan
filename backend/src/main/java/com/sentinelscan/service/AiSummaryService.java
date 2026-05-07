package com.sentinelscan.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * AI Summary Service — local LLM (Ollama/Qwen) integration is intentionally
 * disabled. The Ollama endpoint at localhost:11434 is not available in this
 * environment, so attempting to reach it would cause the scan pipeline to hang.
 *
 * To re-enable: inject a RestTemplate, restore the HTTP call to
 * "http://localhost:11434/api/generate", and parse the JSON "response" field.
 */
@Service
@Slf4j
public class AiSummaryService {

    private static final String DISABLED_MESSAGE =
            "AI Context Generation disabled for this local scan.";

    /**
     * Returns a static placeholder string instead of calling the local LLM.
     * The value is persisted to the {@code ai_summary} column in {@code scan_jobs}
     * and forwarded to the React frontend in the final JSON response.
     *
     * @param repoPath path to the cloned repository (unused while disabled)
     * @return hardcoded summary string
     */
    public String generateSummary(String repoPath) {
        log.info("AI summary generation is disabled — returning static placeholder for path: {}", repoPath);
        return DISABLED_MESSAGE;
    }
}
