const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function getCeoDashboard(token: string) {
  const r = await fetch(`${BASE}/ceo/dashboard`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch CEO dashboard");
  return r.json();
}

export async function getCeoPendingApprovals(token: string) {
  const r = await fetch(`${BASE}/ceo/pending-approvals`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch pending approvals");
  return r.json();
}

export async function getCeoHistory(token: string, page = 1) {
  const r = await fetch(`${BASE}/ceo/audit-logs?page=${page}&pageSize=20`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch history");
  return r.json();
}

export async function approveCeoRequest(token: string, id: string, comments?: string) {
  const r = await fetch(`${BASE}/ceo/requests/${id}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ comments }),
  });
  if (!r.ok) throw new Error("Failed to approve request");
  return r.json();
}

export async function rejectCeoRequest(token: string, id: string, reason: string) {
  const r = await fetch(`${BASE}/ceo/requests/${id}/reject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!r.ok) throw new Error("Failed to reject request");
  return r.json();
}
