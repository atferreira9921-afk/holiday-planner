"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="card p-10 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">🚨</div>
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>
        )}
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
