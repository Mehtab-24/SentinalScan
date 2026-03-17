package com.sentinelscan.infra;

/**
 * Result from a ProcessBuilder execution.
 *
 * @param exitCode process exit code (0 = success for most tools; Semgrep uses 1 for findings)
 * @param output   combined stdout content
 */
public record ProcessResult(int exitCode, String output) {}
