package com.sentinelscan.service;

import com.sentinelscan.infra.ProcessResult;
import com.sentinelscan.infra.ProcessRunner;
import com.sentinelscan.infra.TempDirManager;
import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import com.sentinelscan.parser.FindingCounts;
import com.sentinelscan.parser.SemgrepParser;
import com.sentinelscan.parser.TrivyParser;
import com.sentinelscan.repository.ScanJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanOrchestrator {

    /** Timeout in minutes for git clone and Semgrep. */
    private static final int TIMEOUT_FAST_MIN  = 3;
    /**
     * Timeout in minutes for Trivy.
     * First-run downloads the CVE DB (~500 MB) which can take several minutes
     * on slow connections — 10 minutes gives a safe upper bound.
     */
    private static final int TIMEOUT_TRIVY_MIN = 10;

    private final ScanJobRepository repository;
    private final ProcessRunner processRunner;
    private final TempDirManager tempDirManager;
    private final SemgrepParser semgrepParser;
    private final TrivyParser trivyParser;
    private final ScoreCalculator scoreCalculator;

    /**
     * Runs the full scan pipeline asynchronously.
     * Steps: git clone → semgrep → trivy → parse → score → save.
     * All temp directories are cleaned up in the finally block even on failure.
     */
    @Async("scanTaskExecutor")
    public CompletableFuture<Void> runScan(UUID scanId) {
        ScanJob job = repository.findById(scanId)
                .orElseThrow(() -> new IllegalStateException("Scan job not found: " + scanId));

        long wallStart = System.currentTimeMillis();
        Path tempDir = null;

        try {
            // ── Step 1 ─ Mark IN_PROGRESS ────────────────────────────────────
            job.setStatus(ScanStatus.IN_PROGRESS);
            job.setStartedAt(LocalDateTime.now());
            repository.save(job);

            // ── Step 2 ─ Create temp directory ───────────────────────────────
            tempDir = tempDirManager.createTemp(scanId);
            String repoPath = tempDir.toString();

            // ── Step 3 ─ Git shallow clone ────────────────────────────────────
            // Sanitize: strip trailing slashes / extra path segments that break clone
            String repoUrl = sanitizeGitHubUrl(job.getRepoUrl());
            log.info("Cloning repo: {}", repoUrl);
            ProcessResult cloneResult = runClone(repoUrl, repoPath);
            if (cloneResult.exitCode() != 0) {
                // Retry once — transient network hiccup or rate-limit
                log.warn("git clone failed (exit {}) — retrying once. stderr: {}",
                        cloneResult.exitCode(), cloneResult.stderr().strip());
                cloneResult = runClone(repoUrl, repoPath);
            }
            if (cloneResult.exitCode() != 0) {
                throw new RuntimeException(
                        "git clone failed (exit " + cloneResult.exitCode() + "): "
                        + cloneResult.stderr().strip());
            }

            // ── Step 4 ─ Semgrep ─────────────────────────────────────────────
            // Exit code 0 = no findings, 1 = findings found — both are valid.
            // Exit code 2+ = actual error.
            // SEMGREP_PATH env var overrides the default path for portability.
            String semgrepCmd = System.getenv().getOrDefault(
                    "SEMGREP_PATH",
                    "C:\\Users\\Mehtab Singh\\AppData\\Roaming\\Python\\Python310\\Scripts\\semgrep.exe");
            ProcessResult semgrepResult = processRunner.run(
                    List.of(
                            semgrepCmd,
                            "scan",
                            "--json",
                            "--config", "auto",
                            repoPath),
                    TIMEOUT_FAST_MIN);
            String semgrepJson = semgrepResult.output().isBlank() ? "{\"results\":[]}" : semgrepResult.output();
            if (semgrepResult.exitCode() > 1) {
                log.warn("Semgrep exited with code {} — treating findings as empty", semgrepResult.exitCode());
                semgrepJson = "{\"results\":[]}";
            }

            // ── Step 5 ─ Trivy ────────────────────────────────────────────────
            // TRIVY_PATH env var overrides the default "trivy" command for portability.
            // --scanners vuln: only scan for CVE vulnerabilities (skip secret/misconfig).
            // Exit codes: 0 = no findings, 1 = findings found (valid!), 2+ = error.
            // IMPORTANT: exit 1 means vulnerabilities were found — do NOT discard the output.
            // Timeout is TIMEOUT_TRIVY_MIN to accommodate first-run CVE DB download (~500 MB).
            String trivyCmd = System.getenv().getOrDefault("TRIVY_PATH", "trivy");
            ProcessResult trivyResult = processRunner.run(
                    List.of(trivyCmd, "fs", "--format", "json", "--no-progress",
                            "--scanners", "vuln", repoPath),
                    TIMEOUT_TRIVY_MIN);
            String trivyJson = trivyResult.output().isBlank() ? "{\"Results\":[]}" : trivyResult.output();
            if (trivyResult.exitCode() > 1) {
                // Only a real error (exit 2+) causes us to discard the output.
                log.warn("Trivy exited with code {} (error) — treating findings as empty", trivyResult.exitCode());
                trivyJson = "{\"Results\":[]}";
            }
            log.debug("Trivy raw output: {} chars, first 200: {}", trivyJson.length(),
                    trivyJson.substring(0, Math.min(200, trivyJson.length())));

            // ── Step 6 ─ Parse ────────────────────────────────────────────────
            FindingCounts semgrepCounts = semgrepParser.parse(semgrepJson);
            FindingCounts trivyCounts = trivyParser.parse(trivyJson);

            // ── Step 7 ─ Score ────────────────────────────────────────────────
            int semgrepScore = scoreCalculator.calculate(
                    semgrepCounts.critical(), semgrepCounts.high(),
                    semgrepCounts.medium(), semgrepCounts.low());
            int trivyScore = scoreCalculator.calculate(
                    trivyCounts.critical(), trivyCounts.high(),
                    trivyCounts.medium(), trivyCounts.low());
            int overallScore = scoreCalculator.overall(semgrepScore, trivyScore);

            // ── Step 8 ─ Persist COMPLETED ────────────────────────────────────
            long durationMs = System.currentTimeMillis() - wallStart;
            job.setStatus(ScanStatus.COMPLETED);
            job.setCompletedAt(LocalDateTime.now());
            job.setDurationMs(durationMs);

            job.setSemgrepScore(semgrepScore);
            job.setTrivyScore(trivyScore);
            job.setOverallScore(overallScore);

            job.setSemgrepCritical(semgrepCounts.critical());
            job.setSemgrepHigh(semgrepCounts.high());
            job.setSemgrepMedium(semgrepCounts.medium());
            job.setSemgrepLow(semgrepCounts.low());

            job.setTrivyCritical(trivyCounts.critical());
            job.setTrivyHigh(trivyCounts.high());
            job.setTrivyMedium(trivyCounts.medium());
            job.setTrivyLow(trivyCounts.low());

            job.setSemgrepFindings(semgrepJson);
            job.setTrivyFindings(trivyJson);

            repository.save(job);
            log.info("Scan {} completed in {}ms — overall score: {}", scanId, durationMs, overallScore);

        } catch (Exception e) {
            log.error("Scan {} failed: {}", scanId, e.getMessage(), e);
            long durationMs = System.currentTimeMillis() - wallStart;
            job.setStatus(ScanStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            job.setDurationMs(durationMs);
            repository.save(job);

        } finally {
            // Always clean up temp directory
            tempDirManager.deleteTemp(tempDir);
        }

        return CompletableFuture.completedFuture(null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ProcessResult runClone(String repoUrl, String destPath)
            throws IOException, InterruptedException {
        return processRunner.run(
                List.of("git", "clone", "--depth", "1", repoUrl, destPath),
                TIMEOUT_FAST_MIN);
    }

    /**
     * Strips trailing slashes and reduces a GitHub URL to
     * {@code https://github.com/owner/repo} so git clone receives a clean URL.
     * No-op for URLs that are already clean.
     */
    static String sanitizeGitHubUrl(String raw) {
        if (raw == null) return raw;
        String url = raw.strip().replaceAll("/+$", "");          // remove trailing slashes
        // Keep only the first 5 path segments: "" / "owner" / "repo"  (after split on "//")
        // e.g. https://github.com/owner/repo/tree/main → https://github.com/owner/repo
        String[] parts = url.split("/");
        if (parts.length > 5) {
            // parts[0]="https:", parts[1]="", parts[2]="github.com", parts[3]=owner, parts[4]=repo
            url = String.join("/", parts[0], parts[1], parts[2], parts[3], parts[4]);
        }
        return url;
    }
}
