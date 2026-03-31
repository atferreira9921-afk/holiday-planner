export default function AppLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-xl w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-28 bg-slate-200 rounded-xl" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
