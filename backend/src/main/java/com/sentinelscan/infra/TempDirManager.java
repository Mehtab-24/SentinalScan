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

    /**
     * Base directory for scan working directories.
     *
     * We deliberately avoid {@code java.io.tmpdir} because Windows resolves it
     * to an 8.3 short path (e.g. {@code C:\Users\MEHTAB~1\AppData\Local\Temp})
     * which Docker Desktop cannot mount via {@code -v}.
     *
     * Instead we use {@code ./scans/} relative to the JVM working directory
     * (i.e. the {@code backend/} project folder when launched with
     * {@code .\run-real.bat}).  {@code toAbsolutePath().normalize()} converts
     * it to a full, long-form Windows path with no short-name components, so
     * Docker accepts it without modification.
     */
    private static final Path BASE_DIR =
            Paths.get("scans").toAbsolutePath().normalize();

    /**
     * Creates a working directory for a scan job at {@code ./scans/{scanId}}.
     * Returns the absolute, normalized path so Docker {@code -v} mounts receive
     * a long-form Windows path (no 8.3 short-name components).
     */
    public Path createTemp(UUID scanId) throws IOException {
        Path dir = BASE_DIR.resolve(scanId.toString());
        Files.createDirectories(dir);
        log.info("Created scan working dir: {}", dir.toAbsolutePath());
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
