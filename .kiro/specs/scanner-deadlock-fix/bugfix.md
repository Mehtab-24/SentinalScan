# Bugfix Requirements Document

## Introduction

The SentinelScan backend executes Semgrep and Trivy as external OS processes via `ProcessRunner` and `ScanOrchestrator`. Five critical bugs affect the reliability and correctness of these scanner executions:

1. **Buffer Deadlock** — `ProcessBuilder` calls block indefinitely because stdout and stderr are not drained concurrently, causing the OS pipe buffer to fill and freeze the JVM thread.
2. **No Process Timeouts** — Scanner processes can hang forever with no watchdog, leaving `ScanJob` records stuck in `IN_PROGRESS` indefinitely.
3. **Wrong Trivy CLI Flags** — The Trivy command uses incorrect flags that produce no usable JSON output.
4. **Wrong Semgrep CLI Flags** — The Semgrep command uses incorrect flags that produce no usable JSON output.
5. **Fragile JSON Parsing** — The Trivy parser crashes when the `Vulnerabilities` array is absent or null instead of treating it as zero vulnerabilities.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a scanner process writes enough output to fill the OS pipe buffer on either stdout or stderr THEN the system blocks indefinitely (deadlock) because only one stream is drained at a time

1.2 WHEN a scanner process hangs or takes longer than expected THEN the system waits forever with no timeout, leaving the `ScanJob` permanently stuck in `IN_PROGRESS`

1.3 WHEN Trivy is invoked with incorrect CLI flags THEN the system receives no valid JSON output and the scan produces no vulnerability findings

1.4 WHEN Semgrep is invoked with incorrect CLI flags THEN the system receives no valid JSON output and the scan produces no security findings

1.5 WHEN Trivy's JSON output contains a result entry where the `Vulnerabilities` array is missing or null THEN the system crashes with a NullPointerException instead of treating it as zero vulnerabilities

### Expected Behavior (Correct)

2.1 WHEN a scanner process writes to both stdout and stderr THEN the system SHALL drain both streams concurrently on separate threads so that neither buffer fills and causes a deadlock

2.2 WHEN a scanner process runs longer than the configured timeout THEN the system SHALL forcibly kill the process, log the timeout error, and mark the `ScanJob` as `FAILED` with an appropriate error message

2.3 WHEN Trivy is invoked THEN the system SHALL use the command `trivy fs --scanners vuln --format json --output trivy-results.json --quiet <repo-path>` and read results from the generated JSON file

2.4 WHEN Semgrep is invoked THEN the system SHALL use the command `semgrep scan --config auto --json -o semgrep-results.json --quiet <repo-path>` and read results from the generated JSON file

2.5 WHEN Trivy's JSON output contains a result entry where the `Vulnerabilities` array is missing or null THEN the system SHALL treat that entry as contributing zero vulnerabilities and SHALL NOT throw an exception

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a scanner process completes successfully within the timeout THEN the system SHALL CONTINUE TO capture its exit code and output and proceed with parsing

3.2 WHEN Semgrep exits with code 0 (no findings) or code 1 (findings present) THEN the system SHALL CONTINUE TO treat both as valid outcomes and parse the results file

3.3 WHEN Trivy exits with code 0 THEN the system SHALL CONTINUE TO parse the results file and count vulnerabilities by severity (CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN)

3.4 WHEN the scan pipeline completes successfully THEN the system SHALL CONTINUE TO calculate scores, persist all finding counts, and mark the `ScanJob` as `COMPLETED`

3.5 WHEN the results JSON file is missing or empty after a scanner exits THEN the system SHALL CONTINUE TO fall back to an empty results structure rather than crashing

3.6 WHEN `scan.mode=mock` is configured THEN the system SHALL CONTINUE TO route to `MockScanService` and bypass all real scanner execution

---

## Bug Condition Pseudocode

### Bug 1 — Buffer Deadlock

```pascal
FUNCTION isBugCondition_Deadlock(process)
  INPUT: process of type Process
  OUTPUT: boolean

  // Bug triggers when both stdout and stderr produce output
  // and only one stream is drained at a time
  RETURN process.stdout.size > OS_PIPE_BUFFER_SIZE
      OR process.stderr.size > OS_PIPE_BUFFER_SIZE
END FUNCTION

// Property: Fix Checking
FOR ALL process WHERE isBugCondition_Deadlock(process) DO
  result ← run'(process)
  ASSERT result.completedWithinTimeout AND NOT deadlocked(result)
END FOR

// Property: Preservation Checking
FOR ALL process WHERE NOT isBugCondition_Deadlock(process) DO
  ASSERT run(process) = run'(process)
END FOR
```

### Bug 2 — No Process Timeout

```pascal
FUNCTION isBugCondition_Timeout(process, timeoutMinutes)
  INPUT: process of type Process, timeoutMinutes of type int
  OUTPUT: boolean

  RETURN process.runningDuration > timeoutMinutes * 60 seconds
END FUNCTION

// Property: Fix Checking
FOR ALL process WHERE isBugCondition_Timeout(process, 5) DO
  result ← run'(process)
  ASSERT process.isKilled
      AND scanJob.status = FAILED
      AND scanJob.errorMessage CONTAINS "timed out"
END FOR
```

### Bug 3 & 4 — Wrong CLI Flags

```pascal
FUNCTION isBugCondition_WrongFlags(command)
  INPUT: command of type List<String>
  OUTPUT: boolean

  RETURN command DOES NOT MATCH expected_trivy_flags
      OR command DOES NOT MATCH expected_semgrep_flags
END FUNCTION

// Property: Fix Checking
FOR ALL invocation WHERE isBugCondition_WrongFlags(invocation) DO
  result ← invoke'(invocation)
  ASSERT resultsFile.exists AND resultsFile.isValidJson
END FOR
```

### Bug 5 — Fragile JSON Parsing

```pascal
FUNCTION isBugCondition_NullVulnerabilities(trivyResult)
  INPUT: trivyResult of type JsonNode
  OUTPUT: boolean

  RETURN trivyResult.path("Vulnerabilities").isMissingNode
      OR trivyResult.path("Vulnerabilities").isNull
END FUNCTION

// Property: Fix Checking
FOR ALL result WHERE isBugCondition_NullVulnerabilities(result) DO
  counts ← parse'(result)
  ASSERT counts.total = 0 AND no_exception_thrown
END FOR

// Property: Preservation Checking
FOR ALL result WHERE NOT isBugCondition_NullVulnerabilities(result) DO
  ASSERT parse(result) = parse'(result)
END FOR
```
