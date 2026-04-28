package com.sentinelscan.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ScoreCalculatorTest {

    @InjectMocks
    private ScoreCalculator scoreCalculator;

    @Test
    void calculate_WithNoVulnerabilities_ShouldReturn100() {
        int score = scoreCalculator.calculate(0, 0, 0, 0);
        assertEquals(100, score);
    }

    @Test
    void calculate_WithCriticalVulnerabilities_ShouldDeductCorrectly() {
        int score = scoreCalculator.calculate(1, 0, 0, 0);
        assertEquals(90, score); // 100 - 10
    }

    @Test
    void calculate_WithHighVulnerabilities_ShouldDeductCorrectly() {
        int score = scoreCalculator.calculate(0, 2, 0, 0);
        assertEquals(90, score); // 100 - 10 (2 * 5)
    }

    @Test
    void calculate_WithMediumVulnerabilities_ShouldDeductCorrectly() {
        int score = scoreCalculator.calculate(0, 0, 3, 0);
        assertEquals(94, score); // 100 - 6 (3 * 2)
    }

    @Test
    void calculate_WithLowVulnerabilities_ShouldDeductCorrectly() {
        int score = scoreCalculator.calculate(0, 0, 0, 5);
        assertEquals(95, score); // 100 - 5 (5 * 1)
    }

    @Test
    void calculate_WithMixedVulnerabilities_ShouldDeductCorrectly() {
        int score = scoreCalculator.calculate(1, 2, 3, 4);
        assertEquals(75, score); // 100 - 25 (10 + 10 + 6 + 4)
    }

    @Test
    void calculate_WithManyVulnerabilities_ShouldFloorAtZero() {
        int score = scoreCalculator.calculate(10, 10, 10, 10);
        assertEquals(0, score); // Would be -100, but floored at 0
    }

    @Test
    void overall_WithEqualScores_ShouldReturnWeightedAverage() {
        int score = scoreCalculator.overall(80, 80);
        assertEquals(80, score); // (80 * 0.6) + (80 * 0.4) = 80
    }

    @Test
    void overall_WithDifferentScores_ShouldReturnWeightedCombination() {
        int score = scoreCalculator.overall(90, 70);
        assertEquals(82, score); // (90 * 0.6) + (70 * 0.4) = 54 + 28 = 82
    }

    @Test
    void overall_WithPerfectSemgrepScore_ShouldPrioritizeCodeVulnerabilities() {
        int score = scoreCalculator.overall(100, 50);
        assertEquals(80, score); // (100 * 0.6) + (50 * 0.4) = 60 + 20 = 80
    }

    @Test
    void overall_WithPerfectTrivyScore_ShouldStillConsiderCodeVulnerabilities() {
        int score = scoreCalculator.overall(50, 100);
        assertEquals(70, score); // (50 * 0.6) + (100 * 0.4) = 30 + 40 = 70
    }
}