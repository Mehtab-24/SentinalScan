package com.sentinelscan.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class ProcessRunner {

    /**
     * Runs an external process and returns its exit code + stdout.
     * Stderr is drained in a background thread to prevent the process from
     * blocking.
     *
     * @param command        command and arguments
     * @param timeoutMinutes maximum time to wait before forcibly killing the
     *                       process
     * @return ProcessResult with exit code and stdout content
     */
    public ProcessResult run(List<String> command, int timeoutMinutes) throws IOException, InterruptedException {
        log.info("Executing: {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        // Inherit the full system PATH so git/trivy/semgrep are resolvable
        pb.environment().putAll(System.getenv());
        // Required for Semgrep to locate its config directory
        pb.environment().put("HOME", System.getProperty("user.home"));
        // Prevent Semgrep from emitting ANSI color codes
        pb.environment().put("NO_COLOR", "1");

        Process process = pb.start();

        // Capture stderr in background (previously discarded — caused exit 128 to be silent)
        CompletableFuture<String> stderrFuture = CompletableFuture.supplyAsync(() -> {
            try (InputStream err = process.getErrorStream()) {
                return new String(err.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.debug("Stderr read interrupted for: {}", command.get(0));
                return "";
            }
        });

        // Read entire stdout (JSON output from Semgrep / Trivy)
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        // Wait for process with timeout
        boolean completed = process.waitFor(timeoutMinutes, TimeUnit.MINUTES);
        String stderr = stderrFuture.join();

        if (!completed) {
            process.destroyForcibly();
            throw new RuntimeException(
                    "Process timed out after %d minutes: %s".formatted(timeoutMinutes, command.get(0)));
        }

        int exitCode = process.exitValue();
        log.info("Process [{}] exited with code {}", command.get(0), exitCode);
        if (!stderr.isBlank()) {
            log.debug("Process [{}] stderr: {}", command.get(0), stderr.strip());
        }
        return new ProcessResult(exitCode, output, stderr);
    }
}
