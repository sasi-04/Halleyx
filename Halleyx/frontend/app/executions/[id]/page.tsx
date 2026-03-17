"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { api } from "../../../api/client";
import { Shell } from "../../../components/layout/Shell";
import { AiAssistantPanel } from "../../../components/ai/AiAssistantPanel";

interface ExecutionLog {
  id: string;
  step_name: string;
  step_type: string;
  evaluated_rules: any;
  selected_next_step: string | null;
  status: string;
  approver_id: string | null;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
}

interface Execution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  status: string;
  data: any;
  current_step_id: string | null;
  retries: number;
  started_at: string;
  ended_at: string | null;
  executionLogs: ExecutionLog[];
}

const socket =
  typeof window !== "undefined"
    ? io(process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") || "http://localhost:4000")
    : null;

export default function ExecutionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const queryClient = useQueryClient();
  const [subscribed, setSubscribed] = useState(false);

  if (!id) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-slate-400">
          Execution ID not found.
        </div>
      </Shell>
    );
  }

  const { data: execution, refetch } = useQuery({
    queryKey: ["execution", id],
    queryFn: async () => {
      const res = await api.get(`/executions/${id}`);
      return res.data as Execution;
    },
  });

  useEffect(() => {
    if (!id || !socket) return;
    if (!subscribed) {
      socket.emit("execution:subscribe", id);
      setSubscribed(true);
    }
    socket.on("execution:update", (payload: { executionId: string }) => {
      if (payload.executionId === id) {
        refetch();
      }
    });
    return () => {
      socket.emit("execution:unsubscribe", id);
      socket.off("execution:update");
    };
  }, [id, refetch]);

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/executions/${id}/retry`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution", id] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/executions/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["execution", id] });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });

  if (!execution) {
    return (
      <Shell>
        <p className="text-sm text-slate-500">Loading execution...</p>
      </Shell>
    );
  }

  const flowStages = useMemo(
    () => [
      {
        key: "input",
        label: "Validate Input Schema",
        active: true,
        done: true,
      },
      {
        key: "load",
        label: "Load Workflow",
        active: true,
        done: true,
      },
      {
        key: "start",
        label: "Start From First Step",
        active: true,
        done: true,
      },
      {
        key: "execute",
        label: "Execute Step",
        active: execution.status === "in_progress" || execution.status === "pending",
        done: ["completed", "failed", "canceled"].includes(execution.status),
      },
      {
        key: "rules",
        label: "Evaluate Rules",
        active: execution.status === "in_progress",
        done: execution.executionLogs.length > 0,
      },
      {
        key: "next",
        label: "Next Step / End",
        active: execution.current_step_id !== null,
        done: execution.status === "completed",
      },
    ],
    [execution],
  );

  return (
    <Shell>
      <div className="flex h-[calc(100vh-80px)] gap-5">
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-slate-50">
                Execution Monitor
              </h2>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Follow this run step-by-step as it validates input, executes tasks,
                waits on approvals, and evaluates routing rules.
              </p>
            </div>
            <div className="space-x-2 text-[11px] flex items-center">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${
                  execution.status === "completed"
                    ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                    : execution.status === "failed"
                    ? "border-rose-400/70 bg-rose-500/15 text-rose-200"
                    : "border-blue-400/70 bg-blue-500/15 text-blue-100"
                }`}
              >
                {execution.status}
              </span>
              <button
                disabled={execution.status !== "failed" || retryMutation.isPending}
                onClick={() => retryMutation.mutate()}
                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 disabled:opacity-40 hover:border-blue-400/80 hover:bg-slate-800/80 transition"
              >
                Retry
              </button>
              <button
                disabled={
                  ["completed", "failed", "canceled"].includes(execution.status) ||
                  cancelMutation.isPending
                }
                onClick={() => cancelMutation.mutate()}
                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 disabled:opacity-40 hover:border-rose-400/80 hover:bg-slate-800/80 transition"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[2fr,3fr] gap-4 flex-1 min-h-0">
            <div className="flex flex-col gap-3 overflow-auto pr-1">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs space-y-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Overview</span>
                  <span className="font-mono text-[10px]">{execution.id}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-500">Workflow:</span>{" "}
                  <span className="font-mono text-[11px]">
                    {execution.workflow_id} · v{execution.workflow_version}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-500">Started:</span>{" "}
                  {new Date(execution.started_at).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-500">Ended:</span>{" "}
                  {execution.ended_at
                    ? new Date(execution.ended_at).toLocaleString()
                    : "—"}
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-500">Retries:</span>{" "}
                  {execution.retries}
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-semibold text-[11px]">
                    Execution Flow
                  </span>
                  <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-slate-300">
                    {flowStages.map((stage, index) => (
                      <div
                        key={stage.key}
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-1 min-w-[80px]">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              stage.done
                                ? "bg-green-500"
                                : stage.active
                                ? "bg-blue-500"
                                : "bg-slate-500"
                            }`}
                          />
                          {index < flowStages.length - 1 && (
                            <div className="w-6 h-[1px] bg-slate-700" />
                          )}
                        </div>
                        <span>{stage.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Input & Context</span>
                </div>
                <pre className="bg-slate-900/80 rounded-lg p-3 text-[10px] text-slate-200 overflow-auto max-h-64 border border-slate-800/80">
                  {JSON.stringify(execution.data, null, 2)}
                </pre>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs space-y-1">
                <span className="font-semibold">Timeline</span>
                <ol className="mt-1 space-y-2">
                  {execution.executionLogs.map((log, index) => (
                    <li key={log.id} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">
                            {index + 1}. {log.step_name}
                          </span>
                          <span className="text-[10px] uppercase text-slate-500">
                            {log.step_type}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-200 border border-slate-600/80">
                            {log.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(log.started_at).toLocaleTimeString()} →{" "}
                          {log.ended_at
                            ? new Date(log.ended_at).toLocaleTimeString()
                            : "—"}
                        </div>
                        {log.error_message && (
                          <div className="text-[10px] text-rose-300">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                  {execution.executionLogs.length === 0 && (
                    <li className="text-[11px] text-slate-500">
                      No logs recorded yet.
                    </li>
                  )}
                </ol>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200">
                  Rule Evaluation Details
                </span>
              </div>
              <div className="flex-1 overflow-auto space-y-2">
                {execution.executionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-slate-800/80 rounded-xl px-2.5 py-1.5 space-y-1 bg-slate-950/70"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[11px] text-slate-100">
                        {log.step_name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Next: {log.selected_next_step ?? "terminate"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {(log.evaluated_rules as any[])?.map((ev, idx) => (
                        <div
                          key={ev.ruleId ?? idx}
                          className="flex items-center gap-2 text-[10px]"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              ev.result ? "bg-green-500" : "bg-slate-500"
                            }`}
                          />
                          <span className="font-mono flex-1 overflow-hidden text-ellipsis text-slate-100">
                            {ev.condition}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            p{ev.priority}
                          </span>
                          {ev.is_default && (
                            <span className="text-[9px] px-1 rounded bg-slate-800/80 text-slate-200 border border-slate-600/80">
                              DEFAULT
                            </span>
                          )}
                        </div>
                      ))}
                      {(log.evaluated_rules as any[])?.length === 0 && (
                        <div className="text-[10px] text-slate-500">
                          No rules evaluated (terminal step or paused approval).
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="w-80">
          <AiAssistantPanel executionId={execution.id} />
        </div>
      </div>
    </Shell>
  );
}

