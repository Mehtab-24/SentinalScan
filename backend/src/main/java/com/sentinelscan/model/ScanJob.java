package com.sentinelscan.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "scan_jobs")
@Getter
@Setter
@NoArgsConstructor
public class ScanJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "repo_url", nullable = false)
    private String repoUrl;

    @Column(name = "repo_name")
    private String repoName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScanStatus status = ScanStatus.PENDING;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // Scores
    @Column(name = "semgrep_score")
    private Integer semgrepScore;

    @Column(name = "trivy_score")
    private Integer trivyScore;

    @Column(name = "overall_score")
    private Integer overallScore;

    // Semgrep severity counts
    @Column(name = "semgrep_critical")
    private Integer semgrepCritical = 0;

    @Column(name = "semgrep_high")
    private Integer semgrepHigh = 0;

    @Column(name = "semgrep_medium")
    private Integer semgrepMedium = 0;

    @Column(name = "semgrep_low")
    private Integer semgrepLow = 0;

    // Trivy severity counts
    @Column(name = "trivy_critical")
    private Integer trivyCritical = 0;

    @Column(name = "trivy_high")
    private Integer trivyHigh = 0;

    @Column(name = "trivy_medium")
    private Integer trivyMedium = 0;

    @Column(name = "trivy_low")
    private Integer trivyLow = 0;

    // Raw JSON findings stored as plain TEXT
    @Column(name = "semgrep_findings", columnDefinition = "TEXT")
    private String semgrepFindings;

    @Column(name = "trivy_findings", columnDefinition = "TEXT")
    private String trivyFindings;

    @Column(name = "duration_ms")
    private Long durationMs;

    // Timestamps
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
