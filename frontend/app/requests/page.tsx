"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../components/layout/Shell";
import { api } from "../../api/client";
import { Wallet, UserPlus, ChevronRight, FileText } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-200 border-slate-500/50",
  in_progress: "bg-amber-500/20 text-amber-200 border-amber-500/50",
  approved: "bg-blue-500/20 text-blue-200 border-blue-500/50",
  completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
  rejected: "bg-rose-500/20 text-rose-200 border-rose-500/50",
};

export default function MyRequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => (await api.get("/requests", { params: { page: 1, pageSize: 50 } })).data,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50">My Requests</h2>
        <p className="text-[11px] text-slate-400">
          Track your expense and onboarding requests. Click a row to view details.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading requests…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 mb-4">No requests yet.</p>
          <Link
            href="/requests/create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/50 px-4 py-2 text-sm text-blue-200 hover:bg-blue-500/30 transition"
          >
            Create your first request
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Request ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Current Step</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-800/80 hover:bg-slate-900/50 transition"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      <Link href={`/requests/${r.id}`} className="hover:text-blue-300 underline">
                        {r.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {r.request_type === "expense" ? (
                          <Wallet className="h-4 w-4 text-amber-400/80" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-violet-400/80" />
                        )}
                        {r.request_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {r.currentStepName ?? r.current_step_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          statusColors[r.derivedStatus ?? r.status] ?? statusColors.pending
                        }`}
                      >
                        {r.derivedStatus ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/requests/${r.id}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
