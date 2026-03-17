package com.sentinelscan.controller;

import com.sentinelscan.dto.ScanResponse;
import com.sentinelscan.service.ScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class ScanHistoryController {

    private final ScanService scanService;

    /**
     * GET /api/history
     * Returns the most recent 50 scan jobs.
     */
    @GetMapping
    public List<ScanResponse> getHistory() {
        return scanService.getHistory();
    }
}
