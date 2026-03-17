package com.sentinelscan.service;

import org.springframework.stereotype.Service;

@Service
public class ScoreCalculator {

    /**
     * Computes a 0–100 security score from severity counts.
     * Formula: 100 - (critical×25 + high×10 + medium×5 + low×1), floored at 0.
     */
    public int calculate(int critical, int high, int medium, int low) {
        int deduction = (critical * 25) + (high * 10) + (medium * 5) + (low * 1);
        return Math.max(0, 100 - deduction);
    }

    /**
     * Computes the combined overall score as the average of Semgrep and Trivy scores.
     */
    public int overall(int semgrepScore, int trivyScore) {
        return (semgrepScore + trivyScore) / 2;
    }
}
