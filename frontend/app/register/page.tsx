"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../api/client";

const roles = [
  { label: "Employee", value: "EMPLOYEE" },
  { label: "Manager", value: "MANAGER" },
  { label: "HR", value: "HR" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register", { name, email, password, role });
      router.replace("/login");
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30">
            HX
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="text-xs text-slate-400">
              Sign up to start creating and managing workflows.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Full name
            </label>
            <input
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent"
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
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Role
            </label>
            <select
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            onClick={submit}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 px-4 py-2 text-sm font-semibold shadow-md shadow-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/50 transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-2 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

