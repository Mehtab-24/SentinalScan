# Implementation Plan

- [x] 1. Write bug condition exploration tests (Bugs 1, 2, 5)
  - **Property 1: Bug Condition** - Deadlock, Timeout, and Null-Vulnerabilities Bugs
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For deterministic bugs (Bug 5), scope the property to the concrete failing cases to ensure reproducibility
  - Add `jqwik` dependency to `backend/pom.xml` for property-based testing:
    ```xml
    <dependency>
      <groupId>net.jqwik</groupId>
      <artifactId>jqwik</artifactId>
      <version>1.8.4</version>
      <scope>test</scope>
    </dependency>
    ```
  - Create `backend/src/test/java/com/sentinelscan/infra/ProcessRunnerTest.java`
  - **Bug 1 — Deadlock exploration**: Write a `@Property` test that launches a subprocess writing >64 KB to both stdout and stderr (e.g., `python -c "import sys; data='x'*100000; print(data); sys.stderr.write(data)"`). Assert `processRunner.run(cmd, 1)` completes within 5 seconds without hanging. Run on UNFIXED code — expect the test to hang/timeout (confirms Bug 1: `isBugCondition_Deadlock` — streams drained sequentially while both buffers fill)
  - **Bug 2 — Timeout exploration**: Write a `@Property` test that launches a subprocess sleeping for 60 seconds (e.g., `python -c "import time; time.sleep(60)"`). Call `processRunner.run(cmd, 0)` with a near-zero timeout. Assert a `RuntimeException` containing "timed out" is thrown within 3 seconds. Run on UNFIXED code — expect the test to block forever (confirms Bug 2: `isBugCondition_Timeout` — `waitFor()` called without timeout argument)
  - Create `backend/src/test/java/com/sentinelscan/parser/TrivyParserTest.java`
  - **Bug 5a — Null Vulnerabilities exploration**: Write a `@Property` test that calls `trivyParser.parse()` with JSON containing a result entry where `"Vulnerabilities": null`. Assert no exception is thrown and `counts.critical() + counts.high() + counts.medium() + counts.low() == 0`. Run on UNFIXED code — expect `NullPointerException` (confirms Bug 5: `isBugCondition_NullVulnerabilities` — `result.path("Vulnerabilities").isNull()` is true)
  - **Bug 5b — Missing Vulnerabilities exploration**: Write a `@Property` test that calls `trivyParser.parse()` with JSON containing a result entry with no `"Vulnerabilities"` key at all. Assert no exception is thrown and total count is 0. Run on UNFIXED code — expect `NullPointerException` (confirms Bug 5: `isBugCondition_NullVulnerabilities` — `result.path("Vulnerabilities").isMissingNode()` is true)
  - Run all exploration tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found:
    - Bug 1: `run()` never returns when both streams produce >64 KB output
    - Bug 2: `run()` never returns when the process sleeps indefinitely
    - Bug 5a: `TrivyParser.parse()` throws `NullPointerException` on `"Vulnerabilities": null`
    - Bug 5b: `TrivyParser.parse()` throws `NullPointerException` when `Vulnerabilities` key is absent
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Small-Output Processes, Fast Processes, and Valid Trivy JSON
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code for non-buggy inputs first
  - **Observe on UNFIXED code (non-buggy inputs)**:
    - `processRunner.run(["echo", "hello"], 1)` → exits 0, stdout="hello\n", stderr="" (small output, no deadlock)
    - `processRunner.run(["python", "-c", "print('ok')"], 1)` → exits 0 within 1 second (fast process, no timeout)
    - `trivyParser.parse({"Results":[{"Target":"go.sum","Vulnerabilities":[{"Severity":"HIGH"}]}]})` → `FindingCounts(0,1,0,0)` (valid array, no NPE)
  - In `ProcessRunnerTest.java`, add preservation `@Property` tests:
    - **Small-output preservation**: For all stdout/stderr strings with length < 1000 chars each, assert `run()` returns the correct exit code and the stdout content matches what the process wrote (isBugCondition_Deadlock is false — no buffer overflow)
    - **Fast-process preservation**: For all processes that complete in < 1 second, assert `run()` with a 5-minute timeout returns a `ProcessResult` with the correct exit code (isBugCondition_Timeout is false — completes before timeout)
  - In `TrivyParserTest.java`, add preservation `@Property` tests:
    - **Valid Vulnerabilities preservation**: For all Trivy JSON inputs where every result entry has a non-null, non-missing `Vulnerabilities` array, assert `parse()` returns `FindingCounts` where the sum of all severity counts equals the total number of vulnerability entries (isBugCondition_NullVulnerabilities is false for all entries)
    - **Severity counting preservation**: For random vulnerability arrays with known severity distributions, assert each severity bucket is counted correctly
  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.3, 3.4_

- [-] 3. Fix Bug 1 — Buffer Deadlock in ProcessRunner

  - [ ] 3.1 Implement concurrent stream draining in ProcessRunner
    - File: `backend/src/main/java/com/sentinelscan/infra/ProcessRunner.java`
    - Change method signature to `run(List<String> command, int timeoutMinutes)`
    - Immediately after `process = pb.start()`, launch two `CompletableFuture<String>` tasks:
      ```java
      CompletableFuture<String> stdoutFuture = CompletableFuture.supplyAsync(
          () -> drainStream(process.getInputStream(), "stdout"));
      CompletableFuture<String> stderrFuture = CompletableFuture.supplyAsync(
          () -> drainStream(process.getErrorStream(), "stderr"));
      ```
    - Call `process.waitFor(timeoutMinutes, TimeUnit.MINUTES)` BEFORE joining either future
    - After `waitFor` returns, call `stdoutFuture.join()` and `stderrFuture.join()`
    - Do NOT read either stream on the main thread before `waitFor`
    - _Bug_Condition: `isBugCondition_Deadlock(process)` — stdout or stderr pendingBytes > OS_PIPE_BUFFER_SIZE AND streams_drained_sequentially_
    - _Expected_Behavior: `run()` completes within timeout, returns `ProcessResult` with full stdout and stderr captured_
    - _Preservation: Processes with small output (below pipe buffer size) return identical `ProcessResult` (exit code, stdout, stderr)_
    - _Requirements: 2.1, 3.1_

  - [ ] 3.2 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - Concurrent Stream Draining Prevents Deadlock
    - **IMPORTANT**: Re-run the SAME test from task 1 (large-output deadlock test) — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `run()` completes within 5 seconds for >64 KB output on both streams
    - Run the deadlock exploration test from step 1 against the fixed `ProcessRunner`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 is fixed — concurrent draining prevents circular wait)
    - _Requirements: 2.1_

  - [ ] 3.3 Verify preservation tests still pass after Bug 1 fix
    - **Property 2: Preservation** - Small-Output Processes Unaffected
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Run small-output and fast-process preservation tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — small-output processes still return correct results)

- [ ] 4. Fix Bug 2 — No Process Timeout in ProcessRunner

  - [ ] 4.1 Implement process timeout with forcible kill
    - File: `backend/src/main/java/com/sentinelscan/infra/ProcessRunner.java`
    - Replace `process.waitFor()` (no-arg, blocks forever) with `boolean completed = process.waitFor(timeoutMinutes, TimeUnit.MINUTES)`
    - If `completed == false`:
      ```java
      log.error("Process timeout after {} minutes: {}", timeoutMinutes, command.get(0));
      process.destroyForcibly();
      if (!process.waitFor(5, TimeUnit.SECONDS)) {
          log.warn("Process did not die after forcible termination: {}", command.get(0));
      }
      throw new RuntimeException(
          "Process timed out after %d minutes: %s".formatted(timeoutMinutes, command.get(0)));
      ```
    - `ScanOrchestrator` already passes `TIMEOUT_FAST_MIN=3` for Semgrep and `TIMEOUT_TRIVY_MIN=10` for Trivy — no caller changes needed
    - _Bug_Condition: `isBugCondition_Timeout(process)` — process.isRunning AND elapsedSeconds > CONFIGURED_TIMEOUT_SECONDS AND waitFor_called_without_timeout_
    - _Expected_Behavior: `process.isDestroyed == true` AND `RuntimeException` thrown with message containing "timed out"_
    - _Preservation: Processes completing within timeout return correct `ProcessResult` with exit code and output_
    - _Requirements: 2.2, 3.1_

  - [ ] 4.2 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - Timed-Out Processes Are Killed and Marked FAILED
    - **IMPORTANT**: Re-run the SAME test from task 1 (60-second sleep timeout test) — do NOT write a new test
    - The test from task 1 asserts `RuntimeException` containing "timed out" is thrown within 3 seconds
    - Run the timeout exploration test from step 1 against the fixed `ProcessRunner`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 is fixed — `waitFor(N, MINUTES)` + `destroyForcibly()` enforces timeout)
    - _Requirements: 2.2_

  - [ ] 4.3 Verify preservation tests still pass after Bug 2 fix
    - **Property 2: Preservation** - Fast Processes Complete Normally
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Run fast-process preservation tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — processes completing within timeout still return correct results)

- [ ] 5. Fix Bugs 3 & 4 — Wrong CLI Flags in ScanOrchestrator

  - [ ] 5.1 Write CLI flag verification tests (BEFORE fixing flags)
    - Create `backend/src/test/java/com/sentinelscan/service/ScanOrchestratorFlagsTest.java`
    - Use Mockito to mock `ProcessRunner` and capture the `List<String>` command argument via `ArgumentCaptor`
    - **Trivy flag test**: Invoke the Trivy scan path and assert the captured command exactly equals:
      `["trivy", "fs", "--scanners", "vuln", "--format", "json", "--output", <trivyResultsFilePath>, "--quiet", <repoPath>]`
    - **Semgrep flag test**: Invoke the Semgrep scan path and assert the captured command exactly equals:
      `[<semgrepPath>, "scan", "--config", "auto", "--json", "-o", <semgrepResultsFilePath>, "--quiet", <repoPath>]`
    - Run on UNFIXED code — expect FAILURE (confirms Bugs 3 & 4: `isBugCondition_TrivyFlags` and `isBugCondition_SemgrepFlags` return true)
    - Document counterexamples: the actual wrong command lists captured
    - _Requirements: 1.3, 1.4_

  - [ ] 5.2 Fix Trivy CLI flags in ScanOrchestrator
    - File: `backend/src/main/java/com/sentinelscan/service/ScanOrchestrator.java`
    - Locate the Trivy command construction in `runRealScan()`
    - Replace with the exact flag sequence:
      ```java
      List.of(
          trivyCmd,
          "fs",
          "--scanners", "vuln",
          "--format",   "json",
          "--output",   trivyResultsFile.toString(),
          "--quiet",
          repoPath)
      ```
    - Ensure results are read from `trivyResultsFile` (file-based output), not from `ProcessResult.output()`
    - _Bug_Condition: `isBugCondition_TrivyFlags(command)` — command != expected trivy flag sequence_
    - _Expected_Behavior: command list exactly matches `["trivy","fs","--scanners","vuln","--format","json","--output",<file>,"--quiet",<path>]`_
    - _Preservation: Trivy exit code 0 still triggers results file parsing; exit code > 1 still falls back to empty JSON_
    - _Requirements: 2.3, 3.3_

  - [ ] 5.3 Fix Semgrep CLI flags in ScanOrchestrator
    - File: `backend/src/main/java/com/sentinelscan/service/ScanOrchestrator.java`
    - Locate the Semgrep command construction in `runRealScan()`
    - Replace with the exact flag sequence:
      ```java
      List.of(
          semgrepCmd,
          "scan",
          "--config", "auto",
          "--json",
          "-o",       semgrepResultsFile.toString(),
          "--quiet",
          repoPath)
      ```
    - Ensure results are read from `semgrepResultsFile` (file-based output), not from `ProcessResult.output()`
    - _Bug_Condition: `isBugCondition_SemgrepFlags(command)` — command != expected semgrep flag sequence_
    - _Expected_Behavior: command list exactly matches `[<semgrepPath>,"scan","--config","auto","--json","-o",<file>,"--quiet",<path>]`_
    - _Preservation: Semgrep exit codes 0 and 1 still treated as valid; exit code > 1 still falls back to empty JSON_
    - _Requirements: 2.4, 3.2_

  - [ ] 5.4 Verify CLI flag tests now pass
    - **Property 1: Expected Behavior** - Correct Trivy and Semgrep CLI Flags
    - **IMPORTANT**: Re-run the SAME tests from task 5.1 — do NOT write new tests
    - Run both Trivy and Semgrep flag verification tests from step 5.1
    - **EXPECTED OUTCOME**: Both tests PASS (confirms Bugs 3 & 4 are fixed — command lists match expected sequences)
    - _Requirements: 2.3, 2.4_

- [ ] 6. Fix Bug 5 — Fragile JSON Parsing in TrivyParser

  - [ ] 6.1 Implement null-safe Vulnerabilities iteration in TrivyParser
    - File: `backend/src/main/java/com/sentinelscan/parser/TrivyParser.java`
    - In the loop over `results`, replace any `result.get("Vulnerabilities")` call with `result.path("Vulnerabilities")` (Jackson's `path()` returns `MissingNode` instead of `null`)
    - Add an explicit guard before iterating:
      ```java
      JsonNode vulnerabilities = result.path("Vulnerabilities");
      if (vulnerabilities.isMissingNode() || vulnerabilities.isNull()) {
          log.debug("Result entry has no Vulnerabilities — treating as 0");
          continue;
      }
      ```
    - Do NOT throw; log at DEBUG level and continue to the next result entry
    - _Bug_Condition: `isBugCondition_NullVulnerabilities(resultNode)` — `resultNode.path("Vulnerabilities").isMissingNode() OR resultNode.path("Vulnerabilities").isNull()`_
    - _Expected_Behavior: `parse()` returns `FindingCounts` with that entry contributing 0 to all severity counts, no exception thrown_
    - _Preservation: Result entries with valid non-null `Vulnerabilities` arrays are counted by severity exactly as before_
    - _Requirements: 2.5, 3.3_

  - [ ] 6.2 Verify Bug 5 exploration tests now pass
    - **Property 1: Expected Behavior** - Null/Missing Vulnerabilities Treated as Zero
    - **IMPORTANT**: Re-run the SAME tests from task 1 (null and missing Vulnerabilities tests) — do NOT write new tests
    - Run both `TrivyParser` exploration tests (null Vulnerabilities and missing Vulnerabilities) from step 1
    - **EXPECTED OUTCOME**: Both tests PASS (confirms Bug 5 is fixed — no NPE, total count is 0)
    - _Requirements: 2.5_

  - [ ] 6.3 Verify TrivyParser preservation tests still pass after Bug 5 fix
    - **Property 2: Preservation** - Valid Vulnerabilities Arrays Parsed Identically
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Run valid-Vulnerabilities and severity-counting preservation tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — valid arrays still produce correct `FindingCounts`)

- [ ] 7. Checkpoint — Ensure all tests pass and application compiles

  - [ ] 7.1 Run the full test suite
    - Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-17"; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn test` in the `backend` directory
    - All tests in `ProcessRunnerTest`, `TrivyParserTest`, and `ScanOrchestratorFlagsTest` must pass
    - Existing tests (`ScoreCalculatorTest`, `GitCloneServiceTest`) must continue to pass
    - If any test fails, diagnose and fix before proceeding

  - [ ] 7.2 Verify application compiles and starts
    - Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-17"; $env:Path="$env:JAVA_HOME\bin;$env:Path"; mvn clean spring-boot:run` in the `backend` directory
    - Application must start without compilation errors
    - Confirm Spring context loads successfully (look for "Started SentinelScanApplication" in logs)
    - Ask the user if any questions arise during startup

  - [ ] 7.3 Confirm all five bugs are resolved
    - Bug 1 (Buffer Deadlock): `ProcessRunner` drains stdout and stderr concurrently via `CompletableFuture`
    - Bug 2 (No Timeout): `ProcessRunner` uses `waitFor(N, TimeUnit.MINUTES)` + `destroyForcibly()` on timeout
    - Bug 3 (Wrong Trivy Flags): `ScanOrchestrator` uses `trivy fs --scanners vuln --format json --output <file> --quiet <path>`
    - Bug 4 (Wrong Semgrep Flags): `ScanOrchestrator` uses `semgrep scan --config auto --json -o <file> --quiet <path>`
    - Bug 5 (Fragile TrivyParser): `TrivyParser` guards `Vulnerabilities` with `isMissingNode() || isNull()` before iterating
    - Ensure all tests pass; ask the user if questions arise
