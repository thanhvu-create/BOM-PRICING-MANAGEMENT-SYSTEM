export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-base)', marginBottom: '1.5rem', gap: 0 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ padding: '0.75rem 1.25rem', borderBottom: i === 0 ? '2px solid var(--border-strong)' : '2px solid transparent' }}>
            <div className="skel" style={{ width: 90, height: 11 }} />
          </div>
        ))}
      </div>

      {/* Form grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {[...Array(9)].map((_, i) => (
          <div key={i}>
            <div className="skel" style={{ width: '55%', height: 10, marginBottom: 8 }} />
            <div className="skel" style={{ width: '100%', height: 34 }} />
          </div>
        ))}
      </div>

      {/* Gold table skeleton */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', marginBottom: '1rem' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-base)' }}>
          <div className="skel" style={{ width: 80, height: 11 }} />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
            {[...Array(5)].map((_, j) => (
              <div key={j} className="skel" style={{ flex: 1, height: 30 }} />
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
