-- V1: Initial schema for SentinelScan

CREATE TABLE IF NOT EXISTS scan_jobs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_url        TEXT        NOT NULL,
    repo_name       TEXT,
    status          TEXT        NOT NULL DEFAULT 'PENDING',
    error_message   TEXT,

    -- Security scores (0–100, populated on COMPLETED)
    semgrep_score   INTEGER,
    trivy_score     INTEGER,
    overall_score   INTEGER,

    -- Severity counts from Semgrep
    semgrep_critical INTEGER DEFAULT 0,
    semgrep_high     INTEGER DEFAULT 0,
    semgrep_medium   INTEGER DEFAULT 0,
    semgrep_low      INTEGER DEFAULT 0,

    -- Severity counts from Trivy
    trivy_critical  INTEGER DEFAULT 0,
    trivy_high      INTEGER DEFAULT 0,
    trivy_medium    INTEGER DEFAULT 0,
    trivy_low       INTEGER DEFAULT 0,

    -- Raw JSON findings (stored as text; cast to jsonb if needed)
    semgrep_findings TEXT,
    trivy_findings   TEXT,

    -- Timing
    duration_ms     BIGINT,
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    started_at      TIMESTAMP WITHOUT TIME ZONE,
    completed_at    TIMESTAMP WITHOUT TIME ZONE
);

-- Index for history queries (newest first)
CREATE INDEX IF NOT EXISTS idx_scan_jobs_created_at ON scan_jobs (created_at DESC);

-- Index for status-based filtering
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs (status);
