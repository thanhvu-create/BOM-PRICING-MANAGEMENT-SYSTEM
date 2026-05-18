export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <div className="skel" style={{ width: 110, height: 34 }} />
        <div className="skel" style={{ width: 130, height: 34 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div className="skel" style={{ width: 100, height: 34 }} />
          <div className="skel" style={{ width: 120, height: 34 }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', overflowX: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 12, padding: '0.65rem 1rem', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-base)', minWidth: 700 }}>
          {[8, 10, 10, 10, 8, 8, 8, 8, 8].map((w, i) => (
            <div key={i} className="skel" style={{ flex: w, height: 10 }} />
          ))}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-light)', minWidth: 700 }}>
            {[8, 10, 10, 10, 8, 8, 8, 8, 8].map((w, j) => (
              <div key={j} className="skel" style={{ flex: w, height: 14 }} />
            ))}
          </div>
        ))}
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
