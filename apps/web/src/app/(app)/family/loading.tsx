export default function FamilyLoading() {
  const people = [
    { emoji: "👩", color: "#f43f5e", delay: "0s",   x: "18%" },
    { emoji: "👨", color: "#6366f1", delay: "0.2s",  x: "34%" },
    { emoji: "👧", color: "#f59e0b", delay: "0.4s",  x: "50%" },
    { emoji: "👦", color: "#14b8a6", delay: "0.6s",  x: "66%" },
    { emoji: "👴", color: "#8b5cf6", delay: "0.8s",  x: "82%" },
  ];

  return (
    <div className="space-y-6 select-none">
      <style>{`
        @keyframes avatarPop {
          0%   { transform: translateY(30px) scale(0.4); opacity: 0; }
          55%  { transform: translateY(-6px) scale(1.12); opacity: 1; }
          75%  { transform: translateY(3px) scale(0.96); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes connectLine {
          0%   { stroke-dashoffset: 200; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 0.35; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          25%       { transform: scale(1.3); }
          50%       { transform: scale(1); }
          75%       { transform: scale(1.15); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: floating family avatars connected by lines */}
      <div className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-50 via-violet-50 to-indigo-50 border border-rose-100 flex items-end justify-center pb-6">
        {/* Connection lines SVG */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {people.slice(0, -1).map((p, i) => (
            <line
              key={i}
              x1={p.x} y1="55%" x2={people[i + 1].x} y2="55%"
              stroke="#a5b4fc" strokeWidth="2" strokeDasharray="200" strokeDashoffset="200"
              style={{ animation: `connectLine 0.6s ease forwards ${0.9 + i * 0.15}s` }}
            />
          ))}
        </svg>

        {/* Avatar bubbles */}
        {people.map((p, i) => (
          <div
            key={i}
            className="absolute bottom-8 flex flex-col items-center gap-1"
            style={{ left: p.x, transform: "translateX(-50%)",
                     animation: `avatarPop 0.5s cubic-bezier(.36,.07,.19,.97) both ${p.delay}, float 3s ease-in-out infinite ${parseFloat(p.delay) + 1}s` }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg"
                 style={{ background: `${p.color}22`, border: `2px solid ${p.color}40` }}>
              {p.emoji}
            </div>
          </div>
        ))}

        {/* Heart */}
        <div className="absolute top-4 right-6 text-2xl"
             style={{ animation: "heartBeat 1.5s ease-in-out infinite" }}>❤️</div>
        <p className="absolute bottom-2 text-xs text-slate-400 font-medium tracking-widest uppercase">
          Loading your crew…
        </p>
      </div>

      {/* Member list skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4"
               style={{ animation: `avatarPop 0.4s ease forwards ${0.3 + i * 0.1}s`, opacity: 0 }}>
            <div className="shimmer-bar w-10 h-10 rounded-full flex-shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="shimmer-bar h-4 w-32"/>
              <div className="shimmer-bar h-3 w-56"/>
            </div>
            <div className="flex gap-2">
              <div className="shimmer-bar h-7 w-14 rounded-lg"/>
              <div className="shimmer-bar h-7 w-18 rounded-lg"/>
            </div>
          </div>
        ))}
      </div>

      {/* Form skeleton */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="shimmer-bar h-96 rounded-2xl"/>
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="shimmer-bar h-6 w-36"/>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="shimmer-bar h-3 w-24"/>
              <div className="shimmer-bar h-10 rounded-xl"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
