import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function getAdminStats() {
  try {
    const r = await fetch(`${BASE}/admin/stats`, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

export async function getUsers(token: string) {
  const r = await fetch(`${BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch users");
  return r.json();
}

export async function getLogs(token: string, page = 1) {
  const r = await fetch(`${BASE}/admin/audit-logs?page=${page}&pageSize=30`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch logs");
  return r.json();
}

export async function getAutomationRules(token: string) {
  const r = await fetch(`${BASE}/admin/automation-rules`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch rules");
  return r.json();
}

export default Link;
