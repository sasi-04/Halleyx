"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../api/client";

const DEMO_USERS = {
  EMPLOYEE: { email: "sssrse5e66755788@gmail.com", password: "Halleyx123!" },
  MANAGER: { email: "sasidharan071204@gmail.com", password: "Halleyx123!" },
  HR: { email: "mathansmathan27@gmail.com", password: "Halleyx123!" },
  CEO: { email: "sasidharan.n.s54@gmail.com", password: "Halleyx123!" },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  }, []);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      window.localStorage.setItem("hx-token", res.data.token);
      window.localStorage.setItem("hx-user", JSON.stringify(res.data.user));
      // eslint-disable-next-line no-console
      console.log("LOGGED USER:", res.data.user?.email);
      router.replace("/dashboard");
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error ?? e?.message ?? "Login failed";
      setError(status ? `${msg} (HTTP ${status})` : msg);
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
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2">
            <div className="text-[11px] font-semibold text-slate-300">Demo logins</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                Object.keys(DEMO_USERS) as Array<keyof typeof DEMO_USERS>
              ).map((role) => (
                <button
                  key={role}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setEmail(DEMO_USERS[role].email);
                    setPassword(DEMO_USERS[role].password);
                    setError(null);
                  }}
                  className="rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900 hover:border-slate-600 transition disabled:opacity-60"
                >
                  Use {role}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default password is <span className="font-mono text-slate-300">Halleyx123!</span>
            </div>
          </div>

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
            Use your Halleyx account credentials to sign in.
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

