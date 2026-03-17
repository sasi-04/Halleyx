"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { Users, Wallet, UserPlus, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-200 border-slate-500/50",
  in_progress: "bg-amber-500/20 text-amber-200 border-amber-500/50",
  completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
  rejected: "bg-rose-500/20 text-rose-200 border-rose-500/50",
};

export default function ManagerTeamRequestsPage() {
  const [page, setPage] = useState(1);
  const [requestType, setRequestType] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["manager-team-requests", page, requestType, status],
    queryFn: async () =>
      (
        await api.get("/manager/team-requests", {
          params: { page, pageSize: 15, requestType: requestType || undefined, status: status || undefined },
        })
      ).data,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 15)));

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-400/80" />
          Team Requests
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Monitor requests submitted by your team. Filter by type and status.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select
          className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          value={requestType}
          onChange={(e) => {
            setRequestType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="onboarding">Onboarding</option>
        </select>
        <select
          className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No team requests found.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Current Step</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Submitted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r: any) => (
                    <tr key={r.id} className="border-b border-slate-800/80 hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3 text-slate-200">{r.requester?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          {r.request_type === "expense" ? (
                            <Wallet className="h-4 w-4 text-amber-400/80" />
                          ) : (
                            <UserPlus className="h-4 w-4 text-violet-400/80" />
                          )}
                          {r.request_type}
                        </span>
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
                      <td className="px-4 py-3 text-slate-400">{r.currentStepName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.execution_id ? (
                          <Link
                            href={`/manager/review/${r.execution_id}`}
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs"
                          >
                            Review <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : r.id ? (
                          <Link
                            href={`/requests/${r.id}`}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center text-sm text-slate-400">
            <span>
              Page {data?.page ?? 1} of {totalPages}
            </span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800/60 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800/60 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
