export default function OnboardingLoading() {
  const steps = [
    { icon: "👤", label: "Profile",    color: "#6366f1" },
    { icon: "🏠", label: "Home base",  color: "#f43f5e" },
    { icon: "✈️", label: "Travel style", color: "#f59e0b" },
    { icon: "❤️", label: "Interests",  color: "#10b981" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 select-none">
      <style>{`
        @keyframes rocketLaunch {
          0%   { transform: translateY(0) rotate(-20deg) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          60%  { transform: translateY(-18px) rotate(-15deg) scale(1.1); opacity: 1; }
          80%  { transform: translateY(-8px) rotate(-18deg) scale(1); }
          100% { transform: translateY(-14px) rotate(-16deg) scale(1); opacity: 1; }
        }
        @keyframes thruster {
          0%, 100% { transform: scaleY(1);   opacity: 0.8; }
          50%       { transform: scaleY(1.5); opacity: 0.4; }
        }
        @keyframes starFloat {
          0%, 100% { transform: translateY(0) scale(1);   opacity: 0.6; }
          50%       { transform: translateY(-8px) scale(1.2); opacity: 1; }
        }
        @keyframes stepPop {
          0%   { transform: scale(0.5) translateY(10px); opacity: 0; }
          60%  { transform: scale(1.1) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0);    opacity: 1; }
        }
        @keyframes progressFill {
          0%   { width: 0%; }
          100% { width: 30%; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes fadeSlide {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(48px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(48px) rotate(-360deg); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: rocket launch with orbiting stars */}
      <div className="relative h-52 rounded-2xl overflow-hidden border border-indigo-200"
           style={{ background: "linear-gradient(160deg, #0f0c29 0%, #1a1060 40%, #2d1b69 70%, #1e3a5f 100%)" }}>

        {/* Stars */}
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 5 === 0 ? 3 : 2,
              height: i % 5 === 0 ? 3 : 2,
              left: `${(i * 41 + 3) % 96}%`,
              top:  `${(i * 29 + 7) % 80}%`,
              animation: `starFloat ${2 + (i % 4) * 0.5}s ease-in-out infinite ${(i * 0.2) % 2}s`,
            }}
          />
        ))}

        {/* Rocket + thruster */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          {/* Thruster flame */}
          <div
            className="w-3 rounded-b-full mt-1 order-last"
            style={{
              height: 14,
              background: "linear-gradient(to bottom, #fbbf24, #ef4444, transparent)",
              animation: "thruster 0.4s ease-in-out infinite",
              transformOrigin: "top center",
            }}
          />
          {/* Rocket emoji */}
          <span
            className="text-5xl"
            style={{ animation: "rocketLaunch 1.4s cubic-bezier(.36,.07,.19,.97) forwards 0.1s", opacity: 0 }}
          >
            🚀
          </span>
        </div>

        {/* Orbiting planet */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0">
          <span
            className="absolute text-lg"
            style={{
              animation: "orbit 3s linear infinite",
              transformOrigin: "center center",
            }}
          >
            🌍
          </span>
        </div>

        {/* Bottom label */}
        <div className="absolute bottom-3 inset-x-0 text-center">
          <span className="text-indigo-300 text-xs font-medium tracking-widest uppercase opacity-80">
            Getting you started…
          </span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3"
           style={{ animation: "fadeSlide 0.4s ease forwards 0.3s", opacity: 0 }}>
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5"
               style={{ animation: `stepPop 0.4s cubic-bezier(.36,.07,.19,.97) both ${0.3 + i * 0.12}s`, opacity: 0 }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-sm"
                 style={{
                   background: i === 0 ? s.color : `${s.color}22`,
                   border: `2px solid ${s.color}50`,
                 }}>
              {s.icon}
            </div>
            <span className="text-xs font-medium text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"
           style={{ animation: "fadeSlide 0.4s ease forwards 0.5s", opacity: 0 }}>
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
             style={{ animation: "progressFill 1.5s ease-out forwards 0.6s", width: 0 }}/>
      </div>

      {/* Form skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5"
           style={{ animation: "fadeSlide 0.4s ease forwards 0.4s", opacity: 0 }}>
        <div className="shimmer-bar h-6 w-48"/>
        <div className="shimmer-bar h-4 w-72"/>
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="shimmer-bar h-3 w-24"/>
            <div className="shimmer-bar h-11 rounded-xl"/>
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <div className="shimmer-bar h-11 w-28 rounded-xl"/>
          <div className="shimmer-bar h-11 w-36 rounded-xl"/>
        </div>
      </div>
    </div>
  );
}
