"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LayoutPanelLeft, History, Workflow, User, LogOut, FilePlus, FolderOpen, Bell, ClipboardCheck, Users, UserPlus, FileCheck2 } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

const ROLES = ["EMPLOYEE", "MANAGER", "FINANCE", "HR", "CEO", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

const navItems: { href: string; label: string; icon: any; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutPanelLeft, roles: ROLES },
  { href: "/manager/approvals", label: "Pending Approvals", icon: ClipboardCheck, roles: ["MANAGER", "ADMIN"] },
  { href: "/manager/team-requests", label: "Team Requests", icon: Users, roles: ["MANAGER", "ADMIN"] },
  { href: "/manager/history", label: "Request History", icon: History, roles: ["MANAGER", "ADMIN"] },
  { href: "/hr/requests", label: "Onboarding Requests", icon: UserPlus, roles: ["HR", "ADMIN"] },
  { href: "/hr/verifications", label: "Pending Verifications", icon: FileCheck2, roles: ["HR", "ADMIN"] },
  { href: "/hr/history", label: "Onboarding History", icon: History, roles: ["HR", "ADMIN"] },
  { href: "/requests/create", label: "Create Request", icon: FilePlus, roles: ["EMPLOYEE", "ADMIN"] },
  { href: "/requests", label: "My Requests", icon: FolderOpen, roles: ["EMPLOYEE", "ADMIN"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ROLES },
  { href: "/executions", label: "History", icon: History, roles: ROLES },
  { href: "/workflows", label: "Workflows", icon: Workflow, roles: ["ADMIN"] },
  { href: "/audit", label: "Audit Logs", icon: History, roles: ROLES },
  { href: "/profile", label: "Profile", icon: User, roles: ROLES },
];

const roleColors: Record<Role, string> = {
  EMPLOYEE: "bg-slate-500/20 border-slate-400/60 text-slate-200",
  MANAGER: "bg-amber-500/20 border-amber-400/60 text-amber-200",
  FINANCE: "bg-emerald-500/20 border-emerald-400/60 text-emerald-200",
  HR: "bg-violet-500/20 border-violet-400/60 text-violet-200",
  CEO: "bg-rose-500/20 border-rose-400/60 text-rose-200",
  ADMIN: "bg-blue-500/20 border-blue-400/60 text-blue-200",
};

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<{ name: string; email: string; role: Role } | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    setUser(raw ? JSON.parse(raw) : null);
  }, []);

  const userRole = user?.role ?? ("EMPLOYEE" as Role);
  const visibleNav = navItems.filter((n) => n.roles.includes(userRole));

  const logout = () => {
    window.localStorage.removeItem("hx-token");
    window.localStorage.removeItem("hx-user");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-app text-text flex">
      <aside className="w-64 border-r border-border bg-sidebar text-text-onSidebar flex flex-col">
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold shadow-floating">
            HX
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Halleyx Automations</div>
            <div className="text-[10px] text-white/70">Workflow Intelligence Studio</div>
          </div>
        </div>

        {user && (
          <div className="mx-3 mt-4 p-3 rounded-card border border-white/10 bg-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-white/70 truncate">{user.email}</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleColors[userRole] ?? roleColors.EMPLOYEE}`}
            >
              {userRole}
            </span>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 rounded-xl border border-white/10 px-2 py-1.5 text-[10px] text-white/80 hover:bg-white/10 hover:text-softPink transition"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        )}

        <nav className="mt-4 flex flex-col gap-1 px-3 flex-1">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  active
                    ? "bg-accent/25 text-white shadow-md"
                    : "text-white/85 hover:bg-accent/15 hover:translate-x-1 hover:text-white"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${
                    active ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5 group-hover:border-white/20"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="px-8 py-4 border-b border-border flex items-center justify-between hx-glass">
          <div className="space-y-0.5">
            <h1 className="font-semibold text-sm tracking-tight text-text">
              {userRole === "ADMIN" ? "Admin · Workflow Management" : `${userRole} Panel`}
            </h1>
            <p className="text-[11px] text-text-muted">
              {userRole === "ADMIN"
                ? "Design, execute, and audit workflows."
                : userRole === "EMPLOYEE"
                ? "Submit requests and track your executions."
                : userRole === "MANAGER" || userRole === "CEO"
                ? "Approve requests and monitor executions."
                : userRole === "FINANCE" || userRole === "HR"
                ? "Receive notifications and review executions."
                : "Workflow Automation System"}
            </p>
          </div>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-surface hover:border-accent/60 transition"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-border bg-panel shadow-floating p-6 sm:p-8">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

