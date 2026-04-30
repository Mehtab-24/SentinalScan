package com.sentinelscan.infra;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Bug condition exploration tests for ProcessRunner.
 *
 * These tests encode the EXPECTED (correct) behavior.
 * On UNFIXED code they are expected to FAIL — failure confirms the bugs exist.
 * After fixes are applied, these same tests should PASS.
 *
 * Bug 1 — Buffer Deadlock: isBugCondition_Deadlock — streams drained sequentially
 *   while both stdout and stderr produce >64 KB output.
 * Bug 2 — No Process Timeout: isBugCondition_Timeout — waitFor() called without
 *   a timeout argument, blocking forever when the process hangs.
 */
class ProcessRunnerTest {

    private final ProcessRunner processRunner = new ProcessRunner();

    /**
     * Bug 1 — Deadlock exploration.
     *
     * Launches a subprocess that writes 100 000 bytes to BOTH stdout and stderr.
     * This exceeds the OS pipe buffer (~64 KB) on both streams simultaneously.
     *
     * Expected (correct) behavior: run() completes within 5 seconds.
     * On UNFIXED code (sequential draining): hangs indefinitely — confirms Bug 1.
     *
     * Validates: Requirements 1.1, 2.1
     */
    @Test
    void bug1_deadlock_largeOutputOnBothStreams_shouldCompleteWithinTimeout() {
        List<String> cmd = List.of(
                "python",
                "-c",
                "import sys; data='x'*100000; sys.stdout.write(data); sys.stdout.flush(); sys.stderr.write(data); sys.stderr.flush()"
        );

        assertTimeoutPreemptively(Duration.ofSeconds(10), () -> {
            ProcessResult result = processRunner.run(cmd, 1);
            // Process should complete — exit code 0
            assertEquals(0, result.exitCode(),
                    "Expected exit code 0 but got: " + result.exitCode());
            // stdout should contain the 100 000 'x' characters
            assertEquals(100_000, result.output().length(),
                    "Expected 100000 bytes on stdout but got: " + result.output().length());
        }, "Bug 1 confirmed: run() deadlocked — stdout and stderr were not drained concurrently");
    }

    /**
     * Bug 2 — Timeout exploration.
     *
     * Launches a subprocess that sleeps for 60 seconds.
     * Calls run() with timeout=0 (effectively zero minutes — should time out immediately).
     *
     * Expected (correct) behavior: RuntimeException containing "timed out" is thrown.
     * On UNFIXED code (no timeout): blocks forever — confirms Bug 2.
     *
     * Validates: Requirements 1.2, 2.2
     */
    @Test
    void bug2_timeout_longRunningProcess_shouldThrowRuntimeException() {
        List<String> cmd = List.of(
                "python",
                "-c",
                "import time; time.sleep(60)"
        );

        assertTimeoutPreemptively(Duration.ofSeconds(15), () -> {
            RuntimeException ex = assertThrows(RuntimeException.class, () -> {
                processRunner.run(cmd, 0);
            }, "Expected RuntimeException to be thrown when process exceeds timeout");

            assertTrue(ex.getMessage().toLowerCase().contains("timed out"),
                    "Expected exception message to contain 'timed out' but was: " + ex.getMessage());
        }, "Bug 2 confirmed: run() blocked forever — waitFor() was called without a timeout argument");
    }

    // -------------------------------------------------------------------------
    // Preservation tests — these verify non-buggy inputs produce correct results
    // and MUST PASS on both unfixed and fixed code.
    // -------------------------------------------------------------------------

    /**
     * Preservation — Small-output process.
     *
     * Runs a process that writes a small, known string to stdout.
     * isBugCondition_Deadlock is false — output is well below the 64 KB pipe buffer.
     *
     * Expected behavior:
     * - exit code == 0
     * - stdout contains "hello"
     * - completes within 5 seconds
     *
     * Validates: Requirements 3.1
     */
    @Test
    void preservation_smallOutput_shouldReturnCorrectResultWithinTimeout() {
        assumeTrue(isPythonAvailable(), "Python not available — skipping test");

        List<String> cmd = List.of("python", "-c", "print('hello')");

        assertTimeoutPreemptively(Duration.ofSeconds(5), () -> {
            ProcessResult result = processRunner.run(cmd, 1);

            assertEquals(0, result.exitCode(),
                    "Expected exit code 0 but got: " + result.exitCode());
            assertTrue(result.output().contains("hello"),
                    "Expected stdout to contain 'hello' but was: " + result.output());
        }, "Small-output process did not complete within 5 seconds");
    }

    /**
     * Preservation — Fast process.
     *
     * Runs a process that exits immediately with code 0.
     * isBugCondition_Timeout is false — process completes well before the 5-minute timeout.
     *
     * Expected behavior:
     * - exit code == 0
     * - completes well within timeout
     *
     * Validates: Requirements 3.1
     */
    @Test
    void preservation_fastProcess_shouldCompleteNormallyWithinTimeout() {
        assumeTrue(isPythonAvailable(), "Python not available — skipping test");

        List<String> cmd = List.of("python", "-c", "import sys; sys.exit(0)");

        assertTimeoutPreemptively(Duration.ofSeconds(10), () -> {
            ProcessResult result = processRunner.run(cmd, 5);

            assertEquals(0, result.exitCode(),
                    "Expected exit code 0 but got: " + result.exitCode());
        }, "Fast process did not complete within 10 seconds (well within 5-minute timeout)");
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private boolean isPythonAvailable() {
        try {
            Process p = new ProcessBuilder("python", "--version").start();
            p.waitFor();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
