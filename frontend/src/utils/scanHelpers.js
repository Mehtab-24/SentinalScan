// Shared severity helpers for findings tables

export const SEV_ORDER = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'];

export function sevClass(s) {
  switch((s||'').toUpperCase()){
    case 'CRITICAL': return 'sev-critical';
    case 'HIGH':     return 'sev-high';
    case 'MEDIUM':   return 'sev-medium';
    case 'LOW':      return 'sev-low';
    default:         return 'sev-info';
  }
}

export function sevLabel(s) {
  switch((s||'').toUpperCase()){
    case 'CRITICAL': return 'CRIT';
    case 'HIGH':     return 'HIGH';
    case 'MEDIUM':   return 'MED';
    case 'LOW':      return 'LOW';
    default:         return 'INFO';
  }
}

export function sevRank(s) {
  const i = SEV_ORDER.indexOf((s||'').toUpperCase());
  return i === -1 ? 99 : i;
}

export function shortPath(p) {
  if (!p) return '';
  const parts = p.replace(/\\/g,'/').split('/');
  return parts.length > 2 ? '…/'+parts.slice(-2).join('/') : p;
}

export function scoreColor(score) {
  if (score == null) return 'var(--text-secondary)';
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function scoreGrade(score) {
  if (score == null) return null;
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function fmtMs(ms) {
  if (!ms) return null;
  const s = Math.round(ms/1000);
  return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;
}

/** Parse Semgrep JSON into flat finding rows */
export function parseSemgrep(raw) {
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (j?.results ?? []).map(r => ({
      severity: (r.extra?.severity ?? r.severity ?? 'INFO').toUpperCase(),
      rule:     r.check_id ?? r.rule_id ?? '—',
      path:     r.path ?? '',
      line:     r.start?.line ?? '',
      message:  r.extra?.message ?? r.message ?? '',
    })).sort((a,b) => sevRank(a.severity) - sevRank(b.severity));
  } catch { return []; }
}

/** Parse Trivy JSON into flat finding rows */
export function parseTrivy(raw) {
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const rows = [];
    (j?.Results ?? []).forEach(rs => {
      (rs.Vulnerabilities ?? []).forEach(v => {
        rows.push({
          severity:  (v.Severity ?? 'INFO').toUpperCase(),
          cve:       v.VulnerabilityID ?? '—',
          pkg:       v.PkgName ?? '—',
          installed: v.InstalledVersion ?? '—',
          fixed:     v.FixedVersion ?? '—',
          title:     v.Title ?? v.Description ?? '—',
          target:    rs.Target ?? '',
        });
      });
    });
    return rows.sort((a,b) => sevRank(a.severity) - sevRank(b.severity));
  } catch { return []; }
}

/** Paginate an array */
export function paginate(arr, page, size) {
  const start = page * size;
  return arr.slice(start, start + size);
}
