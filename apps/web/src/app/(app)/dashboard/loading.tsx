export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-8 bg-slate-200 rounded w-12" />
          </div>
        ))}
      </div>

      {/* Upcoming bookings */}
      <div className="card p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-40" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-slate-200 rounded w-48" />
              <div className="h-3 bg-slate-100 rounded w-32" />
            </div>
            <div className="h-5 bg-slate-100 rounded-full w-16" />
          </div>
        ))}
      </div>

      {/* Trips grid placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-24 bg-slate-200 rounded-xl" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
