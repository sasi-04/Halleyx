"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-8 text-center">
        <div className="text-5xl font-bold tracking-tight">404</div>
        <p className="mt-2 text-sm text-slate-400">This page doesn’t exist.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 px-4 py-2 text-sm font-semibold shadow-md shadow-blue-500/40 hover:shadow-lg hover:shadow-blue-500/50 transition"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

