"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import {
  UserPlus,
  FileCheck2,
  ChevronRight,
  Check,
  XCircle,
  ExternalLink,
} from "lucide-react";

export default function HrRequestsPage() {
  const queryClient = useQueryClient();
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hr-onboarding-queue"],
    queryFn: async () => (await api.get("/hr/onboarding-queue")).data,
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      executionId,
      decision,
      comment,
    }: {
      executionId: string;
      decision: "approve" | "reject";
      comment?: string;
    }) => {
      const res = await api.post(`/executions/${executionId}/approve`, { decision, comment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-onboarding-queue"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-notifications"] });
    },
    onSettled: () => setActionBusy(null),
  });

  const items = data?.items ?? [];

  const askComment = (defaultText = "") => {
    const text = window.prompt("Add a comment (optional)", defaultText);
    return text ?? "";
  };

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-violet-400/80" />
          Onboarding Requests
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Review onboarding requests waiting for HR document verification and approval.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading onboarding queue…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <FileCheck2 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No onboarding requests waiting for HR.</p>
          <p className="text-slate-500 text-xs mt-1">
            New onboarding requests will appear here when HR action is required.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Request ID
                  </th>
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
                    Submitted By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Current Step
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((r: any) => {
                  const busy = actionBusy === r.execution_id || approveMutation.isPending;
                  const hasDocs =
                    !!r.identity_proof_url ||
                    !!r.education_certificates_url ||
                    !!r.offer_letter_url;
                  return (
                    <tr
                      key={r.execution_id}
                      className="border-b border-slate-800/80 hover:bg-slate-900/50 transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {r.request_id?.slice(0, 8)}…
                      </td>
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
                      <td className="px-4 py-3 text-slate-300">{r.submitted_by}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-200 border border-amber-500/40">
                          pending
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.current_step}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/hr/review/${r.execution_id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/20 transition"
                          >
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          {hasDocs && (
                            <a
                              href={
                                r.identity_proof_url ||
                                r.offer_letter_url ||
                                r.education_certificates_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60 transition"
                            >
                              Docs <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => {
                              setActionBusy(r.execution_id);
                              const comment = askComment("Verified documents. Approved.");
                              approveMutation.mutate({
                                executionId: r.execution_id,
                                decision: "approve",
                                comment: comment || undefined,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => {
                              setActionBusy(r.execution_id);
                              const comment = askComment(
                                "Education certificate is missing. Please upload before approval.",
                              );
                              approveMutation.mutate({
                                executionId: r.execution_id,
                                decision: "reject",
                                comment: comment || undefined,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50 transition"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

