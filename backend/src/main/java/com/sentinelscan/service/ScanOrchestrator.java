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

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanOrchestrator {

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
            ProcessResult cloneResult = processRunner.run(
                    List.of("git", "clone", "--depth", "1", job.getRepoUrl(), repoPath),
                    3
            );
            if (cloneResult.exitCode() != 0) {
                throw new RuntimeException("git clone failed (exit " + cloneResult.exitCode() + "): "
                        + cloneResult.output().lines().findFirst().orElse("no output"));
            }

            // ── Step 4 ─ Semgrep ─────────────────────────────────────────────
            // Exit code 0 = no findings, 1 = findings found — both are valid.
            // Exit code 2+ = actual error.
            ProcessResult semgrepResult = processRunner.run(
                    List.of("semgrep", "scan", "--json", "--config", "auto", repoPath),
                    3
            );
            String semgrepJson = semgrepResult.output().isBlank() ? "{\"results\":[]}" : semgrepResult.output();
            if (semgrepResult.exitCode() > 1) {
                log.warn("Semgrep exited with code {} — treating findings as empty", semgrepResult.exitCode());
                semgrepJson = "{\"results\":[]}";
            }

            // ── Step 5 ─ Trivy ────────────────────────────────────────────────
            ProcessResult trivyResult = processRunner.run(
                    List.of("trivy", "fs", "--format", "json", "--no-progress", repoPath),
                    3
            );
            String trivyJson = trivyResult.output().isBlank() ? "{\"Results\":[]}" : trivyResult.output();
            if (trivyResult.exitCode() != 0) {
                log.warn("Trivy exited with code {} — treating findings as empty", trivyResult.exitCode());
                trivyJson = "{\"Results\":[]}";
            }

            // ── Step 6 ─ Parse ────────────────────────────────────────────────
            FindingCounts semgrepCounts = semgrepParser.parse(semgrepJson);
            FindingCounts trivyCounts   = trivyParser.parse(trivyJson);

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
}
