package com.sentinelscan.service;

import org.springframework.stereotype.Service;

@Service
public class ScoreCalculator {

    /**
     * Computes a 0–100 security score from severity counts.
     * Formula: 100 - (critical×10 + high×5 + medium×2 + low×1), floored at 0.
     * Weights: Critical = -10, High = -5, Medium = -2, Low = -1
     */
    public int calculate(int critical, int high, int medium, int low) {
        int deduction = (critical * 10) + (high * 5) + (medium * 2) + (low * 1);
        return Math.max(0, 100 - deduction);
    }

    /**
     * Computes the combined overall score as a weighted combination of Semgrep and Trivy scores.
     * Weights: Semgrep (SAST) 60%, Trivy (dependencies) 40% - prioritizing code-level vulnerabilities.
     */
    public int overall(int semgrepScore, int trivyScore) {
        double weightedScore = (semgrepScore * 0.6) + (trivyScore * 0.4);
        return (int) Math.round(weightedScore);
    }
}
