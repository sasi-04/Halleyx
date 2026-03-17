"use client";
import { useState, useEffect, useCallback } from "react";

interface HistoryEntry {
  id: string;
  action: string;
  timestamp: string;
  comments?: string;
  user?: { name: string; email: string };
  request?: { id: string; request_type: string; status: string };
}

export default function CeoHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/ceo/decision-history?page=${page}&pageSize=20`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : d.history || []);
      setTotal(d.total || 0);
    } catch { setHistory([]); }
    setLoading(false);
  }, [token, BASE, page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const totalPages = Math.ceil(total / 20);
  const actionColor: Record<string, string> = { ceo_approved: "#10b981", ceo_rejected: "#ef4444" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "2rem" }}>
          Decision History
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.map((entry) => (
                <div key={entry.id} style={{ background: "#1e1e2e", borderRadius: 10, padding: "1rem 1.25rem", border: "1px solid #2d2d44", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                      <span style={{ background: `${actionColor[entry.action] || "#6366f1"}22`, color: actionColor[entry.action] || "#6366f1", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700 }}>
                        {entry.action === "ceo_approved" ? "✅ Approved" : entry.action === "ceo_rejected" ? "❌ Rejected" : entry.action.replace(/_/g, " ")}
                      </span>
                      {entry.request?.request_type && (
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{entry.request.request_type.replace(/_/g, " ")}</span>
                      )}
                    </div>
                    {entry.comments && <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.25rem" }}>"{entry.comments}"</div>}
                  </div>
                  <div style={{ textAlign: "right", color: "#64748b", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {history.length === 0 && <div style={{ textAlign: "center", padding: "3rem", background: "#1e1e2e", borderRadius: 12, border: "1px solid #2d2d44", color: "#64748b" }}>No decision history found</div>}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d44", padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer", opacity: page <= 1 ? 0.5 : 1 }}>← Prev</button>
                <span style={{ display: "flex", alignItems: "center", color: "#64748b", padding: "0 0.5rem" }}>Page {page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ background: "#1e1e2e", color: "#94a3b8", border: "1px solid #2d2d44", padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer", opacity: page >= totalPages ? 0.5 : 1 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
