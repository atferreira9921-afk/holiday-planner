export default function TripLoading() {
  return (
    <div className="p-6 space-y-6 select-none">
      <style>{`
        @keyframes scanLine {
          0%   { top: 6px; opacity: 0.9; }
          90%  { top: calc(100% - 6px); opacity: 0.6; }
          100% { top: calc(100% - 6px); opacity: 0; }
        }
        @keyframes boardingIn {
          0%   { opacity: 0; transform: translateY(16px) rotate(-1deg); }
          100% { opacity: 1; transform: translateY(0) rotate(0deg); }
        }
        @keyframes stampPop {
          0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0); }
          40%            { transform: scale(1); }
        }
        .shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e8edf5 50%, #f1f5f9 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Back + title skeleton */}
      <div className="space-y-2">
        <div className="shimmer-bar h-4 w-24"/>
        <div className="shimmer-bar h-8 w-64 rounded-xl"/>
        <div className="shimmer-bar h-4 w-40"/>
      </div>

      {/* Boarding pass loading card */}
      <div
        className="relative bg-white rounded-2xl border border-indigo-100 shadow-lg overflow-hidden"
        style={{ animation: "boardingIn 0.5s ease forwards" }}
      >
        {/* Top stripe */}
        <div className="h-2 bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400"/>

        <div className="p-6 flex items-stretch gap-0">
          {/* Left section */}
          <div className="flex-1 space-y-4 pr-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl" style={{ animation: "stampPop 0.5s cubic-bezier(.36,.07,.19,.97) both 0.3s", opacity: 0 }}>
                🛫
              </span>
              <div className="space-y-1.5">
                <div className="shimmer-bar h-3 w-24"/>
                <div className="shimmer-bar h-6 w-40 rounded-xl"/>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl" style={{ animation: "stampPop 0.5s cubic-bezier(.36,.07,.19,.97) both 0.5s", opacity: 0 }}>
                🛬
              </span>
              <div className="space-y-1.5">
                <div className="shimmer-bar h-3 w-20"/>
                <div className="shimmer-bar h-6 w-36 rounded-xl"/>
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              {[0,1,2].map(i => (
                <div key={i} className="space-y-1">
                  <div className="shimmer-bar h-3 w-16"/>
                  <div className="shimmer-bar h-5 w-20"/>
                </div>
              ))}
            </div>
          </div>

          {/* Dashed separator */}
          <div className="flex flex-col items-center justify-center px-2 gap-1 text-slate-200">
            <div className="w-px h-full border-l-2 border-dashed border-slate-200"/>
          </div>

          {/* Right stub */}
          <div className="w-36 pl-6 space-y-4 flex flex-col justify-center">
            <div className="text-center space-y-2">
              <div className="shimmer-bar h-3 w-16 mx-auto"/>
              <div className="text-4xl opacity-20">🎫</div>
            </div>
            <div className="shimmer-bar h-10 w-full rounded-xl"/>
            <div className="shimmer-bar h-3 w-20 mx-auto"/>
          </div>
        </div>

        {/* Moving scan line */}
        <div
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent pointer-events-none"
          style={{ animation: "scanLine 2s ease-in-out infinite" }}
        />
      </div>

      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {[0,1].map(card => (
            <div key={card} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="shimmer-bar h-5 w-44"/>
              {[0,1,2,3].map(i => (
                <div key={i} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="shimmer-bar h-4 w-28 flex-shrink-0"/>
                  <div className="shimmer-bar h-4 flex-1"/>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-5">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="shimmer-bar h-5 w-32"/>
              <div className="shimmer-bar h-20 rounded-xl"/>
            </div>
          ))}
        </div>
      </div>

      {/* Loading dots */}
      <div className="flex justify-center gap-2 pt-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-indigo-300"
               style={{ animation: `dotBounce 1.3s ease-in-out infinite ${i * 0.2}s` }}/>
        ))}
      </div>
    </div>
  );
}
