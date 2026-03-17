package com.sentinelscan.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.UUID;

@Component
@Slf4j
public class TempDirManager {

    private static final Path BASE_DIR = Paths.get(System.getProperty("java.io.tmpdir"), "sentinelscan");

    /**
     * Creates a unique temporary directory for a scan job under /tmp/sentinelscan/{scanId}.
     */
    public Path createTemp(UUID scanId) throws IOException {
        Path dir = BASE_DIR.resolve(scanId.toString());
        Files.createDirectories(dir);
        log.debug("Created temp dir: {}", dir);
        return dir;
    }

    /**
     * Recursively deletes a temporary directory. Safe to call even if the path is null or missing.
     */
    public void deleteTemp(Path dir) {
        if (dir == null || !Files.exists(dir)) return;
        try {
            Files.walkFileTree(dir, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path d, IOException exc) throws IOException {
                    Files.delete(d);
                    return FileVisitResult.CONTINUE;
                }
            });
            log.debug("Deleted temp dir: {}", dir);
        } catch (IOException e) {
            log.warn("Failed to delete temp dir {}: {}", dir, e.getMessage());
        }
    }
}
