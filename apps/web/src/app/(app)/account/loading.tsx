export default function AccountLoading() {
  return (
    <div className="max-w-xl mx-auto space-y-6 select-none">
      <style>{`
        @keyframes keyTurn {
          0%   { transform: rotate(-30deg) scale(0.6); opacity: 0; }
          50%  { transform: rotate(15deg) scale(1.1); opacity: 1; }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes unlockBounce {
          0%   { transform: translateY(0); }
          30%  { transform: translateY(-12px); }
          50%  { transform: translateY(0); }
          70%  { transform: translateY(-5px); }
          100% { transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1);   opacity: 0.5; }
          50%       { transform: scale(1.4); opacity: 0.1; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes fadeSlide {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Hero: key/lock unlock */}
      <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center gap-6 border border-slate-700">
        {/* Pulsing rings */}
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute w-24 h-24 rounded-full border-2 border-indigo-400"
               style={{ animation: `ringPulse 2s ease-out infinite ${i * 0.55}s` }}/>
        ))}

        {/* Lock → key icon */}
        <div className="flex flex-col items-center gap-3 z-10">
          <span className="text-5xl" style={{ animation: "unlockBounce 1.2s ease-in-out infinite 0.4s" }}>
            🔓
          </span>
          <span className="text-3xl" style={{ animation: "keyTurn 0.6s cubic-bezier(.36,.07,.19,.97) both 0.2s", opacity: 0 }}>
            🔑
          </span>
        </div>

        <p className="absolute bottom-3 text-xs text-slate-400 font-medium tracking-widest uppercase">
          Loading your account…
        </p>
      </div>

      {/* Profile section skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5"
           style={{ animation: "fadeSlide 0.4s ease forwards 0.3s", opacity: 0 }}>
        <div className="flex items-center gap-4">
          <div className="shimmer-bar w-16 h-16 rounded-full flex-shrink-0"/>
          <div className="space-y-2 flex-1">
            <div className="shimmer-bar h-5 w-40"/>
            <div className="shimmer-bar h-3 w-56"/>
          </div>
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="shimmer-bar h-3 w-24"/>
            <div className="shimmer-bar h-10 rounded-xl"/>
          </div>
        ))}
        <div className="shimmer-bar h-10 w-32 rounded-xl"/>
      </div>

      {/* Danger zone skeleton */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 space-y-4"
           style={{ animation: "fadeSlide 0.4s ease forwards 0.5s", opacity: 0 }}>
        <div className="shimmer-bar h-5 w-32"/>
        <div className="shimmer-bar h-4 w-80"/>
        <div className="shimmer-bar h-10 w-36 rounded-xl"/>
      </div>
    </div>
  );
}
