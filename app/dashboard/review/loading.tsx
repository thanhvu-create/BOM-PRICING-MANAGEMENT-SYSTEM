export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="skel" style={{ flex: 1, height: 36 }} />
        <div className="skel" style={{ width: 140, height: 36 }} />
        <div className="skel" style={{ width: 90, height: 36 }} />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 8, padding: '0.65rem 1rem', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-base)' }}>
          {[5, 8, 7, 9, 8, 6, 6, 6, 7, 7, 8, 7].map((w, i) => (
            <div key={i} className="skel" style={{ flex: w, height: 10 }} />
          ))}
        </div>
        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '0.55rem 1rem', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
            <div className="skel" style={{ width: 36, height: 36, flexShrink: 0 }} />
            {[8, 7, 9, 8, 6, 6, 6, 7, 7, 8, 7].map((w, j) => (
              <div key={j} className="skel" style={{ flex: w, height: 12 }} />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <div className="skel" style={{ width: 120, height: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skel" style={{ width: 70, height: 30 }} />
          <div className="skel" style={{ width: 70, height: 30 }} />
        </div>
      </div>

      <style>{`
        .skel {
          background: linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-hover) 50%, var(--bg-muted) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 2px;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
