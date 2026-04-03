export default function NewTripLoading() {
  const waypoints = [
    { x: "12%", y: "70%", delay: "0s",    color: "#6366f1" },
    { x: "30%", y: "35%", delay: "0.4s",  color: "#f43f5e" },
    { x: "52%", y: "55%", delay: "0.8s",  color: "#f59e0b" },
    { x: "72%", y: "25%", delay: "1.2s",  color: "#10b981" },
    { x: "88%", y: "50%", delay: "1.6s",  color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6 select-none">
      <style>{`
        @keyframes routeDraw {
          0%   { stroke-dashoffset: 600; opacity: 0; }
          20%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes pinDrop {
          0%   { transform: translateY(-40px) scale(0.4); opacity: 0; }
          55%  { transform: translateY(4px) scale(1.15); opacity: 1; }
          75%  { transform: translateY(-2px) scale(0.95); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes planePilot {
          0%   { left: 8%; opacity: 0; transform: translateY(0) rotate(12deg); }
          5%   { opacity: 1; }
          40%  { transform: translateY(-12px) rotate(8deg); }
          60%  { transform: translateY(4px) rotate(14deg); }
          95%  { opacity: 1; }
          100% { left: 90%; opacity: 0; transform: translateY(0) rotate(12deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes fadeSlide {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1);   opacity: 0.4; }
          50%       { transform: scale(1.5); opacity: 1; }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: route map with animated path drawing */}
      <div className="relative h-52 rounded-2xl overflow-hidden border border-indigo-100"
           style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)" }}>

        {/* Grid dots background */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-white/20"
            style={{
              left: `${(i % 10) * 10 + 5}%`,
              top:  `${Math.floor(i / 10) * 12.5 + 6}%`,
              animation: `dotPulse ${2 + (i % 5) * 0.3}s ease-in-out infinite ${(i * 0.08) % 1.5}s`,
            }}
          />
        ))}

        {/* Animated route line */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path
            d={`M ${waypoints.map(w => `${w.x} ${w.y}`).join(" L ")}`}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="2.5"
            strokeDasharray="600"
            strokeDashoffset="600"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "routeDraw 2.2s cubic-bezier(.4,0,.2,1) forwards 0.2s" }}
          />
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#818cf8"/>
              <stop offset="50%"  stopColor="#f472b6"/>
              <stop offset="100%" stopColor="#34d399"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Waypoint pins */}
        {waypoints.map((w, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{
              left: w.x, top: w.y,
              transform: "translate(-50%, -100%)",
              animation: `pinDrop 0.45s cubic-bezier(.36,.07,.19,.97) both ${w.delay}`,
              opacity: 0,
            }}
          >
            <div className="w-5 h-5 rounded-full border-2 border-white/80 shadow-lg"
                 style={{ background: w.color }}/>
            <div className="w-0.5 h-2 mt-0.5" style={{ background: w.color + "80" }}/>
          </div>
        ))}

        {/* Flying plane */}
        <span
          className="absolute text-2xl"
          style={{
            top: "42%",
            animation: "planePilot 3.5s ease-in-out infinite 0.5s",
          }}
        >
          ✈️
        </span>

        {/* Label */}
        <div className="absolute bottom-3 inset-x-0 text-center">
          <span className="text-indigo-300 text-xs font-medium tracking-widest uppercase opacity-80">
            Planning your adventure…
          </span>
        </div>
      </div>

      {/* Form skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          {[
            { label: "Trip name", wide: true },
            { label: "Destination", wide: false },
            { label: "Dates", wide: false },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3"
                 style={{ animation: `fadeSlide 0.35s ease forwards ${0.1 + i * 0.1}s`, opacity: 0 }}>
              <div className="shimmer-bar h-4 w-28"/>
              <div className={`shimmer-bar h-11 rounded-xl ${f.wide ? "w-full" : "w-3/4"}`}/>
            </div>
          ))}

          {/* Travellers skeleton */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
               style={{ animation: "fadeSlide 0.35s ease forwards 0.4s", opacity: 0 }}>
            <div className="shimmer-bar h-4 w-32"/>
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="shimmer-bar w-9 h-9 rounded-full"/>
                  <div className="shimmer-bar h-3 w-16"/>
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <div style={{ animation: "fadeSlide 0.35s ease forwards 0.5s", opacity: 0 }}>
            <div className="shimmer-bar h-11 w-36 rounded-xl"/>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4"
             style={{ animation: "fadeSlide 0.35s ease forwards 0.3s", opacity: 0 }}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="shimmer-bar h-4 w-24"/>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="shimmer-bar w-4 h-4 rounded"/>
                <div className="shimmer-bar h-3 flex-1"/>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="shimmer-bar h-4 w-28"/>
            <div className="shimmer-bar h-24 rounded-xl"/>
          </div>
        </div>
      </div>
    </div>
  );
}
