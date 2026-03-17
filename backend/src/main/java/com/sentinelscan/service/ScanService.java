package com.sentinelscan.service;

import com.sentinelscan.dto.ScanResponse;
import com.sentinelscan.dto.ScanSubmitRequest;
import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import com.sentinelscan.repository.ScanJobRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {

    private final ScanJobRepository repository;
    private final ScanOrchestrator orchestrator;

    /**
     * Creates a new scan job, persists it with PENDING status, then fires the async pipeline.
     * Returns the response immediately (202 Accepted pattern).
     */
    @Transactional
    public ScanResponse submitScan(ScanSubmitRequest request) {
        String repoUrl = request.repoUrl().stripTrailing().replaceAll("/$", "");
        String repoName = extractRepoName(repoUrl);

        ScanJob job = new ScanJob();
        job.setRepoUrl(repoUrl);
        job.setRepoName(repoName);
        job.setStatus(ScanStatus.PENDING);
        repository.save(job);

        log.info("Submitted scan {} for {}", job.getId(), repoUrl);
        orchestrator.runScan(job.getId()); // non-blocking

        return ScanResponse.from(job);
    }

    /** Returns the current state of a single scan. */
    @Transactional(readOnly = true)
    public ScanResponse getScan(UUID id) {
        ScanJob job = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Scan not found: " + id));
        return ScanResponse.from(job);
    }

    /** Returns the most recent 50 scans for the history page. */
    @Transactional(readOnly = true)
    public List<ScanResponse> getHistory() {
        return repository.findTop50ByOrderByCreatedAtDesc()
                .stream()
                .map(ScanResponse::from)
                .toList();
    }

    /** Deletes a scan record. Throws 404 if not found. */
    @Transactional
    public void deleteScan(UUID id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Scan not found: " + id);
        }
        repository.deleteById(id);
        log.info("Deleted scan {}", id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String extractRepoName(String repoUrl) {
        // "https://github.com/owner/repo" → "owner/repo"
        String[] parts = repoUrl.split("github\\.com/");
        return parts.length > 1 ? parts[1] : repoUrl;
    }
}
