"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../../components/layout/Shell";
import { api } from "../../../../api/client";
import {
  ArrowLeft,
  FileCheck2,
  ExternalLink,
  Check,
  XCircle,
  Circle,
  Clock,
  User,
} from "lucide-react";

export default function HrReviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const executionId = params.executionId as string;

  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hr-review", executionId],
    queryFn: async () => (await api.get(`/hr/review/${executionId}`)).data,
    enabled: !!executionId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      decision,
      comment,
    }: {
      decision: "approve" | "reject";
      comment?: string;
    }) => {
      const res = await api.post(`/executions/${executionId}/approve`, { decision, comment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-review", executionId] });
      queryClient.invalidateQueries({ queryKey: ["hr-onboarding-queue"] });
      queryClient.invalidateQueries({ queryKey: ["hr-stats"] });
      queryClient.invalidateQueries({ queryKey: ["hr-history"] });
      router.push("/hr/requests");
    },
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <p className="text-slate-400">Onboarding request not found.</p>
          <Link href="/hr/requests" className="text-blue-400 hover:underline mt-2 inline-block">
            Back to Onboarding Requests
          </Link>
        </div>
      </Shell>
    );
  }

  const { execution, request, employee, onboarding } = data;
  const logs = execution?.executionLogs ?? [];
  const steps = execution?.workflow?.steps ?? [];
  const stepOrder = new Map(steps.map((s: any) => [s.name, s.order]));
  const sortedLogs = [...logs].sort(
    (a: any, b: any) =>
      (stepOrder.get(a.step_name) ?? 99) - (stepOrder.get(b.step_name) ?? 99) ||
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const workflowEnded = ["completed", "failed", "canceled"].includes(execution?.status);

  const docLinks: { label: string; url?: string | null }[] = [
    { label: "Identity proof", url: onboarding?.identity_proof_url },
    { label: "Education certificates", url: onboarding?.education_certificates_url },
    { label: "Offer letter", url: onboarding?.offer_letter_url },
  ];

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/hr/requests"
            className="rounded-lg border border-slate-700/80 p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-violet-400/80" />
              HR Review · Onboarding
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">{request?.id ?? executionId}</p>
          </div>
        </div>
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
            execution?.status === "completed"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/50"
              : execution?.status === "failed" || execution?.status === "canceled"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/50"
              : "bg-amber-500/20 text-amber-200 border border-amber-500/50"
          }`}
        >
          {execution?.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              Employee Information
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Name</dt>
                <dd className="text-slate-100">{employee?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Email</dt>
                <dd className="text-slate-100">{employee?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Department</dt>
                <dd className="text-slate-100">{employee?.department ?? onboarding?.department ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">
              Onboarding Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Employee Name</dt>
                <dd className="text-slate-100">{onboarding?.employee_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Role</dt>
                <dd className="text-slate-100">{onboarding?.role ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Start Date</dt>
                <dd className="text-slate-100">{onboarding?.start_date ?? "—"}</dd>
              </div>
              {onboarding?.notes && (
                <div>
                  <dt className="text-slate-500 text-xs">Notes</dt>
                  <dd className="text-slate-100">{onboarding.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">
              Documents
            </h3>
            <div className="space-y-2">
              {docLinks.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">{d.label}</span>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:underline text-xs"
                    >
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Not provided</span>
                  )}
                </div>
              ))}
              {onboarding?.other_attachments && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2">
                  <div className="text-xs text-slate-500 mb-1">Other attachments</div>
                  <pre className="text-[10px] text-slate-200 overflow-auto">
                    {JSON.stringify(onboarding.other_attachments, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">
              Workflow Progress
            </h3>
            <div className="space-y-0">
              {sortedLogs.map((log: any, i: number) => {
                const isLast = i === sortedLogs.length - 1;
                const isCompleted = log.status === "completed";
                const isPaused = log.status === "paused";
                const isFailed = log.status === "failed";
                const Icon = isCompleted ? Check : isFailed ? XCircle : isPaused ? Clock : Circle;
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-1 ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isFailed
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-slate-700/60 text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 min-h-[24px] bg-slate-700/60" />}
                    </div>
                    <div className="pb-6 flex-1">
                      <div className="text-sm font-medium text-slate-200">{log.step_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {log.status}
                        {log.ended_at && ` · ${new Date(log.ended_at).toLocaleString()}`}
                      </div>
                      {log.error_message && (
                        <div className="text-[10px] text-rose-300">{log.error_message}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sortedLogs.length === 0 && (
                <p className="text-slate-500 text-sm">No steps recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!workflowEnded && (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-5">
              <h3 className="text-sm font-semibold text-violet-200 mb-4">HR Actions</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Comment (optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. Education certificate is missing. Please upload before approval."
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-h-[90px]"
                    disabled={approveMutation.isPending}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      approveMutation.mutate({
                        decision: "approve",
                        comment: comment || undefined,
                      })
                    }
                    disabled={approveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 transition"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      approveMutation.mutate({
                        decision: "reject",
                        comment: comment || undefined,
                      })
                    }
                    disabled={approveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/50 px-4 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/30 disabled:opacity-50 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Use Reject with a comment like “Request additional documents…” to ask the employee for more info.
                </p>
              </div>
            </div>
          )}

          <Link
            href={`/executions/${executionId}`}
            className="block rounded-xl border border-slate-700/80 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition text-center"
          >
            Full Execution Logs
          </Link>
        </div>
      </div>
    </Shell>
  );
}

