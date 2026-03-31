export default function TripsLoading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 bg-slate-200 rounded-xl w-32" />
        <div className="h-9 bg-slate-200 rounded-xl w-28" />
      </div>

      {/* Search + filter row */}
      <div className="flex gap-3">
        <div className="h-10 bg-slate-200 rounded-xl flex-1" />
        <div className="h-10 bg-slate-200 rounded-xl w-36" />
      </div>

      {/* Status pills */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-6 bg-slate-200 rounded-full w-20" />
        ))}
      </div>

      {/* Trips grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-28 bg-slate-200 rounded-xl" />
            <div className="h-5 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded-full w-20" />
            <div className="space-y-1.5">
              <div className="h-3 bg-slate-100 rounded w-40" />
              <div className="h-3 bg-slate-100 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
