"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        {error.message || "An unexpected error occurred. Your data is safe — this page just failed to load."}
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono">Ref: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
        <Link href="/dashboard" className="btn-ghost text-sm">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
