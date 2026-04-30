package com.sentinelscan.infra;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class ProcessRunner {

    /**
     * Runs an external process and returns its exit code + stdout.
     *
     * CRITICAL: Both stdout and stderr MUST be drained concurrently to prevent
     * buffer deadlock. If one stream fills its internal buffer while we're blocked
     * reading from the other, the process will hang forever.
     *
     * This implementation:
     * 1. Starts background threads to drain BOTH stdout AND stderr CONCURRENTLY
     * 2. Waits for the process to complete with timeout
     * 3. Joins both futures to retrieve the captured output
     *
     * @param command        command and arguments
     * @param timeoutMinutes maximum time to wait before forcibly killing the process
     * @return ProcessResult with exit code and stdout content
     * @throws IOException            if process creation fails
     * @throws InterruptedException   if thread is interrupted
     * @throws RuntimeException       if process times out
     */
    public ProcessResult run(List<String> command, int timeoutMinutes) throws IOException, InterruptedException {
        log.info("Executing: {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.environment().putAll(System.getenv());
        pb.environment().put("HOME", System.getProperty("user.home"));
        pb.environment().put("NO_COLOR", "1");

        Process process = pb.start();

        // CRITICAL: Drain stdout and stderr CONCURRENTLY to prevent deadlock
        // If we drain stdout first and it blocks waiting for the process to drain stderr,
        // but stderr's buffer is full, the process will hang forever.
        StreamGobbler stdoutGobbler = new StreamGobbler(process.getInputStream(), "stdout");
        StreamGobbler stderrGobbler = new StreamGobbler(process.getErrorStream(), "stderr");
        CompletableFuture<String> stdoutFuture = CompletableFuture.supplyAsync(stdoutGobbler);
        CompletableFuture<String> stderrFuture = CompletableFuture.supplyAsync(stderrGobbler);

        // Wait for process to complete (with timeout to prevent infinite hanging)
        boolean completed = process.waitFor(timeoutMinutes, TimeUnit.MINUTES);

        // If process is still running after timeout, kill it forcibly
        if (!completed) {
            log.error("Process timeout after {} minutes: {}", timeoutMinutes, command.get(0));
            process.destroyForcibly();
            // Wait a bit more for the process to actually die after forcible termination
            try {
                if (!process.waitFor(5, TimeUnit.SECONDS)) {
                    log.warn("Process did not die after forcible termination: {}", command.get(0));
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException(
                    "Process timed out after %d minutes: %s".formatted(timeoutMinutes, command.get(0)));
        }

        // Now join the futures to get both stdout and stderr (should be immediate since process is done)
        String stdout = waitForOutput(stdoutFuture, "stdout");
        String stderr = waitForOutput(stderrFuture, "stderr");

        int exitCode = process.exitValue();
        log.info("Process [{}] exited with code {} (stdout: {} bytes, stderr: {} bytes)",
                command.get(0), exitCode, stdout.length(), stderr.length());

        if (!stderr.isBlank()) {
            log.debug("Process [{}] stderr: {}", command.get(0), stderr.strip());
        }

        return new ProcessResult(exitCode, stdout, stderr);
    }

    /**
     * Drains an InputStream to a String, handling I/O errors gracefully.
     * This runs in a background thread to enable concurrent draining of both
     * stdout and stderr.
     *
     * @param inputStream the stream to drain
     * @param streamName  name for logging (e.g., "stdout", "stderr")
     * @return the entire stream contents as a String
     */
    private String waitForOutput(CompletableFuture<String> streamFuture, String streamName) {
        try {
            return streamFuture.get(10, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Timed out or failed waiting for {} gobbler: {}", streamName, e.getMessage());
            return "";
        }
    }

    private static class StreamGobbler implements java.util.function.Supplier<String> {
        private final InputStream inputStream;
        private StreamGobbler(InputStream inputStream, String streamName) {
            this.inputStream = inputStream;
        }

        @Override
        public String get() {
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append(System.lineSeparator());
                }
                return sb.toString();
            } catch (IOException e) {
                return "";
            }
        }
    }

}
