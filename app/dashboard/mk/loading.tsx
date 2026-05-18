export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-base)', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{ padding: '0.65rem 1rem', borderBottom: i === 0 ? '2px solid var(--border-strong)' : '2px solid transparent', flexShrink: 0 }}>
            <div className="skel" style={{ width: 70, height: 10 }} />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: '1rem' }}>
        <div className="skel" style={{ width: 90, height: 32 }} />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
        <div style={{ display: 'flex', gap: 12, padding: '0.65rem 1rem', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-base)' }}>
          {[10, 12, 12, 8, 6].map((w, i) => (
            <div key={i} className="skel" style={{ flex: w, height: 10 }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
            {[10, 12, 12, 8, 6].map((w, j) => (
              <div key={j} className="skel" style={{ flex: w, height: 13 }} />
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
