"use client";

import React, { useEffect, useState } from "react";
import { Shell } from "../../components/layout/Shell";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import Link from "next/link";

interface ExecutionListItem {
  id: string;
  workflow_id: string;
  workflow_version: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  retries: number;
  triggered_by?: string | null;
}

export default function ExecutionsPage() {
  const [page, setPage] = useState(1);
  const [workflowId, setWorkflowId] = useState("");
  const [status, setStatus] = useState("");
  const [showMineOnly, setShowMineOnly] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    if (raw) {
      const u = JSON.parse(raw);
      setShowMineOnly(u?.role === "EMPLOYEE");
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["executions", page, workflowId, status, showMineOnly],
    queryFn: async () => {
      const res = await api.get("/executions", {
        params: {
          page,
          pageSize: 10,
          workflowId: workflowId || undefined,
          status: status || undefined,
          mine: showMineOnly ? "true" : undefined,
        },
      });
      return res.data as {
        items: ExecutionListItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Shell>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">History (Executions)</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Monitor workflow runs and drill into details.
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          placeholder="Filter by workflow ID..."
          value={workflowId}
          onChange={(e) => {
            setWorkflowId(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showMineOnly}
            onChange={(e) => {
              setShowMineOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
          />
          <span>My executions only</span>
        </label>
      </div>
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-800/80">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">ID</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">Workflow</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">Version</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">Status</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">Started</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">Ended</th>
              <th className="px-3 py-2.5 text-left font-medium text-slate-400">Retries</th>
              <th className="px-3 py-2.5 text-right font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Loading executions...
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((ex) => (
                <tr key={ex.id} className="border-t border-slate-800/80 hover:bg-slate-900/50 transition">
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">
                    <Link href={`/executions/${ex.id}`} className="text-blue-400 hover:underline">
                      {ex.id?.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">{ex.workflow_id?.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-slate-300">{ex.workflow_version}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-200 border border-slate-600/60">
                      {ex.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">{new Date(ex.started_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-slate-300">
                    {ex.ended_at ? new Date(ex.ended_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">{ex.retries}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/executions/${ex.id}`}
                      className="rounded-lg border border-slate-600/60 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800/60 transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            {!isLoading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No executions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between items-center text-sm text-slate-400">
        <span>
          Page {data?.page ?? 1} of {totalPages}
        </span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </Shell>
  );
}

