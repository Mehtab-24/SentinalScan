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

@Service
@Slf4j
public class SensitiveFileScanner {

    private static final List<String> BLOCKLIST = List.of(
            ".env",
            "*.pem",
            "*.key",
            "id_rsa",
            "credentials.json",
            "node_modules",
            "target"
    );

    public List<String> scan(String repoPath) {
        List<String> leakedFiles = new ArrayList<>();
        Path rootPath = Paths.get(repoPath);

        try (Stream<Path> paths = Files.walk(rootPath)) {
            paths.forEach(path -> {
                String fileName = path.getFileName().toString();
                String relativePath = rootPath.relativize(path).toString();

                for (String pattern : BLOCKLIST) {
                    if (matchesPattern(fileName, pattern) || matchesPattern(relativePath, pattern)) {
                        leakedFiles.add(relativePath);
                        break;
                    }
                }
            });
        } catch (IOException e) {
            log.error("Error scanning for sensitive files in {}: {}", repoPath, e.getMessage());
        }

        log.info("Found {} sensitive files in {}", leakedFiles.size(), repoPath);
        return leakedFiles;
    }

    private boolean matchesPattern(String name, String pattern) {
        if (pattern.startsWith("*.")) {
            String extension = pattern.substring(1);
            return name.endsWith(extension);
        }
        return name.equals(pattern);
    }
}
