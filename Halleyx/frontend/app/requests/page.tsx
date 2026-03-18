"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../components/layout/Shell";
import { api } from "../../api/client";
import { Wallet, UserPlus, ChevronRight, FileText, Trash2, CheckSquare, Square } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-200 border-slate-500/50",
  in_progress: "bg-amber-500/20 text-amber-200 border-amber-500/50",
  approved: "bg-blue-500/20 text-blue-200 border-blue-500/50",
  completed: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
  rejected: "bg-rose-500/20 text-rose-200 border-rose-500/50",
};

export default function MyRequestsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => (await api.get("/requests", { params: { page: 1, pageSize: 50 } })).data,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const [selected, setSelected] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredItems = items as any[];
  const allSelected = filteredItems.length > 0 && selected.length === filteredItems.length;

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected(filteredItems.map((r) => r.id));
  };

  const deleteOne = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    try {
      setErrorMsg(null);
      await api.delete(`/requests/${id}`);
      setSelected((prev) => prev.filter((x) => x !== id));
      await qc.invalidateQueries({ queryKey: ["my-requests"] });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete request";
      setErrorMsg(msg);
    }
  };

  const deleteSelected = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selected.length} request(s)?`)) return;
    try {
      setErrorMsg(null);
      const results = await Promise.allSettled(
        selected.map((id) => api.delete(`/requests/${id}`)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        setErrorMsg(`${failed} request(s) failed to delete. Please try again.`);
      }
      setSelected([]);
      await qc.invalidateQueries({ queryKey: ["my-requests"] });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to delete selected requests";
      setErrorMsg(msg);
    }
  };

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50">My Requests</h2>
        <p className="text-[11px] text-slate-400">
          Track your expense and onboarding requests. Click a row to view details.
        </p>
      </div>

      {errorMsg ? (
        <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMsg}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading requests…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 mb-4">No requests yet.</p>
          <Link
            href="/requests/create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/50 px-4 py-2 text-sm text-blue-200 hover:bg-blue-500/30 transition"
          >
            Create your first request
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-950/40 border-b border-slate-800/80">
            <button
              onClick={toggleAll}
              className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-slate-100 transition"
            >
              {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {allSelected ? "Deselect all" : "Select all"}
            </button>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                {selected.length} selected
              </span>
              <button
                onClick={deleteSelected}
                disabled={selected.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 w-[44px]">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Request ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Current Step</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-800/80 hover:bg-slate-900/50 transition"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleOne(r.id);
                        }}
                        className="text-slate-300 hover:text-slate-100 transition"
                        aria-label={selected.includes(r.id) ? "Deselect request" : "Select request"}
                      >
                        {selected.includes(r.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      <Link href={`/requests/${r.id}`} className="hover:text-blue-300 underline">
                        {r.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {r.request_type === "expense" ? (
                          <Wallet className="h-4 w-4 text-amber-400/80" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-violet-400/80" />
                        )}
                        {r.request_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {r.currentStepName ?? r.current_step_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          statusColors[r.derivedStatus ?? r.status] ?? statusColors.pending
                        }`}
                      >
                        {r.derivedStatus ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteOne(r.id);
                          }}
                          className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                        <Link
                          href={`/requests/${r.id}`}
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                        >
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
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
