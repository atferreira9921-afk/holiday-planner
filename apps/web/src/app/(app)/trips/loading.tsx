export default function TripsLoading() {
  return (
    <div className="p-6 space-y-5 select-none">
      <style>{`
        @keyframes pinDrop {
          0%   { transform: translateY(-30px) scale(0.5); opacity: 0; }
          55%  { transform: translateY(4px) scale(1.15); opacity: 1; }
          75%  { transform: translateY(-4px) scale(0.95); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes cardSlideUp {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes planeFly {
          0%   { transform: translate(-110px, 18px) rotate(-6deg); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(110px, -14px) rotate(-6deg); opacity: 0; }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%       { transform: scale(1.6); opacity: 1; }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: plane over a mini map grid */}
      <div className="relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center">
        {/* Dotted map grid */}
        <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mapGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.5" fill="#6366f1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapGrid)"/>
        </svg>

        {/* Destination pins */}
        {[
          { left: "22%", top: "35%", color: "#6366f1", delay: "0s"  },
          { left: "55%", top: "25%", color: "#f43f5e", delay: "0.4s" },
          { left: "78%", top: "55%", color: "#f59e0b", delay: "0.8s" },
        ].map((p, i) => (
          <div key={i} className="absolute text-xl"
               style={{ left: p.left, top: p.top,
                        animation: `pinDrop 0.6s cubic-bezier(.36,.07,.19,.97) both ${p.delay}` }}>
            📍
          </div>
        ))}

        {/* Flying plane */}
        <span className="text-3xl relative z-10"
              style={{ animation: "planeFly 2.8s ease-in-out infinite" }}>
          ✈️
        </span>
      </div>

      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="shimmer-bar h-7 w-32"/>
        <div className="shimmer-bar h-9 w-28 rounded-xl"/>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="shimmer-bar h-10 flex-1 rounded-xl"/>
        <div className="shimmer-bar h-10 w-36 rounded-xl"/>
      </div>

      {/* Status pills */}
      <div className="flex gap-2">
        {[80, 96, 72, 88, 64].map((w, i) => (
          <div key={i} className="shimmer-bar h-6 rounded-full" style={{ width: w }}/>
        ))}
      </div>

      {/* Trip cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3"
            style={{ animation: `cardSlideUp 0.4s ease forwards ${0.05 + i * 0.08}s`, opacity: 0 }}
          >
            {/* Map image area */}
            <div className="h-28 rounded-xl overflow-hidden relative bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="shimmer-bar absolute inset-0 rounded-xl"/>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl opacity-20">🗺️</span>
              </div>
            </div>
            <div className="shimmer-bar h-5 w-3/4"/>
            <div className="shimmer-bar h-5 w-20 rounded-full"/>
            <div className="space-y-1.5">
              <div className="shimmer-bar h-3 w-40"/>
              <div className="shimmer-bar h-3 w-24"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
