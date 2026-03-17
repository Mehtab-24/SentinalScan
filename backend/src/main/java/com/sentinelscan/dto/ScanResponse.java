package com.sentinelscan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonRawValue;
import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScanResponse {

    private UUID id;
    private String repoUrl;
    private String repoName;
    private ScanStatus status;
    private String errorMessage;

    // Scores (null until COMPLETED)
    private Integer semgrepScore;
    private Integer trivyScore;
    private Integer overallScore;

    // Severity counts
    private Integer semgrepCritical;
    private Integer semgrepHigh;
    private Integer semgrepMedium;
    private Integer semgrepLow;

    private Integer trivyCritical;
    private Integer trivyHigh;
    private Integer trivyMedium;
    private Integer trivyLow;

    // Raw JSON emitted as-is (no extra string escaping)
    @JsonRawValue
    private String semgrepFindings;

    @JsonRawValue
    private String trivyFindings;

    private Long durationMs;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    /** Map a ScanJob entity to this response DTO. */
    public static ScanResponse from(ScanJob job) {
        ScanResponseBuilder builder = ScanResponse.builder()
                .id(job.getId())
                .repoUrl(job.getRepoUrl())
                .repoName(job.getRepoName())
                .status(job.getStatus())
                .errorMessage(job.getErrorMessage())
                .createdAt(job.getCreatedAt())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .durationMs(job.getDurationMs());

        if (job.getStatus() == com.sentinelscan.model.ScanStatus.COMPLETED) {
            builder.semgrepScore(job.getSemgrepScore())
                    .trivyScore(job.getTrivyScore())
                    .overallScore(job.getOverallScore())
                    .semgrepCritical(job.getSemgrepCritical())
                    .semgrepHigh(job.getSemgrepHigh())
                    .semgrepMedium(job.getSemgrepMedium())
                    .semgrepLow(job.getSemgrepLow())
                    .trivyCritical(job.getTrivyCritical())
                    .trivyHigh(job.getTrivyHigh())
                    .trivyMedium(job.getTrivyMedium())
                    .trivyLow(job.getTrivyLow())
                    .semgrepFindings(job.getSemgrepFindings())
                    .trivyFindings(job.getTrivyFindings());
        }

        return builder.build();
    }
}
