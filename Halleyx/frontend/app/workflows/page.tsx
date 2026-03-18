"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import Link from "next/link";
import { Shell } from "../../components/layout/Shell";

interface WorkflowListItem {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
  steps: { id: string }[];
}

export default function WorkflowListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["workflows", page, search],
    queryFn: async () => {
      const res = await api.get("/workflows", {
        params: { page, pageSize: 10, search },
      });
      return res.data as {
        items: WorkflowListItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Shell>
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-50">
            Workflows
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Browse and manage automation blueprints. Each workflow can have multiple
            versions, branches, and approval paths.
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 px-4 py-1.5 text-xs font-semibold shadow-md shadow-blue-500/40 hover:shadow-lg hover:shadow-blue-500/50 transition"
        >
          <span className="text-sm">＋</span>
          <span>New workflow</span>
        </Link>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or ID..."
          className="border border-slate-800/80 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 rounded-full px-4 py-1.5 text-xs w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent transition"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <span className="text-[11px] text-slate-500">
          {data?.total ?? 0} total workflows
        </span>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 overflow-hidden">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-[11px] text-slate-400 tracking-wide">
                WORKFLOW
              </th>
              <th className="px-3 py-2 text-left font-semibold text-[11px] text-slate-400 tracking-wide">
                STEPS
              </th>
              <th className="px-3 py-2 text-left font-semibold text-[11px] text-slate-400 tracking-wide">
                VERSION
              </th>
              <th className="px-3 py-2 text-left font-semibold text-[11px] text-slate-400 tracking-wide">
                STATUS
              </th>
              <th className="px-3 py-2 text-right font-semibold text-[11px] text-slate-400 tracking-wide">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Loading workflows...
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((wf) => (
                <tr
                  key={wf.id}
                  className="border-t border-slate-800/80 hover:bg-slate-900/70 transition"
                >
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-slate-50">
                        {wf.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 truncate">
                        {wf.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{wf.steps.length}</td>
                  <td className="px-3 py-2">{wf.version}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        wf.is_active
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-700/40 text-slate-200 border border-slate-500/50"
                      }`}
                    >
                      {wf.is_active ? "Active" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Link
                      href={`/workflows/${wf.id}`}
                      className="text-[11px] inline-flex items-center rounded-full border border-slate-600/70 px-2.5 py-1 hover:border-blue-400/80 hover:bg-slate-900/80 transition"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/workflows/${wf.id}/execute`}
                      className="text-[11px] inline-flex items-center rounded-full border border-blue-500/70 bg-blue-500/10 px-2.5 py-1 text-blue-100 hover:bg-blue-500/20 transition"
                    >
                      Execute
                    </Link>
                  </td>
                </tr>
              ))}
            {!isLoading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No workflows found. Create your first workflow to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between items-center text-[11px] text-slate-500">
        <span>
          Page {data?.page ?? 1} of {totalPages}
        </span>
        <div className="space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded-full border border-slate-700/80 bg-slate-950/60 disabled:opacity-40 hover:border-slate-400 hover:bg-slate-900/80 transition"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2.5 py-1 rounded-full border border-slate-700/80 bg-slate-950/60 disabled:opacity-40 hover:border-slate-400 hover:bg-slate-900/80 transition"
          >
            Next
          </button>
        </div>
      </div>
    </Shell>
  );
}

