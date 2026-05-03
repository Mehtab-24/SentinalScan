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

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.io.File;

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
    private final SensitiveFileScanner sensitiveFileScanner;
    private final AiSummaryService aiSummaryService;

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

            updatePhase(job, "SCANNING_SENSITIVE_FILES");

            // ── Step 3.5 ─ Scan for sensitive files ──────────────────────────
            try {
                log.info("Starting sensitive file scan for scan {}", scanId);
                List<String> leakedFiles = sensitiveFileScanner.scan(repoPath);
                job.setLeakedFiles(leakedFiles);
                log.info("Sensitive file scan completed for scan {} - found {} files", scanId, leakedFiles.size());
            } catch (Exception e) {
                log.error("Sensitive file scan failed for scan {}: {}", scanId, e.getMessage(), e);
                job.setLeakedFiles(List.of());
            }

            updatePhase(job, "GENERATING_AI_SUMMARY");

            // ── Step 3.6 ─ Generate AI summary ──────────────────────────────
            try {
                log.info("Starting AI summary generation for scan {}", scanId);
                String aiSummary = aiSummaryService.generateSummary(repoPath);
                job.setAiSummary(aiSummary);
                log.info("AI summary generation completed for scan {}", scanId);
            } catch (Exception e) {
                log.error("AI summary generation failed for scan {}: {}", scanId, e.getMessage(), e);
                job.setAiSummary("AI Summary unavailable");
            }

            // Save state after new services complete
            repository.save(job);
            log.info("Database updated after sensitive file scan and AI summary for scan {}", scanId);

            updatePhase(job, "RUNNING_SEMGREP");

            // ── Step 4 ─ Semgrep (file-based output) ─────────────────────────
            // Semgrep writes results to semgrep-results.json instead of stdout
            // Exit code 0 = no findings, 1 = findings found — both are valid.
            // Exit code 2+ = actual error.
            // UTF-8 encoding is enforced globally in ProcessRunner via environment variables
            String absoluteOutputPath = Path.of(repoPath, "semgrep-results.json").toAbsolutePath().toString();
            
            ProcessResult semgrepResult = processRunner.run(
                    List.of(
                            "semgrep",
                            "scan",
                            "--config",
                            "auto",
                            "--json",
                            "-o",
                            absoluteOutputPath,
                            "."),
                    PROCESS_TIMEOUT_MIN,
                    new java.io.File(repoPath));
            
            if (semgrepResult.exitCode() >= 2) {
                String errorDetails = !semgrepResult.stderr().isBlank() 
                    ? semgrepResult.stderr() 
                    : (!semgrepResult.output().isBlank() ? semgrepResult.output() : "Semgrep exited with code " + semgrepResult.exitCode());
                log.error("Semgrep failed with exit code {}: {}", semgrepResult.exitCode(), errorDetails);
                throw new RuntimeException("Semgrep execution failed with exit code " + semgrepResult.exitCode() + ": " + errorDetails);
            }
            
            Path semgrepResultsFile = tempDir.resolve("semgrep-results.json");
            if (!Files.exists(semgrepResultsFile)) {
                throw new RuntimeException("Semgrep results file not found");
            }
            
            String semgrepJson = Files.readString(semgrepResultsFile);

            updatePhase(job, "RUNNING_TRIVY");

            // ── Step 5 ─ Trivy (file-based output) ────────────────────────────
            String trivyCmd = System.getenv().getOrDefault("TRIVY_PATH", "trivy");
            
            ProcessResult trivyResult = processRunner.run(
                    List.of(
                            trivyCmd,
                            "fs",
                            "--scanners", "vuln",
                            "--format", "json",
                            "--output", "trivy-results.json",
                            "."),
                    PROCESS_TIMEOUT_MIN,
                    new java.io.File(repoPath));
            
            if (trivyResult.exitCode() >= 2) {
                String errorDetails = !trivyResult.stderr().isBlank() 
                    ? trivyResult.stderr() 
                    : (!trivyResult.output().isBlank() ? trivyResult.output() : "Trivy exited with code " + trivyResult.exitCode());
                log.error("Trivy failed with exit code {}: {}", trivyResult.exitCode(), errorDetails);
                throw new RuntimeException("Trivy execution failed with exit code " + trivyResult.exitCode() + ": " + errorDetails);
            }
            
            Path trivyResultsFile = tempDir.resolve("trivy-results.json");
            if (!Files.exists(trivyResultsFile)) {
                throw new RuntimeException("Trivy results file not found");
            }
            
            String trivyJson = Files.readString(trivyResultsFile);

            updatePhase(job, "PARSING_RESULTS");

            // ── Step 6 ─ Parse ────────────────────────────────────────────────
            FindingCounts semgrepCounts = semgrepParser.parse(semgrepJson);
            FindingCounts trivyCounts = trivyParser.parse(trivyJson);

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
