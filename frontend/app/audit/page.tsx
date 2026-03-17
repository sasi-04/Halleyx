"use client";

import React, { useEffect, useState } from "react";
import { Shell } from "../../components/layout/Shell";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import Link from "next/link";

interface ExecutionLog {
  id: string;
  execution_id: string;
  step_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface ExecutionItem {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

export default function AuditPage() {
  const [workflowId, setWorkflowId] = useState("");
  const [showMineOnly, setShowMineOnly] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    if (raw) {
      const u = JSON.parse(raw);
      setShowMineOnly(u?.role === "EMPLOYEE");
    }
  }, []);

  const { data: executions } = useQuery({
    queryKey: ["audit-executions", workflowId, showMineOnly],
    queryFn: async () => {
      const res = await api.get("/executions", {
        params: {
          page: 1,
          pageSize: 50,
          workflowId: workflowId || undefined,
          mine: showMineOnly ? "true" : undefined,
        },
      });
      return res.data.items as ExecutionItem[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["audit-logs", executions?.map((e) => e.id).join(",")],
    enabled: !!executions && executions.length > 0,
    queryFn: async () => {
      const all: ExecutionLog[] = [];
      if (!executions) return all;
      for (const ex of executions) {
        const res = await api.get(`/executions/${ex.id}/logs`);
        all.push(...(res.data as ExecutionLog[]));
      }
      return all;
    },
  });

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Audit Logs</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Browse past executions, filter by workflow, and inspect step-level audit trail.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="Filter by workflow ID..."
            className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showMineOnly}
              onChange={(e) => setShowMineOnly(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
            />
            <span>My executions only</span>
          </label>
          <span className="text-slate-400 text-xs">
            Showing up to 50 executions.
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,3fr] gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Execution</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Workflow</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Status</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Started</th>
                </tr>
              </thead>
              <tbody>
                {executions?.map((e) => (
                  <tr key={e.id} className="border-t border-slate-800/80 hover:bg-slate-900/50 transition">
                    <td className="px-3 py-2">
                      <Link href={`/executions/${e.id}`} className="font-mono text-[10px] text-blue-400 hover:underline">
                        {e.id?.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{e.workflow_id?.slice(0, 8)}…</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/60 text-slate-200 border border-slate-600/60">
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{new Date(e.started_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(!executions || executions.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      No executions yet for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Execution</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Step</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Status</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-400">Started</th>
                </tr>
              </thead>
              <tbody>
                {logs?.map((log) => (
                  <tr key={log.id} className="border-t border-slate-800/80 hover:bg-slate-900/50 transition">
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{log.execution_id?.slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-slate-200">{log.step_name}</td>
                    <td className="px-3 py-2 text-slate-300">{log.status}</td>
                    <td className="px-3 py-2 text-slate-300">{new Date(log.started_at).toLocaleString()}</td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      No audit logs yet for the selected executions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

