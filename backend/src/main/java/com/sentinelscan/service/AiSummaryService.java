package com.sentinelscan.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiSummaryService {

    private static final String OLLAMA_API_URL = "http://localhost:11434/api/generate";
    private static final String MODEL = "qwen2.5-coder:7b";
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public String generateSummary(String repoPath) {
        try {
            Path readmePath = Paths.get(repoPath, "README.md");
            if (!Files.exists(readmePath)) {
                log.info("README.md not found in {}", repoPath);
                return null;
            }

            String readmeContent = Files.readString(readmePath);
            String prompt = "Summarize this project in 3 short sentences based on this README: " + readmeContent;

            Map<String, Object> payload = new HashMap<>();
            payload.put("model", MODEL);
            payload.put("prompt", prompt);
            payload.put("stream", false);

            String response = restTemplate.postForObject(OLLAMA_API_URL, payload, String.class);
            return extractResponse(response);
        } catch (Exception e) {
            log.error("Error generating AI summary for {}: {}", repoPath, e.getMessage());
            return null;
        }
    }

    private String extractResponse(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            return root.path("response").asText();
        } catch (Exception e) {
            log.error("Error parsing AI response: {}", e.getMessage());
            return null;
        }
    }
}
