"use client";
import { useState, useEffect, useCallback } from "react";

interface ApprovalRequest {
  id: string;
  request_type: string;
  status: string;
  created_at: string;
  request_data: any;
  requester?: { id: string; name: string; email: string; department?: string };
}

export default function CeoApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/ceo/pending-approvals`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setRequests(Array.isArray(d) ? d : d.requests || []);
    } catch { setRequests([]); }
    setLoading(false);
  }, [token, BASE]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const decide = async (decision: "approve" | "reject") => {
    if (!selected) return;
    setActing(true); setMsg("");
    try {
      const r = await fetch(`${BASE}/ceo/requests/${selected.id}/${decision}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comments: comment, reason: comment }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      setMsg(`Request ${decision}d successfully!`);
      setSelected(null); setComment("");
      fetchApprovals();
    } catch (e: any) { setMsg(e.message); }
    setActing(false);
  };

  const statusColor: Record<string, string> = { pending: "#f59e0b", in_progress: "#6366f1", completed: "#10b981", rejected: "#ef4444" };
  const typeLabel: Record<string, string> = { expense: "💰 Expense", onboarding: "👤 Onboarding", leave: "🌴 Leave", other: "📋 Other" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "2rem" }}>
          Pending Approvals
        </h1>

        {msg && <div style={{ background: msg.includes("!") ? "#10b98122" : "#ef444422", border: `1px solid ${msg.includes("!") ? "#10b981" : "#ef4444"}`, borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: msg.includes("!") ? "#10b981" : "#ef4444" }}>{msg}</div>}

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading...</div>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", background: "#1e1e2e", borderRadius: 12, border: "1px solid #2d2d44" }}>
                <div style={{ fontSize: 40, marginBottom: "0.5rem" }}>✅</div>
                <div style={{ color: "#64748b" }}>No pending approvals</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {requests.map((req) => (
                  <div key={req.id} onClick={() => { setSelected(req); setComment(""); setMsg(""); }}
                    style={{ background: selected?.id === req.id ? "#1e1e3e" : "#1e1e2e", borderRadius: 12, padding: "1.25rem", border: `1px solid ${selected?.id === req.id ? "#f59e0b77" : "#2d2d44"}`, cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 600 }}>{typeLabel[req.request_type] || req.request_type}</span>
                      <span style={{ background: `${statusColor[req.status] || "#64748b"}22`, color: statusColor[req.status] || "#64748b", padding: "0.15rem 0.5rem", borderRadius: 6, fontSize: "0.8rem" }}>{req.status}</span>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>From: <strong style={{ color: "#e2e8f0" }}>{req.requester?.name}</strong> — {req.requester?.department}</div>
                    {req.request_data?.amount && <div style={{ color: "#f59e0b", fontSize: "0.85rem", marginTop: "0.25rem" }}>Amount: ${req.request_data.amount}</div>}
                    <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.5rem" }}>{new Date(req.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div style={{ background: "#1e1e2e", borderRadius: 12, padding: "1.5rem", border: "1px solid #f59e0b44", position: "sticky", top: "2rem", alignSelf: "flex-start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ margin: 0, color: "#f59e0b" }}>Request Details</h3>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Type</div>
                <div style={{ fontWeight: 600 }}>{typeLabel[selected.request_type] || selected.request_type}</div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Requested By</div>
                <div>{selected.requester?.name} ({selected.requester?.department})</div>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>{selected.requester?.email}</div>
              </div>

              {selected.request_data && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Request Data</div>
                  <div style={{ background: "#0f0f1a", borderRadius: 8, padding: "0.75rem", fontSize: "0.8rem", color: "#a78bfa", fontFamily: "monospace", maxHeight: 200, overflow: "auto" }}>
                    {JSON.stringify(selected.request_data, null, 2)}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: 4 }}>Comments / Reason</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                  style={{ width: "100%", background: "#0f0f1a", border: "1px solid #2d2d44", borderRadius: 8, padding: "0.5rem 0.75rem", color: "#e2e8f0", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={() => decide("approve")} disabled={acting}
                  style={{ flex: 1, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", padding: "0.75rem", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}>
                  {acting ? "..." : "✅ Approve"}
                </button>
                <button onClick={() => decide("reject")} disabled={acting}
                  style={{ flex: 1, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", padding: "0.75rem", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}>
                  {acting ? "..." : "❌ Reject"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
