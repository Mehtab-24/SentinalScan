package com.sentinelscan.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * Heuristic pre-scan that walks the cloned repository and flags files that
 * commonly contain exposed secrets. Runs immediately after git clone, before
 * the heavier Semgrep/Trivy scanners.
 *
 * Matched patterns (case-insensitive filename comparison):
 *   - Any file named exactly {@code .env}
 *   - Any file with the extension {@code .pem}
 *   - Any file with the extension {@code .p12}
 *   - Any file named exactly {@code id_rsa}
 *   - Any file at a relative path ending in {@code .aws/credentials}
 *
 * The {@code .git} directory is skipped entirely to avoid false positives
 * from git internals.
 */
@Service
@Slf4j
public class SensitiveFileScanner {

    public List<String> scan(String repoPath) {
        List<String> leakedFiles = new ArrayList<>();
        Path rootPath = Paths.get(repoPath);

        try (Stream<Path> paths = Files.walk(rootPath)) {
            paths
                // Skip the .git directory and everything inside it
                .filter(p -> {
                    for (Path segment : p) {
                        if (".git".equals(segment.toString())) return false;
                    }
                    return true;
                })
                .filter(Files::isRegularFile)
                .forEach(path -> {
                    String fileName = path.getFileName().toString();
                    // Use forward slashes for consistent cross-platform path matching
                    String relativePath = rootPath.relativize(path).toString().replace('\\', '/');

                    if (isHighRisk(fileName, relativePath)) {
                        leakedFiles.add(relativePath);
                        log.warn("Sensitive file detected: {}", relativePath);
                    }
                });
        } catch (IOException e) {
            log.error("IOException during sensitive file scan in '{}': {}", repoPath, e.getMessage());
            // Non-fatal — return whatever was found before the error
        }

        log.info("Heuristic scan complete: found {} sensitive file(s) in '{}'", leakedFiles.size(), repoPath);
        return leakedFiles;
    }

    /**
     * Returns {@code true} if the file matches any of the high-risk patterns.
     *
     * @param fileName     the bare filename (e.g., {@code .env})
     * @param relativePath the path relative to the repo root using forward slashes
     *                     (e.g., {@code .aws/credentials})
     */
    private boolean isHighRisk(String fileName, String relativePath) {
        // Exact filename matches (case-insensitive)
        String lowerName = fileName.toLowerCase();
        if (".env".equals(lowerName))     return true;
        if ("id_rsa".equals(lowerName))   return true;

        // Extension matches
        if (lowerName.endsWith(".pem"))   return true;
        if (lowerName.endsWith(".p12"))   return true;

        // Path-level pattern: <any dir>/.aws/credentials
        if (relativePath.endsWith(".aws/credentials")) return true;

        return false;
    }
}

