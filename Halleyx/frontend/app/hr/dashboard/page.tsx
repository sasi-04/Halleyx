"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { Bell, ClipboardCheck, FileText, UserPlus, Check, XCircle } from "lucide-react";

type HxUser = { id: string; name: string; email: string; role: string };

export default function HrDashboardPage() {
  const [user, setUser] = useState<HxUser | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    setUser(raw ? JSON.parse(raw) : null);
  }, []);

  const role = user?.role ?? null;

  const { data: summary } = useQuery({
    queryKey: ["hr-summary"],
    queryFn: async () => {
      const all = await api.get("/requests/all", { params: { page: 1, pageSize: 1 } });
      const totalRequests = all.data.total ?? 0;
      const pending = await api.get("/hr/pending");
      const pendingHrApprovals = pending.data.items?.length ?? 0;
      const approved = await api.get("/requests/all", { params: { page: 1, pageSize: 500 } });
      const approvedCount = (approved.data.items ?? []).filter((r: any) => r.status === "approved" || r.status === "completed").length;
      const rejectedCount = (approved.data.items ?? []).filter((r: any) => r.status === "rejected").length;
      return { totalRequests, pendingHrApprovals, approvedCount, rejectedCount };
    },
    enabled: role === "HR" || role === "ADMIN",
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["hr-approval-queue"],
    queryFn: async () => (await api.get("/hr/pending")).data,
    enabled: role === "HR" || role === "ADMIN",
  });

  const { data: allRequests } = useQuery({
    queryKey: ["hr-all-requests"],
    queryFn: async () => (await api.get("/requests/all", { params: { page: 1, pageSize: 50 } })).data,
    enabled: role === "HR" || role === "ADMIN",
  });

  const { data: myRequests } = useQuery({
    queryKey: ["hr-my-requests"],
    queryFn: async () => (await api.get("/requests", { params: { page: 1, pageSize: 20 } })).data,
    enabled: role === "HR" || role === "ADMIN",
  });

  const { data: notifications } = useQuery({
    queryKey: ["hr-notifications"],
    queryFn: async () => {
      if (!user?.id) return { notifications: [] };
      return (await api.get(`/notifications/${user.id}`)).data;
    },
    enabled: Boolean(user?.id) && (role === "HR" || role === "ADMIN"),
  });

  const approveMutation = useMutation({
    mutationFn: async (payload: { requestId: string }) => {
      // eslint-disable-next-line no-console
      console.log("CLICK APPROVE", payload.requestId);
      const token = window.localStorage.getItem("hx-token");
      const res = await fetch("/api/request/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId: payload.requestId, action: "APPROVE" }),
      });
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-approval-queue"] });
      qc.invalidateQueries({ queryKey: ["hr-all-requests"] });
      qc.invalidateQueries({ queryKey: ["hr-notifications"] });
      qc.invalidateQueries({ queryKey: ["hr-summary"] });
      alert("Approved");
      window.location.reload();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (payload: { requestId: string }) => {
      // eslint-disable-next-line no-console
      console.log("REJECT CLICK");
      const token = window.localStorage.getItem("hx-token");
      const res = await fetch("/api/request/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId: payload.requestId, action: "REJECT" }),
      });
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-approval-queue"] });
      qc.invalidateQueries({ queryKey: ["hr-all-requests"] });
      qc.invalidateQueries({ queryKey: ["hr-notifications"] });
      qc.invalidateQueries({ queryKey: ["hr-summary"] });
    },
  });

  if (role && role !== "HR" && role !== "ADMIN") {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-center text-slate-300">
          This panel is only available for HR.
        </div>
      </Shell>
    );
  }

  const queueItems = queue?.items ?? [];
  const notifItems = (notifications?.notifications ?? []).filter((n: any) => !n.is_read);
  const allItems = allRequests?.items ?? [];
  const myItems = myRequests?.items ?? [];

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-violet-400/80" />
          HR Dashboard
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Approve/reject HR-level requests, create requests, and monitor all requests.</p>
      </div>

      {/* 1) Dashboard Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-500/40 bg-slate-950/40 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-200 font-semibold">Total Requests</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">{summary?.totalRequests ?? "—"}</div>
          </div>
          <FileText className="h-8 w-8 text-slate-400/80" />
        </div>
        <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-violet-200 font-semibold">Pending HR Approvals</div>
            <div className="text-2xl font-bold text-violet-100 mt-1">{summary?.pendingHrApprovals ?? "—"}</div>
          </div>
          <ClipboardCheck className="h-8 w-8 text-violet-400/80" />
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
          <div className="text-xs text-emerald-200 font-semibold">Approved / Rejected</div>
          <div className="mt-1 text-sm text-slate-200">
            <span className="font-semibold text-emerald-200">{summary?.approvedCount ?? "—"}</span>{" "}
            <span className="text-slate-500">/</span>{" "}
            <span className="font-semibold text-rose-200">{summary?.rejectedCount ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* 2) Approval Queue */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 mb-6">
        <div className="px-4 py-3 border-b border-slate-800/80">
          <div className="text-sm font-semibold text-slate-100">Approval Queue</div>
          <div className="text-[11px] text-slate-400">Requests where current level role is HR.</div>
        </div>
        {queueLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading approvals…</div>
        ) : queueItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No pending approvals.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Request Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Current Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item: any) => (
                  <tr key={item.request_id ?? item.execution_id} className="border-b border-slate-800/80 hover:bg-slate-900/60 transition">
                    <td className="px-4 py-3 text-slate-100">{item.request_title}</td>
                    <td className="px-4 py-3 text-slate-200">{String(item.type).toUpperCase()}</td>
                    <td className="px-4 py-3 text-slate-200">{item.created_by}</td>
                    <td className="px-4 py-3 text-slate-300">{item.current_status}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        disabled={approveMutation.isPending}
                        onClick={() => item.request_id && approveMutation.mutate({ requestId: item.request_id })}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 transition"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        disabled={rejectMutation.isPending}
                        onClick={() => item.request_id && rejectMutation.mutate({ requestId: item.request_id })}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20 transition"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 3) Create Request */}
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/10 p-4 space-y-2">
          <div className="text-sm font-semibold text-violet-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-400/80" />
            Create Request
          </div>
          <p className="text-[11px] text-slate-400">Create expense or onboarding requests (same as employee).</p>
          <div className="flex flex-col gap-2 mt-2">
            <Link
              href="/requests/create?type=expense"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900/60 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 hover:bg-slate-900 transition"
            >
              New Expense Request
            </Link>
            <Link
              href="/requests/create?type=onboarding"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900/60 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 hover:bg-slate-900 transition"
            >
              New Onboarding Request
            </Link>
          </div>
        </div>

        {/* 6) Notifications */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-100">Notifications (Unread)</span>
          </div>
          {notifItems.length === 0 ? (
            <div className="text-[11px] text-slate-500">No unread notifications.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifItems.slice(0, 10).map((n: any) => (
                <div key={n.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-200">{n.title}</div>
                  <div className="text-[11px] text-slate-400">{n.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4) All Requests */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 mt-6">
        <div className="px-4 py-3 border-b border-slate-800/80">
          <div className="text-sm font-semibold text-slate-100">All Requests</div>
          <div className="text-[11px] text-slate-400">Global visibility across the system.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {allItems.slice(0, 20).map((r: any) => (
                <tr key={r.id} className="border-b border-slate-800/80 hover:bg-slate-900/60 transition">
                  <td className="px-4 py-3 text-slate-100">
                    <Link href={`/requests/${r.id}`} className="hover:underline">
                      {r.request_data?.title ?? "Request"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{String(r.request_type).toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-200">{r.requester?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{r.status}</td>
                </tr>
              ))}
              {allItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5) My Requests */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 mt-6">
        <div className="px-4 py-3 border-b border-slate-800/80">
          <div className="text-sm font-semibold text-slate-100">My Requests</div>
          <div className="text-[11px] text-slate-400">Requests created by HR.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {myItems.slice(0, 20).map((r: any) => (
                <tr key={r.id} className="border-b border-slate-800/80 hover:bg-slate-900/60 transition">
                  <td className="px-4 py-3 text-slate-100">
                    <Link href={`/requests/${r.id}`} className="hover:underline">
                      {r.request_data?.title ?? "Request"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{String(r.request_type).toUpperCase()}</td>
                  <td className="px-4 py-3 text-slate-300">{r.status}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {myItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No requests created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

