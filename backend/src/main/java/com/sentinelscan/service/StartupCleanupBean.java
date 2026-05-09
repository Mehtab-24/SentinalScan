package com.sentinelscan.service;

import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import com.sentinelscan.repository.ScanJobRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Runs once on application startup.
 *
 * <p>Problem: If the JVM is killed while a scan is running (crash, OOM, forced restart),
 * the scan job row stays permanently as {@code IN_PROGRESS} in the database.
 * The frontend then shows it as "running" forever, and users cannot trigger a rescan.
 *
 * <p>Fix: On startup, find all {@code IN_PROGRESS} jobs and mark them {@code FAILED}
 * with an explanatory error message. This is safe because no async threads are actually
 * running those scans yet — the previous JVM is gone.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StartupCleanupBean {

    private static final String ABORT_MESSAGE =
            "Scan aborted due to server restart or timeout.";

    private final ScanJobRepository repository;

    @PostConstruct
    @Transactional
    public void markStaleScansAsFailed() {
        List<ScanJob> stale = repository.findByStatus(ScanStatus.IN_PROGRESS);

        if (stale.isEmpty()) {
            log.info("[StartupCleanup] No stale IN_PROGRESS scans found — nothing to clean up.");
            return;
        }

        log.warn("[StartupCleanup] Found {} stale IN_PROGRESS scan(s). Marking as FAILED.", stale.size());

        for (ScanJob job : stale) {
            log.warn("[StartupCleanup] Aborting stale scan id={} repo={}", job.getId(), job.getRepoUrl());
            job.setStatus(ScanStatus.FAILED);
            job.setErrorMessage(ABORT_MESSAGE);
        }

        repository.saveAll(stale);
        log.info("[StartupCleanup] Marked {} stale scan(s) as FAILED.", stale.size());
    }
}
