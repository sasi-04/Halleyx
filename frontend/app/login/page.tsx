"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../api/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@halleyx.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      window.localStorage.setItem("hx-token", res.data.token);
      window.localStorage.setItem("hx-user", JSON.stringify(res.data.user));
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-950 shadow-lg shadow-blue-500/30">
            HX
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs text-slate-400">
              Sign in to manage workflows and approvals.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            onClick={submit}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 px-4 py-2 text-sm font-semibold shadow-md shadow-blue-500/40 hover:shadow-lg hover:shadow-blue-500/50 transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-[11px] text-slate-500">
            After seeding, default admin is{" "}
            <span className="font-mono text-slate-300">admin@halleyx.local</span>{" "}
            / <span className="font-mono text-slate-300">admin123</span>.
          </p>
          <p className="text-[11px] text-slate-500 text-center">
            New here?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-blue-400 hover:text-cyan-300 font-medium underline-offset-2 hover:underline"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

