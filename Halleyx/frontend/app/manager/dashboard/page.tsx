"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "../../../components/layout/Shell";
import { api } from "../../../api/client";
import { ClipboardCheck, FileText, Bell, Wallet, UserPlus, Check, XCircle } from "lucide-react";

interface QueueItem {
  execution_id: string | null;
  request_id?: string;
  employee_name: string;
  request_type: string;
  amount?: number | null;
  submitted_at: string;
  request_data?: any;
}

export default function ManagerDashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    const parsed = raw ? JSON.parse(raw) : null;
    setUserRole(parsed?.role ?? null);
    console.log("MANAGER VIEW LOADED");
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["manager-stats"],
    queryFn: async () => (await api.get("/manager/stats")).data,
    enabled: userRole === "MANAGER",
  });

  const { data: myRequests } = useQuery({
    queryKey: ["manager-my-requests"],
    queryFn: async () => (await api.get("/requests", { params: { page: 1, pageSize: 10 } })).data,
    enabled: userRole === "MANAGER",
  });

  const { data: notifications } = useQuery({
    queryKey: ["manager-notifications"],
    queryFn: async () => (await api.get("/dashboard/notifications")).data,
    enabled: userRole === "MANAGER",
  });

  const {
    data: queue,
    isLoading: queueLoading,
  } = useQuery({
    queryKey: ["manager-approval-queue"],
    queryFn: async () => (await api.get("/request/pending")).data,
    enabled: userRole === "MANAGER",
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
      qc.invalidateQueries({ queryKey: ["manager-approval-queue"] });
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
      qc.invalidateQueries({ queryKey: ["manager-approval-queue"] });
    },
  });

  if (userRole && userRole !== "MANAGER") {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-center text-slate-300">
          This panel is only available for managers.
        </div>
      </Shell>
    );
  }

  const queueItems: QueueItem[] = queue?.items ?? [];
  const myRequestItems: any[] = myRequests?.items ?? [];
  const notifItems: any[] = notifications?.items ?? [];

  const pendingApprovalsCount = stats?.pendingApprovals ?? queueItems.length;
  const myRequestsCount = myRequests?.total ?? myRequestItems.length;

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-400/80" />
          Manager Dashboard
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Approve or reject requests assigned to you, create new requests, and track your activity.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-200 font-semibold">Pending Approvals</div>
            <div className="text-2xl font-bold text-amber-100 mt-1">{pendingApprovalsCount}</div>
          </div>
          <ClipboardCheck className="h-8 w-8 text-amber-400/80" />
        </div>
        <div className="rounded-xl border border-slate-500/40 bg-slate-950/40 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-200 font-semibold">My Requests</div>
            <div className="text-2xl font-bold text-slate-100 mt-1">{myRequestsCount}</div>
          </div>
          <FileText className="h-8 w-8 text-slate-400/80" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Approval Queue */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-950/60">
          <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Approval Queue</div>
              <div className="text-[11px] text-slate-400">
                Requests currently at the manager approval level.
              </div>
            </div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((item) => {
                    const title =
                      item.request_data?.title ??
                      item.request_data?.request_title ??
                      (item.request_type === "expense" ? "Expense Request" : "Onboarding Request");
                    const status = "Pending";
                    return (
                      <tr
                        key={item.request_id ?? String(item.execution_id)}
                        className="border-b border-slate-800/80 hover:bg-slate-900/60 transition cursor-pointer"
                        onClick={() => {
                          if (item.request_id) router.push(`/requests/${item.request_id}`);
                        }}
                      >
                        <td className="px-4 py-3 text-slate-100">{title}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-slate-200">
                            {item.request_type === "expense" ? (
                              <Wallet className="h-4 w-4 text-amber-400/80" />
                            ) : (
                              <UserPlus className="h-4 w-4 text-violet-400/80" />
                            )}
                            {item.request_type === "expense" ? "Expense" : "Onboarding"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{item.employee_name}</td>
                        <td className="px-4 py-3 text-slate-200">
                          {item.amount != null ? `₹${item.amount}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{status}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            disabled={approveMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.request_id) approveMutation.mutate({ requestId: item.request_id });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 transition"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            disabled={rejectMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.request_id) rejectMutation.mutate({ requestId: item.request_id });
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20 transition"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: create request, my requests, notifications */}
        <div className="space-y-4">
          {/* Create Request */}
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
            <div className="text-sm font-semibold text-amber-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400/80" />
              Create Request
            </div>
            <p className="text-[11px] text-amber-200/80">
              Submit a new expense or onboarding request, just like an employee.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <Link
                href="/requests/create?type=expense"
                className="inline-flex items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/60 px-3 py-2 text-xs text-amber-100 hover:bg-amber-500/30 transition"
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

          {/* My Requests (compact) */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-100">My Requests</div>
              <Link href="/requests" className="text-[11px] text-blue-400 hover:underline">
                View all
              </Link>
            </div>
            {myRequestItems.length === 0 ? (
              <div className="text-[11px] text-slate-500">You have not created any requests yet.</div>
            ) : (
              <div className="space-y-2">
                {myRequestItems.slice(0, 5).map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/requests/${r.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 hover:bg-slate-900/70 transition"
                  >
                    <span className="text-[11px] text-slate-200">
                      {r.request_type === "expense" ? "Expense" : "Onboarding"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notifications (unread) */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-100">Notifications</span>
              </div>
            </div>
            {notifItems.length === 0 ? (
              <div className="text-[11px] text-slate-500">No notifications yet.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifItems.slice(0, 5).map((n: any) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-200"
                  >
                    <div className="font-medium">{n.step_name ?? n.type ?? "Update"}</div>
                    <div className="text-slate-400">
                      {new Date(n.at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

