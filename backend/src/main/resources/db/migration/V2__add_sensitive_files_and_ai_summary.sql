-- V2: Add sensitive file scanning and AI summary features

ALTER TABLE scan_jobs ADD COLUMN IF NOT EXISTS ai_summary TEXT;

CREATE TABLE IF NOT EXISTS scan_job_leaked_files (
    scan_job_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_job_leaked_files_scan_job_id ON scan_job_leaked_files (scan_job_id);
