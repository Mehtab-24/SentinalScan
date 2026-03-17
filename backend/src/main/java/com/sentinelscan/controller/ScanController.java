package com.sentinelscan.controller;

import com.sentinelscan.dto.ScanResponse;
import com.sentinelscan.dto.ScanSubmitRequest;
import com.sentinelscan.service.ScanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/scans")
@RequiredArgsConstructor
public class ScanController {

    private final ScanService scanService;

    /**
     * POST /api/scans
     * Accepts a scan job and returns 202 Accepted immediately.
     * The actual scan runs asynchronously.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ScanResponse submitScan(@Valid @RequestBody ScanSubmitRequest request) {
        return scanService.submitScan(request);
    }

    /**
     * GET /api/scans/{id}
     * Returns the current state of a scan (polling endpoint).
     */
    @GetMapping("/{id}")
    public ScanResponse getScan(@PathVariable UUID id) {
        return scanService.getScan(id);
    }

    /**
     * DELETE /api/scans/{id}
     * Removes a scan record. Returns 204 No Content.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScan(@PathVariable UUID id) {
        scanService.deleteScan(id);
    }
}
