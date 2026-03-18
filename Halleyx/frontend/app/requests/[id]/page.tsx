"use client";

import React, { useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import {
  Wallet,
  UserPlus,
  ArrowLeft,
  Check,
  Circle,
  Clock,
  XCircle,
  ChevronDown,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "text-slate-400",
  in_progress: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-rose-400",
  paused: "text-amber-400",
};

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // Mandatory debug log
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("OPENING REQUEST:", id);
  }, [id]);

  const { data: request, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => (await api.get(`/requests/${id}`)).data,
    enabled: !!id,
  });

  if (isLoading)
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      </Shell>
    );

  if (!id) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <p className="text-slate-400">Invalid request id.</p>
          <Link href="/requests" className="text-blue-400 hover:underline mt-2 inline-block">
            Back to My Requests
          </Link>
        </div>
      </Shell>
    );
  }

  if (!request)
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <p className="text-slate-400">Request not found.</p>
          <Link href="/requests" className="text-blue-400 hover:underline mt-2 inline-block">
            Back to My Requests
          </Link>
        </div>
      </Shell>
    );

  const execution = request.execution;
  const logs = execution?.executionLogs ?? [];
  const workflowSteps = execution?.workflow?.steps ?? [];
  const stepOrderByName = new Map(workflowSteps.map((s: any) => [s.name, s.order]));
  const sortedLogs = [...logs].sort(
    (a: any, b: any) =>
      Number(stepOrderByName.get(a.step_name) ?? 99) - Number(stepOrderByName.get(b.step_name) ?? 99) ||
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const reqData = request.request_data ?? {};
  const isExpense = request.request_type === "expense";
  const title =
    reqData.title ??
    reqData.request_title ??
    (isExpense ? "Expense Request" : "Onboarding Request");
  const description =
    reqData.description ??
    reqData.notes ??
    "";
  const currentLevel =
    reqData.next_approver_role ??
    request.execution?.data?.next_approver_role ??
    null;

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="rounded-lg border border-slate-700/80 p-2 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
              {isExpense ? <Wallet className="h-5 w-5 text-amber-400/80" /> : <UserPlus className="h-5 w-5 text-violet-400/80" />}
              {title}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">{request.id}</p>
          </div>
        </div>
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
            request.derivedStatus === "completed"
              ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/50"
              : request.derivedStatus === "rejected"
              ? "bg-rose-500/20 text-rose-200 border-rose-500/50"
              : "bg-amber-500/20 text-amber-200 border-amber-500/50"
          }`}
        >
          {request.derivedStatus ?? request.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Request Information</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500 text-xs">Title</dt>
              <dd className="text-slate-100">{title}</dd>
            </div>
            {description ? (
              <div>
                <dt className="text-slate-500 text-xs">Description</dt>
                <dd className="text-slate-100">{description}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-slate-500 text-xs">Current Level</dt>
              <dd className="text-slate-100">{currentLevel ?? "—"}</dd>
            </div>
            {isExpense && (
              <>
                <div>
                  <dt className="text-slate-500 text-xs">Amount</dt>
                  <dd className="text-slate-100">${reqData.amount}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Country</dt>
                  <dd className="text-slate-100">{reqData.country}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Department</dt>
                  <dd className="text-slate-100">{reqData.department}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Priority</dt>
                  <dd className="text-slate-100">{reqData.priority}</dd>
                </div>
                {reqData.receipt_url && (
                  <div>
                    <dt className="text-slate-500 text-xs">Receipt</dt>
                    <dd>
                      <a href={reqData.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                        {reqData.receipt_url}
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
                  <dd className="text-slate-100">{reqData.employee_name ?? reqData.employeeName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Department</dt>
                  <dd className="text-slate-100">{reqData.department}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Role</dt>
                  <dd className="text-slate-100">{reqData.role}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-xs">Start Date</dt>
                  <dd className="text-slate-100">{reqData.start_date ?? reqData.startDate}</dd>
                </div>
                {reqData.manager && (
                  <div>
                    <dt className="text-slate-500 text-xs">Manager</dt>
                    <dd className="text-slate-100">{reqData.manager}</dd>
                  </div>
                )}
                {reqData.notes && (
                  <div>
                    <dt className="text-slate-500 text-xs">Notes</dt>
                    <dd className="text-slate-100">{reqData.notes}</dd>
                  </div>
                )}
              </>
            )}
            <div>
              <dt className="text-slate-500 text-xs">Submitted</dt>
              <dd className="text-slate-100">{new Date(request.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Workflow Progress</h3>
          <div className="space-y-0">
            {sortedLogs.length === 0 ? (
              <p className="text-slate-500 text-sm">No steps recorded yet.</p>
            ) : (
              sortedLogs.map((log: any, i: number) => {
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
                          isCompleted ? "bg-emerald-500/20 text-emerald-400" : isFailed ? "bg-rose-500/20 text-rose-400" : "bg-slate-700/60 text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 min-h-[24px] bg-slate-700/60" />}
                    </div>
                    <div className="pb-6 flex-1">
                      <div className="text-sm font-medium text-slate-200">{log.step_name}</div>
                      <div className={`text-[11px] ${statusColors[log.status] ?? "text-slate-500"}`}>
                        {log.status}
                        {log.ended_at && ` · ${new Date(log.ended_at).toLocaleString()}`}
                      </div>
                      {log.approver_id && (
                        <div className="text-[10px] text-slate-500 mt-0.5">Approved by user</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {request.execution_id && (
        <div className="mt-6">
          <Link
            href={`/executions/${request.execution_id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition"
          >
            View full execution logs <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </Link>
        </div>
      )}
    </Shell>
  );
}
