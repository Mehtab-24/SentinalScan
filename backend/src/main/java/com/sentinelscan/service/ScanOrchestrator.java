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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanOrchestrator {

    /** Scan mode: 'mock' or 'real' (default: 'mock' for presentation safety). */
    @Value("${scan.mode:real}")
    private String scanMode;

    /** Timeout in minutes for git clone and Semgrep. */
    private static final int PROCESS_TIMEOUT_MIN = 5;

    private final ScanJobRepository repository;
    private final ProcessRunner processRunner;
    private final TempDirManager tempDirManager;
    private final SemgrepParser semgrepParser;
    private final TrivyParser trivyParser;
    private final ScoreCalculator scoreCalculator;
    private final GitCloneService gitCloneService;
    private final MockScanService mockScanService;

    /**
     * Runs the full scan pipeline asynchronously.
     * Routes to MockScanService if scan.mode=mock, otherwise executes real scanning.
     * Steps: git clone → semgrep → trivy → parse → score → save.
     * All temp directories are cleaned up in the finally block even on failure.
     */
    @Async("scanTaskExecutor")
    public CompletableFuture<Void> runScan(UUID scanId) {
        // Route to mock or real scanning based on configuration
        if ("mock".equalsIgnoreCase(scanMode)) {
            log.info("Scan {} routed to MockScanService (demo mode)", scanId);
            return mockScanService.runScan(scanId);
        }

        log.info("Scan {} routed to real scanning pipeline (production mode)", scanId);
        return runRealScan(scanId);
    }

    /**
     * Runs the real scanning pipeline with actual Semgrep and Trivy execution.
     * Steps: git clone → semgrep → trivy → parse → score → save.
     * All temp directories are cleaned up in the finally block even on failure.
     */
    private CompletableFuture<Void> runRealScan(UUID scanId) {
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

            updatePhase(job, "CLONING_REPOSITORY");

            // ── Step 3 ─ Git shallow clone ────────────────────────────────────
            // Sanitize: strip trailing slashes / extra path segments that break clone
            String repoUrl = sanitizeGitHubUrl(job.getRepoUrl());
            log.info("Cloning repo: {}", repoUrl);
            
            // Use JGit-based cloning with comprehensive error handling
            gitCloneService.cloneRepository(repoUrl, repoPath, scanId.toString());

            updatePhase(job, "RUNNING_SEMGREP");

            // ── Step 4 ─ Semgrep (file-based output) ─────────────────────────
            // Semgrep writes results to semgrep-results.json instead of stdout
            // Exit code 0 = no findings, 1 = findings found — both are valid.
            // Exit code 2+ = actual error.
            String semgrepCmd = System.getenv().getOrDefault(
                    "SEMGREP_PATH",
                    "C:\\Users\\Mehtab Singh\\AppData\\Roaming\\Python\\Python310\\Scripts\\semgrep.exe");
            
            Path semgrepResultsFile = tempDir.resolve("semgrep-results.json");
            
            ProcessResult semgrepResult = processRunner.run(
                    List.of(
                            semgrepCmd,
                            "scan",
                            "--config", "auto",
                            "--json",
                            "-o", semgrepResultsFile.toString(),
                            "--quiet",
                            repoPath),
                    PROCESS_TIMEOUT_MIN);
            
            String semgrepJson = readScanResultsFile(semgrepResultsFile, "Semgrep");
            if (semgrepResult.exitCode() > 1) {
                log.warn("Semgrep exited with code {} — treating findings as empty", semgrepResult.exitCode());
                semgrepJson = "{\"results\":[]}";
            }

            updatePhase(job, "RUNNING_TRIVY");

            // ── Step 5 ─ Trivy (file-based output) ────────────────────────────
            String trivyCmd = System.getenv().getOrDefault("TRIVY_PATH", "trivy");
            
            Path trivyResultsFile = tempDir.resolve("trivy-results.json");
            
            ProcessResult trivyResult = processRunner.run(
                    List.of(
                            trivyCmd,
                            "fs",
                            "--scanners", "vuln",
                            "--format", "json",
                            "--output", trivyResultsFile.toString(),
                            "--quiet",
                            repoPath),
                    PROCESS_TIMEOUT_MIN);
            
            String trivyJson = readScanResultsFile(trivyResultsFile, "Trivy");
            if (trivyResult.exitCode() > 1) {
                // Only a real error (exit 2+) causes us to discard the output.
                log.warn("Trivy exited with code {} (error) — treating findings as empty", trivyResult.exitCode());
                trivyJson = "{\"Results\":[]}";
            }

            updatePhase(job, "PARSING_RESULTS");

            // ── Step 6 ─ Parse ────────────────────────────────────────────────
            FindingCounts semgrepCounts;
            FindingCounts trivyCounts;
            
            try {
                semgrepCounts = semgrepParser.parse(semgrepJson);
            } catch (Exception e) {
                log.error("Failed to parse Semgrep JSON output: {}", e.getMessage());
                job.setStatus(ScanStatus.FAILED);
                job.setErrorMessage("Failed to parse Semgrep scan results. The scan output may be malformed or empty.");
                job.setCompletedAt(LocalDateTime.now());
                job.setDurationMs(System.currentTimeMillis() - wallStart);
                repository.save(job);
                return CompletableFuture.completedFuture(null);
            }
            
            try {
                trivyCounts = trivyParser.parse(trivyJson);
            } catch (Exception e) {
                log.error("Failed to parse Trivy JSON output: {}", e.getMessage());
                job.setStatus(ScanStatus.FAILED);
                job.setErrorMessage("Failed to parse Trivy scan results. The scan output may be malformed or empty.");
                job.setCompletedAt(LocalDateTime.now());
                job.setDurationMs(System.currentTimeMillis() - wallStart);
                repository.save(job);
                return CompletableFuture.completedFuture(null);
            }

            updatePhase(job, "CALCULATING_SCORE");

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
            job.setErrorMessage(null);
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

    /**
     * Reads a scan results file from disk with strict null-checking.
     * If the file doesn't exist or is empty, returns a default empty results JSON.
     *
     * @param resultsFile path to the results JSON file
     * @param toolName    scanner name for logging (e.g., "Semgrep", "Trivy")
     * @return the file contents, or default empty JSON if file missing/empty
     */
    private String readScanResultsFile(Path resultsFile, String toolName) {
        if (!Files.exists(resultsFile)) {
            log.warn("{} results file not created: {}", toolName, resultsFile);
            return toolName.equals("Trivy") ? "{\"Results\":[]}" : "{\"results\":[]}";
        }

        try {
            String content = Files.readString(resultsFile);
            if (content == null || content.isBlank()) {
                log.warn("{} results file is empty: {}", toolName, resultsFile);
                return toolName.equals("Trivy") ? "{\"Results\":[]}" : "{\"results\":[]}";
            }
            log.info("{} results file read successfully: {} bytes", toolName, content.length());
            return content;
        } catch (IOException e) {
            log.error("Failed to read {} results file {}: {}", toolName, resultsFile, e.getMessage());
            return toolName.equals("Trivy") ? "{\"Results\":[]}" : "{\"results\":[]}";
        }
    }

    private void updatePhase(ScanJob job, String phase) {
        job.setStatus(ScanStatus.IN_PROGRESS);
        job.setErrorMessage("PHASE: " + phase);
        repository.save(job);
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
