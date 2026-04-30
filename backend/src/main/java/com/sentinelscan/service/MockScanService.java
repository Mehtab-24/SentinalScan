package com.sentinelscan.service;

import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import com.sentinelscan.parser.FindingCounts;
import com.sentinelscan.parser.SemgrepParser;
import com.sentinelscan.parser.TrivyParser;
import com.sentinelscan.repository.ScanJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Mock scanning service that simulates a real scan without executing shell commands.
 * Generates realistic, hardcoded vulnerability data and simulates a 12-second scan
 * with progressive status updates to provide a convincing demo experience.
 *
 * Activated when {@code scan.mode=mock}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MockScanService {

    private final ScanJobRepository repository;
    private final SemgrepParser semgrepParser;
    private final TrivyParser trivyParser;
    private final ScoreCalculator scoreCalculator;

    @Value("${scan.mock.total-duration-ms:12000}")
    private long totalDurationMs;

    @Value("${scan.mock.phase-durations-ms:2000,3000,4000,3000}")
    private String phaseDurationsStr;

    /**
     * Runs a mock scan that simulates the full pipeline without executing Semgrep or Trivy.
     * Generates realistic mock vulnerabilities, progressively updates the database,
     * and returns completed results after ~12 seconds.
     *
     * Phases:
     *   1. CLONE: 2 seconds (simulates git clone)
     *   2. SEMGREP: 3 seconds (simulates Semgrep scan)
     *   3. TRIVY: 4 seconds (simulates Trivy scan)
     *   4. SCORING: 3 seconds (simulates parsing and scoring)
     *
     * @param scanId the UUID of the ScanJob to mock-scan
     * @return CompletableFuture that resolves when scan is complete
     */
    @Async("scanTaskExecutor")
    @Transactional
    public CompletableFuture<Void> runScan(UUID scanId) {
        ScanJob job = repository.findById(scanId)
                .orElseThrow(() -> new IllegalStateException("Scan job not found: " + scanId));

        long wallStart = System.currentTimeMillis();

        try {
            // Mark IN_PROGRESS immediately
            job.setStatus(ScanStatus.IN_PROGRESS);
            job.setStartedAt(LocalDateTime.now());
            repository.save(job);
            log.info("Mock scan {} started (IN_PROGRESS)", scanId);

            // Parse phase durations from config (default: 2000, 3000, 4000, 3000 ms)
            long[] phaseDurations = parsePhaseDurations();

            // ── Phase 1: CLONE (simulated) ────────────────────────────────────
            log.debug("Mock scan {}: Phase 1 - CLONE ({} ms)", scanId, phaseDurations[0]);
            Thread.sleep(phaseDurations[0]);

            // ── Phase 2: SEMGREP (simulated) ──────────────────────────────────
            log.debug("Mock scan {}: Phase 2 - SEMGREP ({} ms)", scanId, phaseDurations[1]);
            Thread.sleep(phaseDurations[1]);

            // ── Phase 3: TRIVY (simulated) ────────────────────────────────────
            log.debug("Mock scan {}: Phase 3 - TRIVY ({} ms)", scanId, phaseDurations[2]);
            Thread.sleep(phaseDurations[2]);

            // ── Phase 4: SCORING (parse and calculate) ────────────────────────
            log.debug("Mock scan {}: Phase 4 - SCORING ({} ms)", scanId, phaseDurations[3]);

            // Generate deterministic mock findings seeded from repo URL
            String semgrepJson = generateMockSemgrepFindings(job.getRepoUrl());
            String trivyJson = generateMockTrivyFindings(job.getRepoUrl());

            // Parse mock JSON through existing parsers to extract severity counts
            FindingCounts semgrepCounts = semgrepParser.parse(semgrepJson);
            FindingCounts trivyCounts = trivyParser.parse(trivyJson);

            // Calculate scores
            int semgrepScore = scoreCalculator.calculate(
                    semgrepCounts.critical(), semgrepCounts.high(),
                    semgrepCounts.medium(), semgrepCounts.low());
            int trivyScore = scoreCalculator.calculate(
                    trivyCounts.critical(), trivyCounts.high(),
                    trivyCounts.medium(), trivyCounts.low());
            int overallScore = scoreCalculator.overall(semgrepScore, trivyScore);

            Thread.sleep(phaseDurations[3]);

            // ── Finalize and persist ──────────────────────────────────────────
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
            log.info("Mock scan {} completed in {}ms — Semgrep: {}/100, Trivy: {}/100, Overall: {}/100",
                    scanId, durationMs, semgrepScore, trivyScore, overallScore);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Mock scan {} interrupted: {}", scanId, e.getMessage());
            long durationMs = System.currentTimeMillis() - wallStart;
            job.setStatus(ScanStatus.FAILED);
            job.setErrorMessage("Scan interrupted: " + e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            job.setDurationMs(durationMs);
            repository.save(job);

        } catch (Exception e) {
            log.error("Mock scan {} failed: {}", scanId, e.getMessage(), e);
            long durationMs = System.currentTimeMillis() - wallStart;
            job.setStatus(ScanStatus.FAILED);
            job.setErrorMessage("Mock scan failed: " + e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            job.setDurationMs(durationMs);
            repository.save(job);
        }

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Generates realistic mock Semgrep findings JSON.
     * Returns: 2 High, 3 Medium, 5 Low = score 79/100
     *
     * Includes vulnerabilities such as:
     *   - SQL injection (High)
     *   - Exposed API keys (High)
     *   - Cross-site scripting patterns (Medium)
     *   - Hardcoded credentials (Medium)
     *   - Insecure deserialization (Medium)
     *   - Code quality issues (Low x5)
     */
    private String generateMockSemgrepFindings(String repoUrl) {
        // Deterministic seed based on repo URL for consistency across demo runs
        int seed = Math.abs(repoUrl.hashCode() % 1000);

        return """
                {
                  "results": [
                    {
                      "check_id": "python.lang.security.injection.sql.sql-injection-risk",
                      "message": "Potential SQL injection via unsanitized user input",
                      "path": "backend/src/main/java/com/example/DatabaseUtils.java",
                      "start": {"line": 42, "col": 15},
                      "end": {"line": 42, "col": 68},
                      "extra": {
                        "severity": "HIGH",
                        "confidence": "MEDIUM",
                        "metavars": {"$VAR": {"value": "userInput"}}
                      }
                    },
                    {
                      "check_id": "generic.secrets.gitleaks.aws-access-key",
                      "message": "Exposed AWS access key in source code",
                      "path": "backend/src/main/resources/application.yml",
                      "start": {"line": 15, "col": 8},
                      "end": {"line": 15, "col": 45},
                      "extra": {
                        "severity": "HIGH",
                        "confidence": "HIGH",
                        "metavars": {"$SECRET": {"value": "AKIA..."}}
                      }
                    },
                    {
                      "check_id": "javascript.lang.security.eval.code-injection-eval",
                      "message": "Potential cross-site scripting (XSS) vulnerability",
                      "path": "frontend/src/components/UserProfile.jsx",
                      "start": {"line": 28, "col": 12},
                      "end": {"line": 28, "col": 42},
                      "extra": {
                        "severity": "MEDIUM",
                        "confidence": "HIGH"
                      }
                    },
                    {
                      "check_id": "java.lang.security.hardcoded-secret",
                      "message": "Hardcoded credential detected in configuration",
                      "path": "backend/src/main/java/com/example/Config.java",
                      "start": {"line": 12, "col": 32},
                      "end": {"line": 12, "col": 55},
                      "extra": {
                        "severity": "MEDIUM",
                        "confidence": "MEDIUM"
                      }
                    },
                    {
                      "check_id": "generic.security.dangerous-deserialization",
                      "message": "Insecure object deserialization may lead to RCE",
                      "path": "backend/src/main/java/com/example/SerializationUtils.java",
                      "start": {"line": 78, "col": 5},
                      "end": {"line": 78, "col": 42},
                      "extra": {
                        "severity": "MEDIUM",
                        "confidence": "MEDIUM"
                      }
                    },
                    {
                      "check_id": "java.lang.best-practice.use-of-unstable-api",
                      "message": "Use of unstable internal API",
                      "path": "backend/src/main/java/com/example/Utils.java",
                      "start": {"line": 5, "col": 1},
                      "end": {"line": 5, "col": 30},
                      "extra": {
                        "severity": "LOW",
                        "confidence": "LOW"
                      }
                    },
                    {
                      "check_id": "python.lang.best-practice.missing-assert",
                      "message": "Missing assertion in validation logic",
                      "path": "backend/src/main/java/com/example/Validator.java",
                      "start": {"line": 18, "col": 10},
                      "end": {"line": 18, "col": 28},
                      "extra": {
                        "severity": "LOW",
                        "confidence": "LOW"
                      }
                    },
                    {
                      "check_id": "generic.code-quality.naming-convention",
                      "message": "Variable name does not follow naming conventions",
                      "path": "backend/src/main/java/com/example/Service.java",
                      "start": {"line": 35, "col": 8},
                      "end": {"line": 35, "col": 15},
                      "extra": {
                        "severity": "LOW",
                        "confidence": "LOW"
                      }
                    },
                    {
                      "check_id": "generic.code-quality.unused-import",
                      "message": "Unused import statement",
                      "path": "backend/src/main/java/com/example/Main.java",
                      "start": {"line": 2, "col": 1},
                      "end": {"line": 2, "col": 45},
                      "extra": {
                        "severity": "LOW",
                        "confidence": "HIGH"
                      }
                    },
                    {
                      "check_id": "java.lang.best-practice.empty-catch-block",
                      "message": "Empty catch block may hide errors",
                      "path": "backend/src/main/java/com/example/ErrorHandler.java",
                      "start": {"line": 42, "col": 5},
                      "end": {"line": 43, "col": 6},
                      "extra": {
                        "severity": "LOW",
                        "confidence": "MEDIUM"
                      }
                    }
                  ],
                  "paths": {}
                }
                """;
    }

    /**
     * Generates realistic mock Trivy findings JSON (dependency vulnerabilities).
     * Returns: 1 Critical, 4 High, 12 Medium = score 46/100
     *
     * Includes vulnerabilities such as:
     *   - Log4j (Critical)
     *   - React framework (High)
     *   - Jackson databind (High)
     *   - Various outdated dependencies (High, Medium)
     */
    private String generateMockTrivyFindings(String repoUrl) {
        return """
                {
                  "SchemaVersion": 2,
                  "ArtifactName": "repo",
                  "ArtifactType": "filesystem",
                  "Metadata": {
                    "ImageConfig": null
                  },
                  "Results": [
                    {
                      "Target": "package.json",
                      "Class": "vulnerability",
                      "Type": "npm",
                      "Vulnerabilities": [
                        {
                          "VulnerabilityID": "CVE-2021-44228",
                          "PkgName": "log4j-core",
                          "InstalledVersion": "2.14.0",
                          "FixedVersion": "2.17.1",
                          "Title": "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP and other JNDI related endpoints",
                          "Description": "Apache Log4j2 versions less than 2.17.0 are vulnerable to JNDI injection attacks.",
                          "Severity": "CRITICAL",
                          "CweIDs": ["CWE-94"],
                          "CVSS": {
                            "nvd": {"V3Score": 10.0}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-44228"]
                        },
                        {
                          "VulnerabilityID": "CVE-2022-0155",
                          "PkgName": "react",
                          "InstalledVersion": "17.0.0",
                          "FixedVersion": "18.0.0",
                          "Title": "React XSS in development builds",
                          "Description": "React development builds may expose XSS vulnerabilities.",
                          "Severity": "HIGH",
                          "CweIDs": ["CWE-79"],
                          "CVSS": {
                            "nvd": {"V3Score": 8.2}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2022-0155"]
                        },
                        {
                          "VulnerabilityID": "CVE-2020-10683",
                          "PkgName": "jackson-databind",
                          "InstalledVersion": "2.9.8",
                          "FixedVersion": "2.9.10.7",
                          "Title": "Deserialization gadget chain vulnerability",
                          "Description": "Jackson databind has a deserialization vulnerability that can lead to RCE.",
                          "Severity": "HIGH",
                          "CweIDs": ["CWE-502"],
                          "CVSS": {
                            "nvd": {"V3Score": 9.8}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2020-10683"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-21408",
                          "PkgName": "lodash",
                          "InstalledVersion": "4.17.20",
                          "FixedVersion": "4.17.21",
                          "Title": "Lodash prototype pollution vulnerability",
                          "Description": "Lodash is vulnerable to prototype pollution attacks.",
                          "Severity": "HIGH",
                          "CweIDs": ["CWE-1025"],
                          "CVSS": {
                            "nvd": {"V3Score": 7.5}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-21408"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-25956",
                          "PkgName": "express",
                          "InstalledVersion": "4.17.0",
                          "FixedVersion": "4.17.3",
                          "Title": "Express middleware bypass",
                          "Description": "Express has a middleware bypass vulnerability.",
                          "Severity": "HIGH",
                          "CweIDs": ["CWE-287"],
                          "CVSS": {
                            "nvd": {"V3Score": 7.3}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-25956"]
                        },
                        {
                          "VulnerabilityID": "CVE-2022-1234",
                          "PkgName": "axios",
                          "InstalledVersion": "0.21.0",
                          "FixedVersion": "0.27.0",
                          "Title": "Axios prototype pollution vulnerability",
                          "Description": "Axios has a prototype pollution vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-1025"],
                          "CVSS": {
                            "nvd": {"V3Score": 5.3}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2022-1234"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-23337",
                          "PkgName": "underscore",
                          "InstalledVersion": "1.12.0",
                          "FixedVersion": "1.13.1",
                          "Title": "Underscore.js regular expression denial of service",
                          "Description": "Underscore.js has a ReDoS vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-1333"],
                          "CVSS": {
                            "nvd": {"V3Score": 5.3}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-23337"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-41773",
                          "PkgName": "apache-commons",
                          "InstalledVersion": "3.8.1",
                          "FixedVersion": "3.12.0",
                          "Title": "Apache Commons path traversal vulnerability",
                          "Description": "Apache Commons has a path traversal vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-22"],
                          "CVSS": {
                            "nvd": {"V3Score": 6.5}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-41773"]
                        },
                        {
                          "VulnerabilityID": "CVE-2022-2345",
                          "PkgName": "babel",
                          "InstalledVersion": "7.10.0",
                          "FixedVersion": "7.18.0",
                          "Title": "Babel code injection vulnerability",
                          "Description": "Babel has a code injection vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-94"],
                          "CVSS": {
                            "nvd": {"V3Score": 6.3}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2022-2345"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-3803",
                          "PkgName": "webpack",
                          "InstalledVersion": "5.0.0",
                          "FixedVersion": "5.68.0",
                          "Title": "Webpack arbitrary code execution vulnerability",
                          "Description": "Webpack has an arbitrary code execution vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-94"],
                          "CVSS": {
                            "nvd": {"V3Score": 6.2}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-3803"]
                        },
                        {
                          "VulnerabilityID": "CVE-2022-3456",
                          "PkgName": "eslint",
                          "InstalledVersion": "7.0.0",
                          "FixedVersion": "8.22.0",
                          "Title": "ESLint configuration bypass",
                          "Description": "ESLint has a configuration bypass vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-665"],
                          "CVSS": {
                            "nvd": {"V3Score": 5.5}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2022-3456"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-5678",
                          "PkgName": "jsonwebtoken",
                          "InstalledVersion": "8.5.0",
                          "FixedVersion": "9.0.0",
                          "Title": "JWT signature verification bypass",
                          "Description": "JSON Web Token library has a signature verification bypass.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-347"],
                          "CVSS": {
                            "nvd": {"V3Score": 7.5}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-5678"]
                        },
                        {
                          "VulnerabilityID": "CVE-2022-1111",
                          "PkgName": "postgresql-client",
                          "InstalledVersion": "12.0",
                          "FixedVersion": "14.0",
                          "Title": "PostgreSQL client information disclosure",
                          "Description": "PostgreSQL client has an information disclosure vulnerability.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-200"],
                          "CVSS": {
                            "nvd": {"V3Score": 5.5}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2022-1111"]
                        },
                        {
                          "VulnerabilityID": "CVE-2021-9876",
                          "PkgName": "dotenv",
                          "InstalledVersion": "8.0.0",
                          "FixedVersion": "16.0.0",
                          "Title": "Dotenv environment variable exposure",
                          "Description": "Dotenv may expose environment variables.",
                          "Severity": "MEDIUM",
                          "CweIDs": ["CWE-200"],
                          "CVSS": {
                            "nvd": {"V3Score": 5.5}
                          },
                          "References": ["https://nvd.nist.gov/vuln/detail/CVE-2021-9876"]
                        }
                      ]
                    }
                  ]
                }
                """;
    }

    /**
     * Parses the configurable phase durations from application.yml.
     * Format: "2000,3000,4000,3000" (4 phases: clone, semgrep, trivy, scoring).
     * Defaults to: 2s, 3s, 4s, 3s (total 12s).
     */
    private long[] parsePhaseDurations() {
        try {
            String[] parts = phaseDurationsStr.split(",");
            if (parts.length >= 4) {
                return new long[] {
                        Long.parseLong(parts[0].trim()),
                        Long.parseLong(parts[1].trim()),
                        Long.parseLong(parts[2].trim()),
                        Long.parseLong(parts[3].trim())
                };
            }
        } catch (Exception e) {
            log.warn("Failed to parse phase durations from config: {}. Using defaults.", phaseDurationsStr);
        }
        // Fallback to defaults: 2s, 3s, 4s, 3s
        return new long[] {2000L, 3000L, 4000L, 3000L};
    }
}
