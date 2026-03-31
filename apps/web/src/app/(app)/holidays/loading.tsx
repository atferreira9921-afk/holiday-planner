export default function HolidaysLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Year + view controls */}
      <div className="flex items-center gap-3">
        <div className="h-9 bg-slate-200 rounded-xl w-24" />
        <div className="h-9 bg-slate-200 rounded-xl w-24" />
        <div className="h-9 bg-slate-200 rounded-xl w-32 ml-auto" />
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div className="h-7 bg-slate-200 rounded-xl w-32" />
        <div className="flex gap-2">
          <div className="h-8 bg-slate-200 rounded-xl w-8" />
          <div className="h-8 bg-slate-200 rounded-xl w-8" />
        </div>
      </div>

      {/* Calendar grid placeholder */}
      <div className="card p-4">
        <div className="grid grid-cols-7 gap-px">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded" style={{ opacity: 0.5 + (i % 5) * 0.1 }} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 rounded-full" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
