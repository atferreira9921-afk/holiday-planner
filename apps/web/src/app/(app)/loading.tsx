export default function AppLoading() {
  return (
    <div className="min-h-[72vh] flex flex-col items-center justify-center gap-5 select-none">
      <style>{`
        @keyframes planeSweep {
          0%   { transform: translate(-90px, 24px) rotate(-8deg); opacity: 0; }
          18%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { transform: translate(90px, -20px) rotate(-8deg); opacity: 0; }
        }
        @keyframes trailFade {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          50%       { opacity: 0.55; transform: scale(1); }
        }
        @keyframes textPop {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0); }
          40%           { transform: scale(1); }
        }
      `}</style>

      <div className="relative h-16 w-64 flex items-center justify-center">
        {[-64, -48, -32, -16, 0, 16, 32, 48].map((x, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-indigo-300"
            style={{ left: `calc(50% + ${x}px)`, top: "50%", marginTop: -4,
                     animation: `trailFade 2.2s ease-in-out infinite ${i * 0.13}s` }}
          />
        ))}
        <span className="text-4xl absolute"
              style={{ animation: "planeSweep 2.6s ease-in-out infinite" }}>✈️</span>
      </div>

      <p className="text-slate-400 text-sm font-medium tracking-widest uppercase"
         style={{ animation: "textPop 0.6s ease forwards" }}>
        Getting ready…
      </p>

      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
               style={{ animation: `dotBounce 1.3s ease-in-out infinite ${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}
