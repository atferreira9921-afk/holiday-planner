export default function HolidaysLoading() {
  const cells = Array.from({ length: 35 }, (_, i) => i);

  return (
    <div className="p-6 space-y-6 select-none">
      <style>{`
        @keyframes cellWave {
          0%   { opacity: 0; transform: scale(0.7); background: #e0e7ff; }
          60%  { background: #eef2ff; }
          100% { opacity: 1; transform: scale(1); background: #f8fafc; }
        }
        @keyframes sunRise {
          0%   { transform: translateY(28px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes floatEmoji {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-8px) rotate(3deg); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Floating emoji header */}
      <div className="flex items-center justify-center gap-6 py-4"
           style={{ animation: "sunRise 0.7s ease forwards" }}>
        {["🏖️", "🗓️", "✈️", "🌍", "🏝️"].map((e, i) => (
          <span key={i} className="text-3xl"
                style={{ animation: `floatEmoji 2.5s ease-in-out infinite ${i * 0.3}s` }}>
            {e}
          </span>
        ))}
      </div>

      {/* Controls skeleton */}
      <div className="flex items-center gap-3">
        <div className="shimmer-bar h-9 w-24 rounded-xl"/>
        <div className="shimmer-bar h-9 w-24 rounded-xl"/>
        <div className="shimmer-bar h-9 w-32 ml-auto rounded-xl"/>
      </div>

      {/* Month nav skeleton */}
      <div className="flex items-center justify-between">
        <div className="shimmer-bar h-7 w-32 rounded-xl"/>
        <div className="flex gap-2">
          <div className="shimmer-bar h-8 w-8 rounded-xl"/>
          <div className="shimmer-bar h-8 w-8 rounded-xl"/>
        </div>
      </div>

      {/* Animated calendar grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 p-px">
          {cells.map(i => (
            <div
              key={i}
              className="h-20 bg-slate-50 rounded"
              style={{
                animation: `cellWave 0.4s ease forwards`,
                animationDelay: `${i * 0.03}s`,
                opacity: 0,
              }}
            >
              {/* Occasional colored dot to hint at events */}
              {[3,7,12,17,21,27].includes(i) && (
                <div className="m-2 w-2 h-2 rounded-full bg-indigo-200"/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="flex gap-4">
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="shimmer-bar w-4 h-4 rounded-full"/>
            <div className="shimmer-bar h-3 w-20"/>
          </div>
        ))}
      </div>
    </div>
  );
}
