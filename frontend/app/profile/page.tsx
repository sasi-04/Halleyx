"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Shell } from "../../components/layout/Shell";
import { api } from "../../api/client";
import { User, Camera, Save } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; department?: string } | null>(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem("hx-user");
    if (raw) {
      const u = JSON.parse(raw);
      setUser(u);
      setName(u.name ?? "");
      setDepartment(u.department ?? "");
    }
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { name, department };
      if (newPassword && newPassword === confirmPassword && currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await api.patch("/auth/profile", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.user) {
        window.localStorage.setItem("hx-user", JSON.stringify(data.user));
        setUser(data.user);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const inputCls =
    "w-full rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1.5";

  if (!user)
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center text-slate-500">
          Loading profile…
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50">Profile</h2>
        <p className="text-[11px] text-slate-400">
          Manage your account details and password.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <User className="h-8 w-8 text-slate-950" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Profile photo</p>
              <p className="text-[11px] text-slate-500">
                Avatar support can be added with file upload.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className={`${inputCls} opacity-70 cursor-not-allowed`}
              />
              <p className="text-[10px] text-slate-500 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputCls}
                placeholder="e.g. Engineering"
              />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <input
                type="text"
                value={user.role}
                disabled
                className={`${inputCls} opacity-70 cursor-not-allowed`}
              />
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Change Password</h4>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className={labelCls}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Leave blank to keep current password.
              </p>
            </div>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 px-6 py-2.5 text-sm font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
