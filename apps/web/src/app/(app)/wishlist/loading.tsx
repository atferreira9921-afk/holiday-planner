export default function WishlistLoading() {
  const destinations = [
    { emoji: "🏝️", label: "Maldives",  color: "#14b8a6", delay: "0s",    x: "20%", y: "30%" },
    { emoji: "🗼", label: "Paris",     color: "#f43f5e", delay: "0.25s", x: "55%", y: "20%" },
    { emoji: "🌋", label: "Iceland",   color: "#6366f1", delay: "0.5s",  x: "78%", y: "45%" },
    { emoji: "🏯", label: "Kyoto",     color: "#f59e0b", delay: "0.75s", x: "35%", y: "60%" },
    { emoji: "🌴", label: "Bali",      color: "#10b981", delay: "1s",    x: "65%", y: "65%" },
  ];

  return (
    <div className="space-y-6 select-none">
      <style>{`
        @keyframes starPop {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          55%  { transform: scale(1.2) rotate(5deg);  opacity: 1; }
          100% { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-9px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes slideUp {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: starry map with destination pins */}
      <div className="relative h-52 rounded-2xl overflow-hidden border border-amber-100"
           style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}>

        {/* Twinkling stars */}
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
              left: `${(i * 37 + 5) % 98}%`,
              top:  `${(i * 53 + 8) % 75}%`,
              animation: `twinkle ${1.5 + (i % 4) * 0.4}s ease-in-out infinite ${(i * 0.17) % 2}s`,
            }}
          />
        ))}

        {/* Destination pins */}
        {destinations.map((d, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center gap-1"
            style={{
              left: d.x, top: d.y, transform: "translate(-50%, -50%)",
              animation: `starPop 0.5s cubic-bezier(.36,.07,.19,.97) both ${d.delay}, float 3.5s ease-in-out infinite ${parseFloat(d.delay) + 0.8}s`,
              opacity: 0,
            }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shadow-lg"
                 style={{ background: `${d.color}30`, border: `1.5px solid ${d.color}60` }}>
              {d.emoji}
            </div>
            <span className="text-white text-xs font-semibold opacity-80 whitespace-nowrap"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              {d.label}
            </span>
          </div>
        ))}

        {/* Bottom label */}
        <div className="absolute bottom-3 inset-x-0 text-center">
          <span className="text-amber-300 text-xs font-medium tracking-widest uppercase opacity-70">
            ⭐ Loading your dream list…
          </span>
        </div>
      </div>

      {/* Wishlist cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3"
               style={{ animation: `slideUp 0.35s ease forwards ${0.05 + i * 0.07}s`, opacity: 0 }}>
            <div className="h-28 rounded-xl overflow-hidden relative bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="shimmer-bar absolute inset-0 rounded-xl"/>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl opacity-15">🌍</span>
              </div>
            </div>
            <div className="shimmer-bar h-5 w-3/4"/>
            <div className="shimmer-bar h-3 w-1/2"/>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(j => (
                <div key={j} className="shimmer-bar h-5 w-5 rounded-full"/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
