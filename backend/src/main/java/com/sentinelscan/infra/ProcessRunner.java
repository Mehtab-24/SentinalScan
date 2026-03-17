package com.sentinelscan.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
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
        // Required for Semgrep to locate its config directory
        pb.environment().put("HOME", System.getProperty("user.home"));
        // Prevent Semgrep from emitting ANSI color codes
        pb.environment().put("NO_COLOR", "1");

        Process process = pb.start();

        // Drain stderr in background to prevent the process from blocking on a full
        // pipe
        CompletableFuture<Void> stderrDrain = CompletableFuture.runAsync(() -> {
            try (InputStream err = process.getErrorStream()) {
                err.transferTo(OutputStream.nullOutputStream());
            } catch (IOException e) {
                log.debug("Stderr drain interrupted for: {}", command.get(0));
            }
        });

        // Read entire stdout (JSON output from Semgrep / Trivy)
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        // Wait for process with timeout
        boolean completed = process.waitFor(timeoutMinutes, TimeUnit.MINUTES);
        stderrDrain.join();

        if (!completed) {
            process.destroyForcibly();
            throw new RuntimeException(
                    "Process timed out after %d minutes: %s".formatted(timeoutMinutes, command.get(0)));
        }

        int exitCode = process.exitValue();
        log.info("Process [{}] exited with code {}", command.get(0), exitCode);
        return new ProcessResult(exitCode, output);
    }
}
