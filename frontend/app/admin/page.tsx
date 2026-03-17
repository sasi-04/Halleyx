"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    fetch("/api/proxy/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, color: "#6366f1", icon: "👥" },
        { label: "Total Requests", value: stats.totalRequests, color: "#8b5cf6", icon: "📋" },
        { label: "Pending", value: stats.pendingRequests, color: "#f59e0b", icon: "⏳" },
        { label: "Completed", value: stats.completedRequests, color: "#10b981", icon: "✅" },
        { label: "Rejected", value: stats.rejectedRequests, color: "#ef4444", icon: "❌" },
      ]
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚡</div>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>System overview and management</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
              {cards.map((c) => (
                <div key={c.label} style={{ background: "#1e1e2e", borderRadius: 16, padding: "1.5rem", border: `1px solid ${c.color}33`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.color }} />
                  <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>{c.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: c.color }}>{c.value ?? "—"}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {[
                { href: "/admin/users", label: "Manage Users", icon: "👤", desc: "Create, edit, assign roles" },
                { href: "/admin/workflows", label: "Workflows", icon: "🔀", desc: "View workflow configurations" },
                { href: "/admin/rules", label: "Automation Rules", icon: "⚙️", desc: "Manage automation logic" },
                { href: "/admin/logs", label: "Audit Logs", icon: "📜", desc: "Full system audit trail" },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#1e1e2e", borderRadius: 12, padding: "1.25rem", border: "1px solid #2d2d44", cursor: "pointer", transition: "border-color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2d2d44")}>
                    <div style={{ fontSize: 28, marginBottom: "0.5rem" }}>{item.icon}</div>
                    <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: "0.25rem" }}>{item.label}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
