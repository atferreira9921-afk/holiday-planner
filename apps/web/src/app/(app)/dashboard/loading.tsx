export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 select-none">
      <style>{`
        @keyframes globeSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pinDrop {
          0%   { transform: translateY(-18px) scale(0); opacity: 0; }
          60%  { transform: translateY(2px) scale(1.1); opacity: 1; }
          80%  { transform: translateY(-3px) scale(0.95); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pingRipple {
          0%   { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes orbitPlane {
          0%   { transform: rotate(0deg)   translateX(72px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(72px) rotate(-360deg); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Globe hero */}
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="relative w-44 h-44">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
          {/* Globe SVG */}
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <radialGradient id="globeGrad" cx="38%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#eef2ff"/>
                <stop offset="100%" stopColor="#c7d2fe"/>
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="74" fill="url(#globeGrad)" stroke="#a5b4fc" strokeWidth="1.5"/>
            {/* Latitude lines */}
            {[60, 80, 100, 120, 140].map(y => (
              <ellipse key={y} cx="100" cy={y} rx={Math.sqrt(74*74 - (y-100)*(y-100))} ry="14"
                fill="none" stroke="#c7d2fe" strokeWidth="1"/>
            ))}
            {/* Longitude line */}
            <line x1="100" y1="26" x2="100" y2="174" stroke="#c7d2fe" strokeWidth="1"/>
            <ellipse cx="100" cy="100" rx="74" ry="24" fill="none" stroke="#c7d2fe" strokeWidth="1"/>

            {/* Destination pins with ripples */}
            {[
              { cx: 68, cy: 90, color: "#6366f1", delay: "0s" },
              { cx: 138, cy: 80, color: "#f43f5e", delay: "0.5s" },
              { cx: 106, cy: 128, color: "#f59e0b", delay: "1s" },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.cx} cy={p.cy} r="8" fill={p.color} opacity="0.15"
                  style={{ animation: `pingRipple 2s ease-out infinite ${p.delay}` }}/>
                <circle cx={p.cx} cy={p.cy} r="5" fill={p.color} opacity="0.9"
                  style={{ animation: `pinDrop 0.5s cubic-bezier(.36,.07,.19,.97) both ${p.delay}` }}/>
              </g>
            ))}

            {/* Orbiting plane */}
            <g style={{ transformOrigin: "100px 100px", animation: "orbitPlane 4s linear infinite" }}>
              <text x="96" y="24" fontSize="16" textAnchor="middle">✈️</text>
            </g>
          </svg>
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Loading dashboard…</p>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
            <div className="shimmer-bar h-3 w-20"/>
            <div className="shimmer-bar h-7 w-12"/>
          </div>
        ))}
      </div>

      {/* Row skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
        <div className="shimmer-bar h-5 w-36"/>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="shimmer-bar w-10 h-10 rounded-xl flex-shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="shimmer-bar h-4 w-48"/>
              <div className="shimmer-bar h-3 w-32"/>
            </div>
            <div className="shimmer-bar h-5 rounded-full w-16"/>
          </div>
        ))}
      </div>
    </div>
  );
}
