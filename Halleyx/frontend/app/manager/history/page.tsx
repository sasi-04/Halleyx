"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { History, Check, XCircle, Wallet, UserPlus } from "lucide-react";

export default function ManagerHistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["manager-approval-history", page],
    queryFn: async () =>
      (await api.get("/manager/approval-history", { params: { page, pageSize: 15 } })).data,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 15)));

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <History className="h-5 w-5 text-amber-400/80" />
          Request History
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Track requests you have approved or rejected. Review your past decisions and comments.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <History className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No approval history yet.</p>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Step</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Decision</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Reviewed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-800/80 hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3 text-slate-200">{item.employee_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          {item.request_type === "expense" ? (
                            <Wallet className="h-4 w-4 text-amber-400/80" />
                          ) : (
                            <UserPlus className="h-4 w-4 text-violet-400/80" />
                          )}
                          {item.request_type ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.amount != null ? `$${item.amount}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.step_name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            item.decision === "approved"
                              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/50"
                              : "bg-rose-500/20 text-rose-200 border border-rose-500/50"
                          }`}
                        >
                          {item.decision === "approved" ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {item.decision}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate" title={item.comment}>
                        {item.comment ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(item.reviewed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/manager/review/${item.execution_id}`}
                          className="text-amber-400 hover:text-amber-300 text-xs"
                        >
                          View
                        </Link>
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
