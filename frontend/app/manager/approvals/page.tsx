"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { ClipboardCheck, Wallet, UserPlus, ChevronRight } from "lucide-react";

export default function ManagerApprovalsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["manager-pending-approvals"],
    queryFn: async () => (await api.get("/manager/pending-approvals")).data,
  });

  const items = data?.items ?? [];

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-400/80" />
          Pending Approvals
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Review and approve or reject requests waiting for your decision.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading approvals…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No pending approvals.</p>
          <p className="text-slate-500 text-xs mt-1">
            New requests will appear here when they need your approval.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Request ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Current Step</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.execution_id} className="border-b border-slate-800/80 hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {item.request_id?.slice(0, 8) ?? item.execution_id?.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-slate-200">{item.employee_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        {item.request_type === "expense" ? (
                          <Wallet className="h-4 w-4 text-amber-400/80" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-violet-400/80" />
                        )}
                        {item.request_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {item.amount != null ? `$${item.amount}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(item.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/40">
                        {item.priority ?? "Medium"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{item.step_name}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/manager/review/${item.execution_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 transition"
                      >
                        Review <ChevronRight className="h-3.5 w-3.5" />
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
