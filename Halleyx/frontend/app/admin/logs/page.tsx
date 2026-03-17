"use client";
import { useState, useEffect, useCallback } from "react";

interface LogEntry {
  id: string;
  action: string;
  user_id: string;
  request_id: string;
  comments?: string;
  timestamp: string;
  user?: { name: string; email: string; role: string };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (filterAction) params.set("action", filterAction);
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api"}/admin/audit-logs?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      setLogs(Array.isArray(d.logs) ? d.logs : []);
      setTotal(d.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  }, [token, page, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionColor: Record<string, string> = {
    manager_approved: "#10b981", manager_rejected: "#ef4444",
    hr_approved: "#10b981", hr_rejected: "#ef4444",
    ceo_approved: "#10b981", ceo_rejected: "#ef4444",
    workflow_completed: "#6366f1",
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "2rem" }}>
          Audit Logs
        </h1>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <input placeholder="Filter by action..." value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            style={{ flex: 1, background: "#1e1e2e", border: "1px solid #2d2d44", borderRadius: 8, padding: "0.75rem 1rem", color: "#e2e8f0", fontSize: "0.9rem" }} />
          <button onClick={() => fetchLogs()} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "0.75rem 1.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Refresh</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading logs...</div>
        ) : (
          <>
            <div style={{ background: "#1e1e2e", borderRadius: 12, overflow: "hidden", border: "1px solid #2d2d44" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0f0f1a" }}>
                    {["Timestamp", "Action", "User", "Request ID", "Comments"].map((h) => (
                      <th key={h} style={{ padding: "0.875rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} style={{ borderTop: "1px solid #2d2d44", background: i % 2 === 0 ? "transparent" : "#ffffff05" }}>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ background: `${actionColor[log.action] || "#6366f1"}22`, color: actionColor[log.action] || "#6366f1", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}>{log.user?.name || log.user_id.slice(0, 8)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.8rem", fontFamily: "monospace" }}>{log.request_id?.slice(0, 12)}...</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.85rem" }}>{log.comments || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>No logs found</div>}
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
