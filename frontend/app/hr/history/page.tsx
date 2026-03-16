"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { History, UserPlus, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
  rejected: "bg-rose-500/20 text-rose-200 border-rose-500/50",
  in_progress: "bg-amber-500/20 text-amber-200 border-amber-500/50",
  pending: "bg-slate-500/20 text-slate-200 border-slate-500/50",
};

export default function HrHistoryPage() {
  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hr-history", page, department, status],
    queryFn: async () =>
      (
        await api.get("/hr/history", {
          params: {
            page,
            pageSize: 15,
            department: department || undefined,
            status: status || undefined,
          },
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
          <History className="h-5 w-5 text-violet-400/80" />
          Onboarding History
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completed and rejected onboarding workflows.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          placeholder="Filter by department…"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No onboarding history yet.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Start Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r: any) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-800/80 hover:bg-slate-900/50 transition"
                    >
                      <td className="px-4 py-3 text-slate-200">
                        {r.employee_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {r.department ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.role ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {r.start_date ? new Date(r.start_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            statusColors[r.status] ?? statusColors.in_progress
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.execution_id ? (
                          <Link
                            href={`/hr/review/${r.execution_id}`}
                            className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 text-xs"
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

