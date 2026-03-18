"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shell } from "../../components/layout/Shell";
import { api } from "../../api/client";
import {
  FileText,
  ClipboardCheck,
  Bell,
  TrendingUp,
  Shield,
  Wallet,
  UserPlus,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    setUser(raw ? JSON.parse(raw) : null);
  }, []);

  const { data: workflows } = useQuery({
    queryKey: ["dashboard-workflows"],
    queryFn: async () => (await api.get("/workflows", { params: { page: 1, pageSize: 50 } })).data,
  });

  const { data: executions } = useQuery({
    queryKey: ["dashboard-executions"],
    queryFn: async () => (await api.get("/executions", { params: { page: 1, pageSize: 20 } })).data,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["dashboard-pending-approvals"],
    queryFn: async () => (await api.get("/dashboard/pending-approvals")).data,
  });

  const { data: notifications } = useQuery({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => (await api.get("/dashboard/notifications")).data,
  });

  const { data: requestStats } = useQuery({
    queryKey: ["request-stats"],
    queryFn: async () => (await api.get("/requests/stats")).data,
  });

  const { data: myRequests } = useQuery({
    queryKey: ["my-requests-dash"],
    queryFn: async () => (await api.get("/requests", { params: { page: 1, pageSize: 5 } })).data,
  });

  const { data: managerStats } = useQuery({
    queryKey: ["manager-stats"],
    queryFn: async () => (await api.get("/manager/stats")).data,
    enabled: !!user && (user.role === "MANAGER" || user.role === "ADMIN"),
  });

  const { data: managerPending } = useQuery({
    queryKey: ["manager-pending-approvals"],
    queryFn: async () => (await api.get("/manager/pending-approvals")).data,
    enabled: !!user && (user.role === "MANAGER" || user.role === "ADMIN"),
  });

  const { data: managerHistory } = useQuery({
    queryKey: ["manager-approval-history-dash"],
    queryFn: async () => (await api.get("/manager/approval-history", { params: { page: 1, pageSize: 5 } })).data,
    enabled: !!user && (user.role === "MANAGER" || user.role === "ADMIN"),
  });

  const { data: hrStats } = useQuery({
    queryKey: ["hr-stats"],
    queryFn: async () => (await api.get("/hr/stats")).data,
    enabled: !!user && (user.role === "HR" || user.role === "ADMIN"),
  });

  const { data: hrQueue } = useQuery({
    queryKey: ["hr-onboarding-queue"],
    queryFn: async () => (await api.get("/hr/onboarding-queue")).data,
    enabled: !!user && (user.role === "HR" || user.role === "ADMIN"),
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      executionId,
      decision,
    }: {
      executionId: string;
      decision: "approve" | "reject";
    }) => {
      const res = await api.post(`/executions/${executionId}/approve`, { decision });
      return res.data;
    },
    onSuccess: (ex) => router.push(`/executions/${ex.id}`),
  });

  const role = (user?.role ?? "EMPLOYEE") as string;
  const isEmployee = role === "EMPLOYEE";
  const isManager = role === "MANAGER";
  const isHr = role === "HR";
  const isCeo = role === "CEO";
  const isApprover = role === "MANAGER" || role === "CEO" || role === "HR";
  const isFinance = role === "FINANCE";
  const isAdmin = role === "ADMIN";

  const execItems = executions?.items ?? [];
  const pendingCount = pendingApprovals?.items?.length ?? 0;
  const notifCount = notifications?.items?.length ?? 0;
  const myExecs = execItems.filter((e: any) => e.triggered_by === user?.id);
  const inProgress = execItems.filter((e: any) => e.status === "in_progress").length;
  const completed = execItems.filter((e: any) => e.status === "completed").length;
  const reqPending = requestStats?.pending ?? 0;
  const reqApproved = requestStats?.approved ?? 0;
  const reqRejected = requestStats?.rejected ?? 0;

  const roleAccent = {
    EMPLOYEE: "from-slate-500/20 to-slate-600/10 border-slate-500/40",
    MANAGER: "from-amber-500/20 to-amber-600/10 border-amber-500/40",
    CEO: "from-rose-500/20 to-rose-600/10 border-rose-500/40",
    FINANCE: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/40",
    HR: "from-violet-500/20 to-violet-600/10 border-violet-500/40",
    ADMIN: "from-blue-500/20 to-blue-600/10 border-blue-500/40",
  }[role] ?? "from-slate-500/20 to-slate-600/10 border-slate-500/40";

  // If the user is a manager, route them to the dedicated manager dashboard
  if (isManager) {
    if (user) {
      // Navigate once user is loaded so managers only see the minimal panel
      router.push("/manager/dashboard");
    }
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-center text-slate-300">
          Redirecting to Manager Dashboard…
        </div>
      </Shell>
    );
  }

  // HR minimal panel
  if (isHr) {
    if (user) router.push("/hr/dashboard");
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-center text-slate-300">
          Redirecting to HR Dashboard…
        </div>
      </Shell>
    );
  }

  // CEO minimal panel
  if (isCeo) {
    if (user) router.push("/ceo/dashboard");
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-8 text-center text-slate-300">
          Redirecting to CEO Dashboard…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-r ${roleAccent} border`}>
        <h2 className="text-lg font-semibold tracking-tight text-slate-50 flex items-center gap-2">
          Welcome back, {user?.name ?? "User"}
          <span className="text-xs font-normal text-slate-400">· {role}</span>
        </h2>
        <p className="text-[11px] text-slate-400 mt-1">
          {isAdmin && "Full system access. Manage workflows, users, and audit all activity."}
          {isEmployee && "Submit expense and onboarding requests. Track status below."}
          {role === "CEO" && "High-priority escalations. Executive approval queue."}
          {role === "FINANCE" && "Expense notifications and finance-related workflow alerts."}
          {role === "HR" && "Verify onboarding documents. New joiner approvals."}
        </p>
      </div>

      {/* Role-specific stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(isEmployee || isAdmin) && (
          <>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-100">{reqPending}</div>
                <div className="text-[10px] text-slate-500">Pending Requests</div>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-600/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-100">{reqApproved}</div>
                <div className="text-[10px] text-slate-400">Approved</div>
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-600/50 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-rose-200" />
              </div>
              <div>
                <div className="text-lg font-bold text-rose-100">{reqRejected}</div>
                <div className="text-[10px] text-slate-400">Rejected</div>
              </div>
            </div>
          </>
        )}
        {(isAdmin) && (
          <>
            <Link
              href="/manager/approvals"
              className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 flex items-center gap-3 hover:border-amber-500/60 transition"
            >
              <div className="h-10 w-10 rounded-lg bg-amber-600/50 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-amber-200" />
              </div>
              <div>
                <div className="text-lg font-bold text-amber-100">{managerStats?.pendingApprovals ?? pendingCount}</div>
                <div className="text-[10px] text-slate-400">Pending Approvals</div>
              </div>
            </Link>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-600/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-100">{managerStats?.approvedRequests ?? 0}</div>
                <div className="text-[10px] text-slate-400">Approved</div>
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-600/50 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-rose-200" />
              </div>
              <div>
                <div className="text-lg font-bold text-rose-100">{managerStats?.rejectedRequests ?? 0}</div>
                <div className="text-[10px] text-slate-400">Rejected</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-500/40 bg-slate-950/20 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-200" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-100">{managerStats?.teamRequests ?? 0}</div>
                <div className="text-[10px] text-slate-400">Team Requests</div>
              </div>
            </div>
          </>
        )}
        {(role === "CEO" || role === "HR") && !isManager && !isAdmin && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-600/50 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <div className="text-lg font-bold text-amber-100">{pendingCount}</div>
              <div className="text-[10px] text-slate-400">Pending Approvals</div>
            </div>
          </div>
        )}
        {(isFinance || isAdmin) && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-600/50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-100">{notifCount}</div>
              <div className="text-[10px] text-slate-400">Notifications</div>
            </div>
          </div>
        )}
        {role === "CEO" && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-600/50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-rose-200" />
            </div>
            <div>
              <div className="text-lg font-bold text-rose-100">{pendingCount}</div>
              <div className="text-[10px] text-slate-400">Escalations</div>
            </div>
          </div>
        )}
        {role === "HR" && (
          <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-600/50 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-violet-200" />
            </div>
            <div>
              <div className="text-lg font-bold text-violet-100">{hrStats?.pendingOnboardingRequests ?? pendingCount}</div>
              <div className="text-[10px] text-slate-400">Pending Onboardings</div>
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-950/20 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600/50 flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-200" />
            </div>
            <div>
              <div className="text-lg font-bold text-blue-100">{workflows?.items?.length ?? 0}</div>
              <div className="text-[10px] text-slate-400">Workflows</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(isEmployee || isAdmin) && (
          <>
            <Link
              href="/requests/create?type=expense"
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-slate-950/60 p-4 space-y-2 block hover:border-amber-500/50 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-200 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-400/80" />
                  Create Expense Request
                </span>
                <span className="text-[10px] text-slate-500">Expense Approval Workflow</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Submit an expense with amount, department, priority, and receipt.
              </p>
              <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-medium">
                Create request →
              </span>
            </Link>
            <Link
              href="/requests/create?type=onboarding"
              className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-slate-950/60 p-4 space-y-2 block hover:border-violet-500/50 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-violet-200 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-violet-400/80" />
                  Create Onboarding Request
                </span>
                <span className="text-[10px] text-slate-500">Employee Onboarding Workflow</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Submit new hire details for HR verification and IT setup.
              </p>
              <span className="inline-flex items-center gap-1 text-violet-300 text-xs font-medium">
                Create request →
              </span>
            </Link>
          </>
        )}

        {(isAdmin) && (
          <Link
            href="/manager/approvals"
            className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-slate-950/60 p-4 space-y-2 block hover:border-amber-500/50 transition lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-200 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-400/80" />
                Approval Queue
              </span>
              <span className="text-[10px] text-slate-500">
                {(managerPending?.items?.length ?? 0)} pending
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Review and approve or reject requests waiting for your decision.
            </p>
            <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-medium">
              Go to Pending Approvals →
            </span>
          </Link>
        )}

        {(isAdmin) && (managerPending?.items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Recent Pending Approvals</span>
              <Link href="/manager/approvals" className="text-[10px] text-amber-400 hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {managerPending?.items?.slice(0, 5).map((a: any) => (
                <Link
                  key={a.execution_id}
                  href={`/manager/review/${a.execution_id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 hover:bg-slate-800/60 transition"
                >
                  <span className="text-[11px] text-slate-300">{a.employee_name}</span>
                  <span className="text-[11px] text-slate-400">{a.request_type}</span>
                  <span className="text-[11px] text-amber-200">{a.step_name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(isAdmin) && (managerHistory?.items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Recent Approval Activity</span>
              <Link href="/manager/history" className="text-[10px] text-blue-400 hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {managerHistory?.items?.slice(0, 5).map((h: any) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2"
                >
                  <span className="text-[11px] text-slate-300">{h.employee_name}</span>
                  <span className={`text-[11px] ${h.decision === "approved" ? "text-emerald-200" : "text-rose-200"}`}>
                    {h.decision}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(h.reviewed_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isHr || isAdmin) && (
          <Link
            href="/hr/requests"
            className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-slate-950/60 p-4 space-y-2 block hover:border-violet-500/50 transition lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-violet-200 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-violet-400/80" />
                HR Onboarding Queue
              </span>
              <span className="text-[10px] text-slate-500">
                {(hrQueue?.items?.length ?? 0)} waiting
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verify documents, approve or reject onboarding steps, and trigger the next workflow step (IT setup).
            </p>
            <span className="inline-flex items-center gap-1 text-violet-300 text-xs font-medium">
              Open queue →
            </span>
          </Link>
        )}

        {(isHr || isAdmin) && (hrQueue?.items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Recent Onboarding Activity</span>
              <Link href="/hr/requests" className="text-[10px] text-violet-300 hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {hrQueue?.items?.slice(0, 5).map((r: any) => (
                <Link
                  key={r.execution_id}
                  href={`/hr/review/${r.execution_id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 hover:bg-slate-800/60 transition"
                >
                  <span className="text-[11px] text-slate-300">{r.employee_name ?? "—"}</span>
                  <span className="text-[11px] text-slate-400">{r.department ?? "—"}</span>
                  <span className="text-[11px] text-violet-200">{r.current_step}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(isEmployee || isAdmin) && (myRequests?.items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Recent Request Activity</span>
              <Link href="/requests" className="text-[10px] text-blue-400 hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {myRequests?.items?.slice(0, 5).map((r: any) => (
                <Link
                  key={r.id}
                  href={`/requests/${r.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 hover:bg-slate-800/60 transition"
                >
                  <span className="font-mono text-[10px] text-slate-400">{r.id.slice(0, 8)}…</span>
                  <span className="text-[11px] text-slate-300">{r.request_type}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      (r.derivedStatus ?? r.status) === "completed"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : (r.derivedStatus ?? r.status) === "rejected"
                        ? "bg-rose-500/20 text-rose-200"
                        : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {r.derivedStatus ?? r.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-blue-200">
                Admin authority: Full workflow management, user roles, and system configuration.
              </div>
              <Link href="/workflows" className="rounded-xl bg-blue-500/20 border border-blue-400/60 px-3 py-1.5 text-xs text-blue-200 hover:bg-blue-500/30">
                Manage Workflows →
              </Link>
            </div>
            <p className="text-[10px] text-slate-400">
              Create workflows, edit steps and rules, activate versions. Use the Workflows link in the sidebar.
            </p>
          </div>
        )}

        {(isApprover || isFinance) && !isEmployee && !isAdmin && !isManager && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2 lg:col-span-2">
            <div className="text-[11px] font-semibold text-amber-200">
              {isApprover ? "Your authority: Approve or reject requests for your role." : "Your authority: Receive finance-related notifications."}
            </div>
            <p className="text-[10px] text-slate-400">
              {isApprover && "MANAGER: expense approvals. CEO: high-priority expense escalation. HR: onboarding verification."}
              {isFinance && "You receive emails when Finance Notification steps run."}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 lg:col-span-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {(isApprover || isAdmin) && (
            <div className={`rounded-2xl border p-4 space-y-2 ${
              role === "CEO" ? "border-rose-500/30 bg-rose-950/10" :
              role === "HR" ? "border-violet-500/30 bg-violet-950/10" :
              "border-amber-500/30 bg-amber-950/10"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold flex items-center gap-2 ${
                  role === "CEO" ? "text-rose-200" : role === "HR" ? "text-violet-200" : "text-amber-200"
                }`}>
                  <ClipboardCheck className={`h-4 w-4 ${
                    role === "CEO" ? "text-rose-400/80" : role === "HR" ? "text-violet-400/80" : "text-amber-400/80"
                  }`} />
                  {role === "CEO" ? "Executive Escalations" : role === "HR" ? "Onboarding Queue" : "Pending Approvals"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {role} authority
                </span>
              </div>
              <div className="rounded-xl border border-slate-800/80 overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-900/80">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                        Execution
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                        Step
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals?.items?.map((a: any) => (
                      <tr
                        key={a.execution_id}
                        className="border-t border-slate-800/80 hover:bg-slate-900/70 transition"
                      >
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-300">
                          <a className="underline" href={`/executions/${a.execution_id}`}>
                            {a.execution_id}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-200">
                          {a.step_name}
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <button
                            disabled={approveMutation.isPending}
                            onClick={() =>
                              approveMutation.mutate({
                                executionId: a.execution_id,
                                decision: "approve",
                              })
                            }
                            className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={approveMutation.isPending}
                            onClick={() =>
                              approveMutation.mutate({
                                executionId: a.execution_id,
                                decision: "reject",
                              })
                            }
                            className="rounded-full border border-rose-500/70 bg-rose-500/10 px-3 py-1 text-[10px] text-rose-200 hover:bg-rose-500/20 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!pendingApprovals?.items || pendingApprovals.items.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No pending approvals for your role.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            <div className={`rounded-2xl border p-4 space-y-2 ${
              isFinance ? "border-emerald-500/30 bg-emerald-950/10" : "border-slate-800/80 bg-slate-950/60"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold flex items-center gap-2 ${
                  isFinance ? "text-emerald-200" : "text-slate-300"
                }`}>
                  <Bell className={`h-4 w-4 ${isFinance ? "text-emerald-400/80" : "text-slate-500"}`} />
                  {isFinance ? "Finance Notifications" : "Notifications"}
                </span>
                <span className="text-[10px] text-slate-500">
                  For {role}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800/80 overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-900/80">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                        When
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                        Step
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                        Execution
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications?.items?.map((n: any) => (
                      <tr
                        key={n.id}
                        className="border-t border-slate-800/80 hover:bg-slate-900/70 transition"
                      >
                        <td className="px-3 py-2 text-[10px] text-slate-500">
                          {new Date(n.at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-200">
                          {n.step_name}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-300">
                          <a className="underline" href={`/executions/${n.execution_id}`}>
                            {n.execution_id}
                          </a>
                        </td>
                      </tr>
                    ))}
                    {(!notifications?.items || notifications.items.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No notifications yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Recent Executions (Audit)
            </span>
          </div>
          <div className="rounded-xl border border-slate-800/80 overflow-hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                    Execution
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                    Workflow
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {executions?.items?.map((ex: any) => (
                  <tr key={ex.id} className="border-t border-slate-800/80 hover:bg-slate-900/70 transition">
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-300">
                      <a className="underline" href={`/executions/${ex.id}`}>
                        {ex.id}
                      </a>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                      {ex.workflow_id} · v{ex.workflow_version}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-slate-700/80 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-200">
                        {ex.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!executions?.items || executions.items.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                      No executions yet.
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

