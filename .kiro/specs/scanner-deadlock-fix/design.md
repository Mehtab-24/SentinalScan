# Scanner Deadlock Fix — Bugfix Design

## Overview

Five bugs in the SentinelScan backend scanner pipeline cause scan jobs to deadlock, hang
indefinitely, produce no findings, or crash during JSON parsing. This design formalizes
each bug condition using the C(X)/P(result) methodology, documents the root cause analysis,
specifies the exact implementation changes required, and defines a two-phase testing strategy
(exploratory counterexample surfacing → fix + preservation verification).

The affected files are:
- `backend/src/main/java/com/sentinelscan/infra/ProcessRunner.java` — Bugs 1 & 2
- `backend/src/main/java/com/sentinelscan/service/ScanOrchestrator.java` — Bugs 3 & 4
- `backend/src/main/java/com/sentinelscan/parser/TrivyParser.java` — Bug 5

---

## Glossary

- **Bug_Condition (C)**: A predicate over inputs that returns `true` when the input triggers the defective behavior.
- **Property (P)**: The desired correct behavior that must hold for all inputs where C(X) is true.
- **Preservation**: The guarantee that inputs where C(X) is false produce identical results before and after the fix.
- **F**: The original (unfixed) function.
- **F'**: The fixed function.
- **OS pipe buffer**: The kernel-managed buffer (~64 KB on Linux) between a process's stdout/stderr and the reading JVM thread. If the buffer fills and is not drained, the child process blocks on write, causing a deadlock.
- **ProcessRunner**: The `com.sentinelscan.infra.ProcessRunner` component responsible for launching external OS processes and capturing their output.
- **ScanOrchestrator**: The `com.sentinelscan.service.ScanOrchestrator` service that orchestrates the full scan pipeline (clone → semgrep → trivy → parse → score → persist).
- **TrivyParser**: The `com.sentinelscan.parser.TrivyParser` component that parses Trivy's JSON output into `FindingCounts`.
- **ScanJob**: The JPA entity representing a single scan request, persisted with a `ScanStatus` of `PENDING`, `IN_PROGRESS`, `COMPLETED`, or `FAILED`.
- **TIMEOUT_FAST_MIN**: Configured timeout (3 minutes) for git clone and Semgrep.
- **TIMEOUT_TRIVY_MIN**: Configured timeout (10 minutes) for Trivy (first-run CVE DB download).

---

## Bug Details

### Bug 1 — Buffer Deadlock in ProcessRunner

#### Bug Condition

The deadlock manifests when `ProcessRunner.run()` drains stdout and stderr sequentially
(one after the other) rather than concurrently. If the child process writes enough data to
fill the OS pipe buffer on the stream being read second, the child blocks on its write
syscall while the JVM is blocked reading the first stream — a classic circular wait.

**Formal Specification:**
```
FUNCTION isBugCondition_Deadlock(process)
  INPUT:  process of type Process (stdout and stderr not yet drained)
  OUTPUT: boolean

  RETURN (process.stdout.pendingBytes > OS_PIPE_BUFFER_SIZE
          OR process.stderr.pendingBytes > OS_PIPE_BUFFER_SIZE)
         AND streams_drained_sequentially(process)
END FUNCTION
```

**Examples:**
- Trivy scanning a large repository writes >64 KB of JSON to stdout while also writing
  progress/warning lines to stderr → JVM blocks reading stdout, stderr buffer fills,
  Trivy blocks on stderr write → deadlock.
- Semgrep with many findings writes a large JSON blob to stdout; any warning on stderr
  fills the pipe → same deadlock pattern.
- A process that writes only a few bytes to both streams → no deadlock (buffer never fills).

---

### Bug 2 — No Process Timeout

#### Bug Condition

The bug manifests when `ProcessRunner.run()` calls `process.waitFor()` with no timeout
argument. If the child process hangs (network stall, infinite loop, waiting for input),
the JVM thread blocks forever, the `ScanJob` remains stuck in `IN_PROGRESS`, and the
async thread pool slot is permanently consumed.

**Formal Specification:**
```
FUNCTION isBugCondition_Timeout(process)
  INPUT:  process of type Process
  OUTPUT: boolean

  RETURN process.isRunning
         AND process.elapsedSeconds > CONFIGURED_TIMEOUT_SECONDS
         AND waitFor_called_without_timeout(process)
END FUNCTION
```

**Examples:**
- Trivy stalls downloading the CVE database on a slow/broken network connection → hangs
  forever with no timeout guard.
- Semgrep enters an analysis loop on a pathological source file → never exits.
- A process that completes in 2 seconds → timeout condition never triggers.

---

### Bug 3 — Wrong Trivy CLI Flags

#### Bug Condition

The bug manifests when `ScanOrchestrator` invokes Trivy with flags that do not match the
correct `trivy fs --scanners vuln --format json --output <file> --quiet <path>` signature.
Incorrect flags cause Trivy to either error out, produce output in the wrong format, or
write results to stdout instead of a file, resulting in no usable JSON findings.

**Formal Specification:**
```
FUNCTION isBugCondition_TrivyFlags(command)
  INPUT:  command of type List<String>
  OUTPUT: boolean

  expected := ["trivy", "fs", "--scanners", "vuln",
               "--format", "json",
               "--output", <resultsFilePath>,
               "--quiet", <repoPath>]

  RETURN command != expected
END FUNCTION
```

**Examples:**
- Command uses `--format table` instead of `--format json` → output is human-readable text,
  not parseable JSON → `TrivyParser` receives garbage → 0 findings reported.
- Command omits `--output <file>` → Trivy writes JSON to stdout, but `ScanOrchestrator`
  reads from a file that was never created → empty results.
- Command uses correct flags → results file is created with valid JSON.

---

### Bug 4 — Wrong Semgrep CLI Flags

#### Bug Condition

The bug manifests when `ScanOrchestrator` invokes Semgrep with flags that do not match the
correct `semgrep scan --config auto --json -o <file> --quiet <path>` signature.

**Formal Specification:**
```
FUNCTION isBugCondition_SemgrepFlags(command)
  INPUT:  command of type List<String>
  OUTPUT: boolean

  expected := [<semgrepPath>, "scan", "--config", "auto",
               "--json", "-o", <resultsFilePath>,
               "--quiet", <repoPath>]

  RETURN command != expected
END FUNCTION
```

**Examples:**
- Command uses `--output` (long form) instead of `-o` → Semgrep may not recognize the flag
  → no results file created → 0 findings.
- Command omits `--quiet` → Semgrep writes progress output to stdout, which is not captured
  in the results file → parser receives empty/wrong content.
- Command uses correct flags → results file is created with valid JSON.

---

### Bug 5 — Fragile JSON Parsing in TrivyParser

#### Bug Condition

The bug manifests when `TrivyParser.parse()` encounters a Trivy result entry where the
`Vulnerabilities` field is absent or JSON null. The original code calls `.elements()` or
iterates directly on the node without checking for null/missing, causing a
`NullPointerException` that propagates up and marks the `ScanJob` as `FAILED`.

**Formal Specification:**
```
FUNCTION isBugCondition_NullVulnerabilities(resultNode)
  INPUT:  resultNode of type JsonNode (a single entry from Trivy's "Results" array)
  OUTPUT: boolean

  vulns := resultNode.path("Vulnerabilities")
  RETURN vulns.isMissingNode() OR vulns.isNull()
END FUNCTION
```

**Examples:**
- Trivy scans a Go module with no CVEs → result entry: `{"Target":"go.sum","Vulnerabilities":null}`
  → parser throws NPE → scan marked FAILED.
- Trivy scans a directory with no lock files → result entry has no `Vulnerabilities` key at all
  → `path("Vulnerabilities")` returns a MissingNode → same NPE.
- Trivy finds actual vulnerabilities → `Vulnerabilities` is a non-null array → no bug.

---

## Expected Behavior

### Preservation Requirements

The following behaviors must remain completely unchanged after all fixes are applied:

**Unchanged Behaviors:**
- WHEN a scanner process completes successfully within the timeout, the system SHALL continue
  to capture its exit code, stdout, and stderr and return a `ProcessResult`.
- WHEN Semgrep exits with code 0 (no findings) or code 1 (findings present), both SHALL
  continue to be treated as valid outcomes and the results file SHALL be parsed.
- WHEN Trivy exits with code 0, the results file SHALL continue to be read and parsed for
  vulnerability counts by severity (CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN).
- WHEN the scan pipeline completes successfully, scores SHALL continue to be calculated,
  all finding counts persisted, and the `ScanJob` marked as `COMPLETED`.
- WHEN the results JSON file is missing or empty after a scanner exits, the system SHALL
  continue to fall back to an empty results structure rather than crashing.
- WHEN `scan.mode=mock` is configured, the system SHALL continue to route to
  `MockScanService` and bypass all real scanner execution.
- WHEN `TrivyParser` receives a result entry with a valid, non-null `Vulnerabilities` array,
  it SHALL continue to count findings by severity exactly as before.

**Scope:**
All inputs that do NOT trigger any of the five bug conditions above must be completely
unaffected by the fixes. This includes:
- Processes that produce small stdout/stderr output (below OS pipe buffer size).
- Processes that complete well within the configured timeout.
- Trivy and Semgrep invocations that already use the correct flags.
- Trivy JSON result entries where `Vulnerabilities` is a valid array.

---

## Hypothesized Root Cause

### Bug 1 — Buffer Deadlock

The original `ProcessRunner.run()` most likely reads stdout to completion first
(`process.getInputStream().readAllBytes()`) and only then reads stderr. This is the
canonical Java `ProcessBuilder` mistake. When the child process writes enough to stderr
to fill the ~64 KB OS pipe buffer while the JVM is still blocked on stdout, the child
blocks on its `write()` syscall and the JVM never finishes reading stdout — circular wait.

**Specific causes to investigate:**
1. Sequential `readAllBytes()` calls: stdout drained first, stderr second (or vice versa).
2. Use of `ProcessBuilder.redirectErrorStream(false)` (separate streams) without concurrent
   draining threads.
3. No use of `CompletableFuture` or background threads to drain both streams simultaneously.

### Bug 2 — No Process Timeout

The original `ProcessRunner.run()` most likely calls `process.waitFor()` with no arguments,
which blocks indefinitely. Java's `Process.waitFor(long, TimeUnit)` overload (added in
Java 8) must be used instead, followed by `process.destroyForcibly()` on timeout.

### Bug 3 — Wrong Trivy CLI Flags

The original `ScanOrchestrator` likely constructs the Trivy command with one or more of:
- Wrong subcommand (e.g., `image` instead of `fs`)
- Missing `--scanners vuln` (scans all scanner types, slower and different output shape)
- Missing `--output <file>` (results go to stdout, not a file)
- Missing `--quiet` (progress output pollutes stdout)
- Wrong `--format` value

### Bug 4 — Wrong Semgrep CLI Flags

The original `ScanOrchestrator` likely constructs the Semgrep command with one or more of:
- Missing `scan` subcommand
- Using `--output` (long form) instead of `-o` (short form)
- Missing `--json` flag (output is text, not JSON)
- Missing `--quiet` flag

### Bug 5 — Fragile JSON Parsing

The original `TrivyParser` likely calls `result.get("Vulnerabilities")` (returns `null` for
missing keys) and then iterates over it without a null check, or calls `.elements()` on a
null `JsonNode`, causing a `NullPointerException`. Jackson's `path()` method returns a
`MissingNode` (never null) and should be used instead of `get()`, combined with an explicit
`isMissingNode()` / `isNull()` guard before iteration.

---

## Correctness Properties

Property 1: Bug Condition — Concurrent Stream Draining Prevents Deadlock

_For any_ process invocation where the combined stdout + stderr output would fill the OS
pipe buffer (i.e., `isBugCondition_Deadlock` returns true), the fixed `ProcessRunner.run()`
SHALL complete within the configured timeout without deadlocking, returning a `ProcessResult`
with the full stdout and stderr content captured.

**Validates: Requirements 2.1, 3.1**

---

Property 2: Preservation — Small-Output Processes Unaffected

_For any_ process invocation where stdout and stderr output is small enough that no pipe
buffer fills (i.e., `isBugCondition_Deadlock` returns false), the fixed `ProcessRunner.run()`
SHALL produce the same `ProcessResult` (exit code, stdout, stderr) as the original function.

**Validates: Requirements 3.1**

---

Property 3: Bug Condition — Timed-Out Processes Are Killed and Marked FAILED

_For any_ process invocation where the process runs longer than the configured timeout
(i.e., `isBugCondition_Timeout` returns true), the fixed `ProcessRunner.run()` SHALL
forcibly kill the process and throw a `RuntimeException` containing "timed out", causing
the `ScanOrchestrator` to mark the `ScanJob` as `FAILED` with an appropriate error message.

**Validates: Requirements 2.2**

---

Property 4: Preservation — Fast Processes Complete Normally

_For any_ process invocation that completes within the configured timeout (i.e.,
`isBugCondition_Timeout` returns false), the fixed `ProcessRunner.run()` SHALL return
a `ProcessResult` with the correct exit code and output, identical to the original behavior.

**Validates: Requirements 3.1**

---

Property 5: Bug Condition — Correct Trivy CLI Flags Produce Valid JSON Output

_For any_ Trivy invocation constructed by `ScanOrchestrator` (i.e., `isBugCondition_TrivyFlags`
returns false after the fix), the command list SHALL exactly match
`["trivy", "fs", "--scanners", "vuln", "--format", "json", "--output", <file>, "--quiet", <path>]`
and the results file SHALL be created with valid JSON content.

**Validates: Requirements 2.3, 3.3**

---

Property 6: Bug Condition — Correct Semgrep CLI Flags Produce Valid JSON Output

_For any_ Semgrep invocation constructed by `ScanOrchestrator` (i.e., `isBugCondition_SemgrepFlags`
returns false after the fix), the command list SHALL exactly match
`[<semgrepPath>, "scan", "--config", "auto", "--json", "-o", <file>, "--quiet", <path>]`
and the results file SHALL be created with valid JSON content.

**Validates: Requirements 2.4, 3.2**

---

Property 7: Bug Condition — Null/Missing Vulnerabilities Treated as Zero

_For any_ Trivy JSON input where at least one result entry has a missing or null
`Vulnerabilities` field (i.e., `isBugCondition_NullVulnerabilities` returns true),
the fixed `TrivyParser.parse()` SHALL return a `FindingCounts` with that entry contributing
zero to all severity counts, and SHALL NOT throw any exception.

**Validates: Requirements 2.5**

---

Property 8: Preservation — Valid Vulnerabilities Arrays Parsed Identically

_For any_ Trivy JSON input where all result entries have a non-null, non-missing
`Vulnerabilities` array (i.e., `isBugCondition_NullVulnerabilities` returns false for all
entries), the fixed `TrivyParser.parse()` SHALL return the same `FindingCounts` as the
original parser, preserving all severity counts exactly.

**Validates: Requirements 3.3, 3.4**

---

## Fix Implementation

### Changes Required

#### File: `backend/src/main/java/com/sentinelscan/infra/ProcessRunner.java`

**Function:** `run(List<String> command)`

**Change 1 — Concurrent Stream Draining (Bug 1):**
- Launch two `CompletableFuture<String>` tasks immediately after `process.start()`, one
  draining `process.getInputStream()` (stdout) and one draining `process.getErrorStream()`
  (stderr), each calling `InputStream.readAllBytes()` on a background thread.
- Do NOT read either stream on the main thread before calling `process.waitFor(...)`.
- After `waitFor` returns, call `.join()` on both futures to retrieve the captured strings.

```
stdoutFuture = CompletableFuture.supplyAsync(() -> drainStream(process.getInputStream()))
stderrFuture = CompletableFuture.supplyAsync(() -> drainStream(process.getErrorStream()))
completed    = process.waitFor(timeoutMinutes, TimeUnit.MINUTES)
stdout       = stdoutFuture.join()
stderr       = stderrFuture.join()
```

**Change 2 — Process Timeout (Bug 2):**
- Replace `process.waitFor()` (no-arg, blocks forever) with
  `process.waitFor(timeoutMinutes, TimeUnit.MINUTES)` which returns a boolean.
- If `completed == false`: call `process.destroyForcibly()`, wait up to 5 seconds for
  the process to die, then throw `RuntimeException("Process timed out after N minutes: <cmd>")`.
- Accept `timeoutMinutes` as a parameter to `run()` so callers can specify per-tool timeouts
  (`TIMEOUT_FAST_MIN = 3` for Semgrep, `TIMEOUT_TRIVY_MIN = 10` for Trivy).

---

#### File: `backend/src/main/java/com/sentinelscan/service/ScanOrchestrator.java`

**Function:** `runRealScan(UUID scanId)`

**Change 3 — Correct Trivy CLI Flags (Bug 3):**

Replace the existing Trivy command construction with:
```java
List.of(
    trivyCmd,
    "fs",
    "--scanners", "vuln",
    "--format",   "json",
    "--output",   trivyResultsFile.toString(),
    "--quiet",
    repoPath
)
```
Read results from `trivyResultsFile` (file-based output), not from `ProcessResult.output()`.

**Change 4 — Correct Semgrep CLI Flags (Bug 4):**

Replace the existing Semgrep command construction with:
```java
List.of(
    semgrepCmd,
    "scan",
    "--config", "auto",
    "--json",
    "-o",       semgrepResultsFile.toString(),
    "--quiet",
    repoPath
)
```
Read results from `semgrepResultsFile` (file-based output), not from `ProcessResult.output()`.

---

#### File: `backend/src/main/java/com/sentinelscan/parser/TrivyParser.java`

**Function:** `parse(String json)`

**Change 5 — Null-Safe Vulnerabilities Iteration (Bug 5):**
- Use `result.path("Vulnerabilities")` (returns `MissingNode`, never null) instead of
  `result.get("Vulnerabilities")` (returns `null` for missing keys).
- Add an explicit guard before iterating:
  ```java
  JsonNode vulnerabilities = result.path("Vulnerabilities");
  if (vulnerabilities.isMissingNode() || vulnerabilities.isNull()) {
      continue; // treat as 0 vulnerabilities for this target
  }
  ```
- Do not throw; log a warning and continue to the next result entry.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach:

1. **Exploratory Phase** — Write tests that run against the *unfixed* code to surface
   counterexamples and confirm the root cause hypotheses. Tests are expected to fail here.
2. **Fix + Preservation Phase** — After applying fixes, run the same tests to verify
   fix checking (bug inputs now behave correctly) and preservation checking (non-bug inputs
   are unaffected).

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate each bug on unfixed code. Confirm or
refute root cause hypotheses. If a hypothesis is refuted, re-analyze before implementing.

**Test Plan:** Write unit/integration tests that simulate each bug condition and assert the
expected correct behavior. Run on unfixed code — all should fail, confirming the bugs exist.

**Test Cases:**

1. **Deadlock Simulation** (`ProcessRunnerDeadlockTest`): Launch a subprocess that writes
   >64 KB to both stdout and stderr. Assert that `run()` completes within 5 seconds.
   *(Will hang/timeout on unfixed code — confirms Bug 1.)*

2. **Timeout Enforcement** (`ProcessRunnerTimeoutTest`): Launch a subprocess that sleeps
   for 60 seconds. Call `run()` with a 1-second timeout. Assert that a `RuntimeException`
   containing "timed out" is thrown within 3 seconds.
   *(Will block forever on unfixed code — confirms Bug 2.)*

3. **Trivy Flag Verification** (`ScanOrchestratorTrivyFlagsTest`): Capture the command list
   passed to `ProcessRunner` when Trivy is invoked. Assert it exactly matches the expected
   flag sequence.
   *(Will fail with wrong flags on unfixed code — confirms Bug 3.)*

4. **Semgrep Flag Verification** (`ScanOrchestratorSemgrepFlagsTest`): Capture the command
   list passed to `ProcessRunner` when Semgrep is invoked. Assert it exactly matches the
   expected flag sequence.
   *(Will fail with wrong flags on unfixed code — confirms Bug 4.)*

5. **Null Vulnerabilities Crash** (`TrivyParserNullVulnerabilitiesTest`): Call
   `TrivyParser.parse()` with JSON containing a result entry where `Vulnerabilities` is
   `null`. Assert no exception is thrown and the returned count is 0.
   *(Will throw NPE on unfixed code — confirms Bug 5.)*

6. **Missing Vulnerabilities Crash** (`TrivyParserMissingVulnerabilitiesTest`): Call
   `TrivyParser.parse()` with JSON containing a result entry with no `Vulnerabilities` key.
   Assert no exception is thrown and the returned count is 0.
   *(Will throw NPE on unfixed code — confirms Bug 5.)*

**Expected Counterexamples:**
- `run()` never returns when both streams produce large output (Bug 1).
- `run()` never returns when the process sleeps indefinitely (Bug 2).
- Command list contains wrong flags for Trivy (Bug 3) and Semgrep (Bug 4).
- `TrivyParser.parse()` throws `NullPointerException` on null/missing `Vulnerabilities` (Bug 5).

---

### Fix Checking

**Goal:** Verify that for all inputs where each bug condition holds, the fixed function
produces the expected correct behavior.

**Bug 1 — Deadlock Fix:**
```
FOR ALL process WHERE isBugCondition_Deadlock(process) DO
  result := ProcessRunner_fixed.run(process)
  ASSERT result.completedWithoutDeadlock
      AND result.stdout.length >= 0
      AND result.stderr.length >= 0
END FOR
```

**Bug 2 — Timeout Fix:**
```
FOR ALL process WHERE isBugCondition_Timeout(process, timeoutMinutes) DO
  ASSERT throws RuntimeException("timed out")
      AND process.isDestroyed
END FOR
```

**Bug 3 — Trivy Flags Fix:**
```
FOR ALL invocation WHERE isBugCondition_TrivyFlags(invocation) DO
  command := ScanOrchestrator_fixed.buildTrivyCommand(repoPath, outputFile)
  ASSERT command = ["trivy", "fs", "--scanners", "vuln",
                    "--format", "json", "--output", outputFile, "--quiet", repoPath]
END FOR
```

**Bug 4 — Semgrep Flags Fix:**
```
FOR ALL invocation WHERE isBugCondition_SemgrepFlags(invocation) DO
  command := ScanOrchestrator_fixed.buildSemgrepCommand(repoPath, outputFile)
  ASSERT command = [semgrepPath, "scan", "--config", "auto",
                    "--json", "-o", outputFile, "--quiet", repoPath]
END FOR
```

**Bug 5 — Null Vulnerabilities Fix:**
```
FOR ALL resultNode WHERE isBugCondition_NullVulnerabilities(resultNode) DO
  counts := TrivyParser_fixed.parse(wrapInTrivyJson(resultNode))
  ASSERT counts.total = 0
      AND no_exception_thrown
END FOR
```

---

### Preservation Checking

**Goal:** Verify that for all inputs where each bug condition does NOT hold, the fixed
function produces the same result as the original function.

**Pseudocode (general form):**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT F_original(input) = F_fixed(input)
END FOR
```

**Testing Approach:** Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan:** Observe behavior on unfixed code first for non-buggy inputs, then write
property-based tests capturing that behavior, and verify they pass on fixed code.

**Preservation Test Cases:**

1. **Small-Output Process Preservation** (`ProcessRunnerSmallOutputPreservationTest`):
   Property test — generate random small stdout/stderr strings (< 1 KB each). Verify that
   `run()` returns the same exit code and output content before and after the fix.

2. **Fast-Process Preservation** (`ProcessRunnerFastProcessPreservationTest`):
   Property test — generate processes that complete in < 1 second. Verify that `run()` with
   a 5-minute timeout returns the correct `ProcessResult` (exit code, stdout, stderr).

3. **Valid Trivy JSON Preservation** (`TrivyParserValidJsonPreservationTest`):
   Property test — generate Trivy JSON with random non-null `Vulnerabilities` arrays of
   varying lengths and severity distributions. Verify that `parse()` returns the same
   `FindingCounts` before and after the fix.

4. **Semgrep Exit Code Preservation** (`ScanOrchestratorSemgrepExitCodeTest`):
   Unit test — verify that Semgrep exit codes 0 and 1 are both treated as valid (no error
   path taken) after the fix, matching original behavior.

5. **Mock Mode Bypass Preservation** (`ScanOrchestratorMockModeTest`):
   Unit test — verify that when `scan.mode=mock`, `MockScanService.runScan()` is called
   and `ProcessRunner` is never invoked, identical to original behavior.

---

### Unit Tests

- `ProcessRunnerTest` — test concurrent draining with large outputs, timeout enforcement,
  normal completion, and forcible kill behavior.
- `TrivyParserTest` — test null `Vulnerabilities`, missing `Vulnerabilities`, empty array,
  mixed null/valid entries, all severity levels, unknown severity defaulting to LOW.
- `SemgrepParserTest` — test missing `results`, null `extra`, all severity mappings
  (CRITICAL, ERROR→HIGH, WARNING→MEDIUM, INFO→LOW).
- `ScanOrchestratorFlagsTest` — test exact command list construction for both Trivy and
  Semgrep, including path resolution and output file placement.

### Property-Based Tests

- **Deadlock Property** — generate processes with random stdout/stderr sizes from 0 to
  512 KB; verify `run()` always completes within timeout (Property 1 & 2).
- **Timeout Property** — generate processes with random sleep durations; verify that
  processes exceeding timeout are always killed and throw, while fast processes always
  return results (Property 3 & 4).
- **TrivyParser Null-Safety Property** — generate Trivy JSON with random combinations of
  null, missing, and valid `Vulnerabilities` arrays; verify no exception is ever thrown
  and counts are always non-negative (Property 7 & 8).
- **TrivyParser Severity Counting Property** — generate Trivy JSON with random vulnerability
  arrays; verify that the sum of all severity counts equals the total number of vulnerability
  entries (Property 8).

### Integration Tests

- **Full Scan Pipeline with Mock Process** — stub `ProcessRunner` to return pre-canned
  Trivy and Semgrep JSON; verify the full pipeline from `ScanOrchestrator.runRealScan()`
  through to `ScanJob.status = COMPLETED` with correct scores.
- **Timeout Propagation** — stub `ProcessRunner` to throw a timeout `RuntimeException`;
  verify `ScanJob.status = FAILED` and `errorMessage` contains "timed out".
- **Null Vulnerabilities End-to-End** — stub `ProcessRunner` to return Trivy JSON with
  null `Vulnerabilities`; verify the pipeline completes with `status = COMPLETED` and
  `trivyCritical = 0`.
