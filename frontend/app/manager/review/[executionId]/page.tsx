"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../../components/layout/Shell";
import { api } from "../../../../api/client";
import {
  ArrowLeft,
  Check,
  XCircle,
  Circle,
  Wallet,
  UserPlus,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function ManagerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const executionId = params.executionId as string;

  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["manager-review", executionId],
    queryFn: async () => (await api.get(`/manager/review/${executionId}`)).data,
    enabled: !!executionId,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ decision, comment }: { decision: "approve" | "reject"; comment?: string }) => {
      const res = await api.post(`/executions/${executionId}/approve`, { decision, comment });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-review", executionId] });
      queryClient.invalidateQueries({ queryKey: ["manager-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["manager-stats"] });
      router.push("/manager/approvals");
    },
  });

  const handleApprove = () => {
    setDecision("approve");
    approveMutation.mutate({ decision: "approve", comment: comment || undefined });
  };

  const handleReject = () => {
    setDecision("reject");
    approveMutation.mutate({ decision: "reject", comment: comment || undefined });
  };

  if (isLoading)
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      </Shell>
    );

  if (!data)
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <p className="text-slate-400">Request not found.</p>
          <Link href="/manager/approvals" className="text-blue-400 hover:underline mt-2 inline-block">
            Back to Pending Approvals
          </Link>
        </div>
      </Shell>
    );

  const { execution, request, employee, requestData } = data;
  const isExpense = request?.request_type === "expense" || /expense/i.test(execution?.workflow?.name ?? "");
  const logs = execution?.executionLogs ?? [];
  const steps = execution?.workflow?.steps ?? [];
  const stepOrder = new Map(steps.map((s: any) => [s.name, s.order]));
  const sortedLogs = [...logs].sort(
    (a: any, b: any) =>
      (stepOrder.get(a.step_name) ?? 99) - (stepOrder.get(b.step_name) ?? 99) ||
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  const workflowEnded = ["completed", "failed", "canceled"].includes(execution?.status);

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/manager/approvals"
            className="rounded-lg border border-slate-700/80 p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Request Review</h2>
            <p className="text-[11px] text-slate-400 font-mono">{executionId?.slice(0, 8)}…</p>
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
              <FileText className="h-4 w-4 text-slate-500" />
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
                <dd className="text-slate-100">{employee?.department ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              {isExpense ? <Wallet className="h-4 w-4 text-amber-400/80" /> : <UserPlus className="h-4 w-4 text-violet-400/80" />}
              Request Details
            </h3>
            <dl className="space-y-3 text-sm">
              {isExpense && (
                <>
                  <div>
                    <dt className="text-slate-500 text-xs">Amount</dt>
                    <dd className="text-slate-100">${requestData?.amount ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Country</dt>
                    <dd className="text-slate-100">{requestData?.country ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Department</dt>
                    <dd className="text-slate-100">{requestData?.department ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Priority</dt>
                    <dd className="text-slate-100">{requestData?.priority ?? "—"}</dd>
                  </div>
                  {requestData?.description && (
                    <div>
                      <dt className="text-slate-500 text-xs">Description</dt>
                      <dd className="text-slate-100">{requestData.description}</dd>
                    </div>
                  )}
                  {requestData?.receipt_url && (
                    <div>
                      <dt className="text-slate-500 text-xs">Receipt</dt>
                      <dd>
                        <a
                          href={requestData.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-xs inline-flex items-center gap-1"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                </>
              )}
              {!isExpense && (
                <>
                  <div>
                    <dt className="text-slate-500 text-xs">Employee Name</dt>
                    <dd className="text-slate-100">{requestData?.employee_name ?? requestData?.employeeName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Department</dt>
                    <dd className="text-slate-100">{requestData?.department ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Role</dt>
                    <dd className="text-slate-100">{requestData?.role ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Start Date</dt>
                    <dd className="text-slate-100">{requestData?.start_date ?? requestData?.startDate ?? "—"}</dd>
                  </div>
                  {requestData?.manager && (
                    <div>
                      <dt className="text-slate-500 text-xs">Manager</dt>
                      <dd className="text-slate-100">{requestData.manager}</dd>
                    </div>
                  )}
                  {requestData?.notes && (
                    <div>
                      <dt className="text-slate-500 text-xs">Notes</dt>
                      <dd className="text-slate-100">{requestData.notes}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Workflow Progress</h3>
            <div className="space-y-0">
              {sortedLogs.map((log: any, i: number) => {
                const isLast = i === sortedLogs.length - 1;
                const isCompleted = log.status === "completed";
                const isPaused = log.status === "paused";
                const isFailed = log.status === "failed";
                const Icon = isCompleted ? Check : isFailed ? XCircle : isPaused ? Circle : Circle;
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-1 ${
                          isCompleted ? "bg-emerald-500/20 text-emerald-400" : isFailed ? "bg-rose-500/20 text-rose-400" : "bg-slate-700/60 text-slate-400"
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
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
              <h3 className="text-sm font-semibold text-amber-200 mb-4">Approval Actions</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Comment (optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. Expense approved because it is within department budget."
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[80px]"
                    disabled={approveMutation.isPending}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 transition"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={approveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/50 px-4 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/30 disabled:opacity-50 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Reject with &quot;Request more information&quot; as comment to ask the employee for additional details.
                </p>
              </div>
            </div>
          )}

          {request?.id && (
            <Link
              href={`/requests/${request.id}`}
              className="block rounded-xl border border-slate-700/80 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition text-center"
            >
              View in Request Details
            </Link>
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
