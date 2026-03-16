"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardData {
  cards?: {
    pendingCeoApprovals: number;
    highPriorityRequests: number;
    totalRequestsToday: number;
    completedWorkflows: number;
  };
  escalatedRequests?: Array<{ id: string; request_type: string; status: string; requester?: { name: string; department?: string } }>;
}

export default function CeoDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api"}/ceo/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = data?.cards
    ? [
        { label: "Pending My Approval", value: data.cards.pendingCeoApprovals, color: "#f59e0b", icon: "⏳" },
        { label: "High Priority", value: data.cards.highPriorityRequests, color: "#ef4444", icon: "🔥" },
        { label: "Requests Today", value: data.cards.totalRequestsToday, color: "#6366f1", icon: "📋" },
        { label: "Completed", value: data.cards.completedWorkflows, color: "#10b981", icon: "✅" },
      ]
    : [];

  const statusColor: Record<string, string> = { pending: "#f59e0b", in_progress: "#6366f1", completed: "#10b981", rejected: "#ef4444" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #f59e0b, #ef4444)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👑</div>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>CEO Dashboard</h1>
            <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>Executive overview & approvals</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              {cards.map((c) => (
                <div key={c.label} style={{ background: "#1e1e2e", borderRadius: 16, padding: "1.5rem", border: `1px solid ${c.color}33`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.color }} />
                  <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>{c.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: c.color }}>{c.value ?? "—"}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              {[
                { href: "/ceo/approvals", label: "Pending Approvals", icon: "📨", desc: "Review and decide on escalated requests" },
                { href: "/ceo/history", label: "Decision History", icon: "📜", desc: "Your past decisions and audit trail" },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#1e1e2e", borderRadius: 12, padding: "1.5rem", border: "1px solid #2d2d44", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2d2d44")}>
                    <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>{item.icon}</div>
                    <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "0.25rem" }}>{item.label}</div>
                    <div style={{ color: "#64748b", fontSize: "0.85rem" }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>

            {(data?.escalatedRequests?.length ?? 0) > 0 && (
              <div style={{ background: "#1e1e2e", borderRadius: 12, border: "1px solid #2d2d44" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #2d2d44", fontWeight: 600, color: "#f59e0b" }}>🔔 Escalated to Me</div>
                {data!.escalatedRequests!.map((req) => (
                  <div key={req.id} style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{req.request_type?.replace(/_/g, " ")} — {req.requester?.name}</div>
                      <div style={{ color: "#64748b", fontSize: "0.85rem" }}>{req.requester?.department}</div>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <span style={{ background: `${statusColor[req.status] || "#64748b"}22`, color: statusColor[req.status] || "#64748b", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>{req.status}</span>
                      <Link href={`/ceo/approvals/${req.id}`} style={{ background: "#f59e0b22", color: "#f59e0b", padding: "0.3rem 0.75rem", borderRadius: 6, textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>Review</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
