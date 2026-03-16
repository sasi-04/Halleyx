"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Shell } from "../../components/layout/Shell";
import { api } from "../../api/client";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/dashboard/notifications")).data,
  });

  const items = data?.items ?? [];

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-400/80" />
          Notifications
        </h2>
        <p className="text-[11px] text-slate-400">
          Workflow notifications for your role. You receive these when steps target your role.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No notifications yet.</p>
          <p className="text-slate-500 text-xs mt-1">
            Notifications appear when workflows reach steps that notify your role.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">When</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Step</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Execution</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n: any) => (
                  <tr
                    key={n.id}
                    className="border-b border-slate-800/80 hover:bg-slate-900/50 transition"
                  >
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(n.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{n.step_name}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/executions/${n.execution_id}`}
                        className="font-mono text-xs text-blue-400 hover:underline"
                      >
                        {n.execution_id?.slice(0, 8)}…
                      </Link>
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
