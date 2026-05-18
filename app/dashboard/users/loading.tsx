export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Add user form card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="skel" style={{ width: 120, height: 11, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="skel" style={{ width: '60%', height: 10, marginBottom: 8 }} />
              <div className="skel" style={{ width: '100%', height: 34 }} />
            </div>
          ))}
          <div className="skel" style={{ width: 80, height: 34 }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }}>
        <div style={{ display: 'flex', gap: 12, padding: '0.65rem 1rem', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-base)' }}>
          {[4, 10, 8, 7, 10, 5].map((w, i) => (
            <div key={i} className="skel" style={{ flex: w, height: 10 }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
            <div className="skel" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
            {[10, 8, 7, 10, 5].map((w, j) => (
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
