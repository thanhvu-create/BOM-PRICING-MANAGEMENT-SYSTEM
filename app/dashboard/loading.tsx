export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', padding: '1.25rem' }}>
            <div className="skel" style={{ width: '60%', height: 11, marginBottom: 10 }} />
            <div className="skel" style={{ width: '40%', height: 22 }} />
          </div>
        ))}
      </div>
      {/* Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', padding: '1.25rem' }}>
            <div className="skel" style={{ width: '40%', height: 12, marginBottom: 16 }} />
            {[...Array(4)].map((_, j) => (
              <div key={j} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div className="skel" style={{ flex: 1, height: 12 }} />
                <div className="skel" style={{ width: '30%', height: 12 }} />
              </div>
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
