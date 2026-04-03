export default function PreferencesLoading() {
  return (
    <div className="space-y-6 select-none">
      <style>{`
        @keyframes gearSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes gearSpinReverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes cardReveal {
          0%   { opacity: 0; transform: translateX(-16px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes avatarAssemble {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: gear assembly */}
      <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center gap-6">
        {/* Gears */}
        <div className="relative flex items-center justify-center">
          {/* Big gear */}
          <span className="text-6xl opacity-30"
                style={{ animation: "gearSpin 4s linear infinite" }}>⚙️</span>
          {/* Small gear overlapping */}
          <span className="text-3xl opacity-40 absolute -bottom-2 -right-4"
                style={{ animation: "gearSpinReverse 2.7s linear infinite" }}>⚙️</span>
        </div>

        {/* User profile being assembled */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center"
               style={{ animation: "avatarAssemble 0.6s cubic-bezier(.36,.07,.19,.97) both 0.3s", opacity: 0 }}>
            <span className="text-3xl">👤</span>
          </div>
          {[0, 1].map(i => (
            <div key={i} className="shimmer-bar h-3 rounded-full"
                 style={{ width: i === 0 ? 80 : 56,
                          animation: `cardReveal 0.4s ease forwards ${0.6 + i * 0.15}s`, opacity: 0 }}/>
          ))}
        </div>

        {/* Floating config icons */}
        {[
          { icon: "🎯", top: "15%", right: "18%", delay: "0.2s" },
          { icon: "✈️", top: "55%", right: "10%", delay: "0.5s" },
          { icon: "🗺️", top: "20%", left: "10%",  delay: "0.8s" },
        ].map((item, i) => (
          <span key={i} className="absolute text-xl opacity-30"
                style={{ top: item.top, right: item.right, left: item.left,
                         animation: `pulse 2.5s ease-in-out infinite ${item.delay}` }}>
            {item.icon}
          </span>
        ))}

        <p className="absolute bottom-3 text-xs text-slate-400 font-medium tracking-widest uppercase">
          Loading your config…
        </p>
      </div>

      {/* Two-column skeleton */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Avatar card skeleton */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="shimmer-bar h-[420px] rounded-2xl"/>
        </div>

        {/* Form sections skeleton */}
        <div className="flex-1 space-y-4">
          {[
            { title: "🏠 Home base", rows: 3 },
            { title: "🎯 Travel style", rows: 2 },
            { title: "❤️ Interests", rows: 1 },
            { title: "👤 Personal details", rows: 3 },
          ].map((section, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4"
                 style={{ animation: `cardReveal 0.4s ease forwards ${0.1 + i * 0.1}s`, opacity: 0 }}>
              <div className="shimmer-bar h-5 w-40"/>
              {Array.from({ length: section.rows }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="shimmer-bar h-3 w-28"/>
                  <div className="shimmer-bar h-10 rounded-xl"/>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
