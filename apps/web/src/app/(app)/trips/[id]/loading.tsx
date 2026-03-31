export default function TripLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Back link + title */}
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="h-8 bg-slate-200 rounded-xl w-64" />
        <div className="h-4 bg-slate-100 rounded w-40" />
      </div>

      {/* Status control */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="h-6 bg-slate-200 rounded-full w-20" />
          <div className="h-9 bg-slate-200 rounded-xl w-32" />
          <div className="h-9 bg-slate-100 rounded-xl w-24" />
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-40" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="h-4 bg-slate-200 rounded w-28 flex-shrink-0" />
                <div className="h-4 bg-slate-100 rounded flex-1" />
              </div>
            ))}
          </div>

          <div className="card p-5 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-48" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="card p-5 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-32" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded" />
            ))}
          </div>
          <div className="card p-5 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-32" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
