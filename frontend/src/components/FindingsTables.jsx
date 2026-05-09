import { useState } from 'react';
import { sevClass, sevLabel, shortPath, paginate } from '../utils/scanHelpers';

const PAGE_SIZE = 25;

function SevBadge({ sev }) {
  return <span className={`sev-badge ${sevClass(sev)}`}>{sevLabel(sev)}</span>;
}

function Pager({ page, total, size, onPage }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-secondary)' }}>
      <button className="btn-secondary" style={{ padding:'3px 10px', fontSize:11 }} onClick={() => onPage(p => Math.max(0,p-1))} disabled={page===0}>← Prev</button>
      <span>Page {page+1} of {pages}</span>
      <button className="btn-secondary" style={{ padding:'3px 10px', fontSize:11 }} onClick={() => onPage(p => Math.min(pages-1,p+1))} disabled={page===pages-1}>Next →</button>
      <span style={{ marginLeft:'auto' }}>{total} findings</span>
    </div>
  );
}

/** Semgrep SAST findings table */
export function SemgrepTable({ rows }) {
  const [page, setPage] = useState(0);
  const slice = paginate(rows, page, PAGE_SIZE);

  if (rows.length === 0) return (
    <div className="empty-state">
      <span style={{ fontSize:20 }}>✓</span>
      <strong style={{ color:'#22c55e' }}>No SAST findings</strong>
      <span>Semgrep found no security issues in this repository.</span>
    </div>
  );

  return (
    <div style={{ overflowX:'auto' }}>
      <table className="findings-table">
        <thead>
          <tr>
            <th style={{ width:68 }}>Severity</th>
            <th style={{ width:'28%' }}>Rule ID</th>
            <th style={{ width:'28%' }}>File</th>
            <th style={{ width:50 }}>Line</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((f,i) => (
            <tr key={i}>
              <td><SevBadge sev={f.severity} /></td>
              <td className="mono" title={f.rule} style={{ maxWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{f.rule}</td>
              <td className="mono" title={f.path}>{shortPath(f.path)}</td>
              <td className="mono" style={{ color:'var(--text-muted)' }}>{f.line}</td>
              <td style={{ color:'var(--text-secondary)', fontSize:11, maxWidth:0, overflow:'hidden', textOverflow:'ellipsis' }} title={f.message}>{f.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} total={rows.length} size={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

/** Trivy SCA findings table */
export function TrivyTable({ rows }) {
  const [page, setPage] = useState(0);
  const slice = paginate(rows, page, PAGE_SIZE);

  if (rows.length === 0) return (
    <div className="empty-state">
      <span style={{ fontSize:20 }}>✓</span>
      <strong style={{ color:'#22c55e' }}>No dependency vulnerabilities</strong>
      <span>Trivy found no CVEs in this repository's dependencies.</span>
    </div>
  );

  return (
    <div style={{ overflowX:'auto' }}>
      <table className="findings-table">
        <thead>
          <tr>
            <th style={{ width:68 }}>Severity</th>
            <th style={{ width:'14%' }}>CVE ID</th>
            <th style={{ width:'16%' }}>Package</th>
            <th style={{ width:'10%' }}>Installed</th>
            <th style={{ width:'10%' }}>Fixed</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((f,i) => (
            <tr key={i}>
              <td><SevBadge sev={f.severity} /></td>
              <td className="mono">
                {f.cve.startsWith('CVE-') ? (
                  <a href={`https://nvd.nist.gov/vuln/detail/${f.cve}`} target="_blank" rel="noreferrer"
                    style={{ color:'var(--accent)', textDecoration:'none' }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
                    {f.cve}
                  </a>
                ) : f.cve}
              </td>
              <td className="mono" style={{ color:'var(--text-primary)' }}>{f.pkg}</td>
              <td className="mono" style={{ color:'var(--text-muted)' }}>{f.installed}</td>
              <td className="mono" style={{ color: f.fixed && f.fixed !== '—' ? '#22c55e' : 'var(--text-muted)' }}>{f.fixed}</td>
              <td style={{ color:'var(--text-secondary)', fontSize:11, maxWidth:0, overflow:'hidden', textOverflow:'ellipsis' }} title={f.title}>{f.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} total={rows.length} size={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}
