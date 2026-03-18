"use client";
import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  created_at: string;
}

const ROLES = ["EMPLOYEE", "MANAGER", "FINANCE", "HR", "IT", "CEO", "ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", department: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api"}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setUsers(Array.isArray(d) ? d : d.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const createUser = async () => {
    setSaving(true); setMsg("");
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api"}/admin/users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      setMsg("User created!"); setShowForm(false); fetchUsers();
    } catch (e: any) { setMsg(e.message); }
    setSaving(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api"}/admin/users/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor: Record<string, string> = { ADMIN: "#ef4444", CEO: "#f59e0b", MANAGER: "#6366f1", HR: "#10b981", IT: "#06b6d4", EMPLOYEE: "#64748b", FINANCE: "#8b5cf6" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>User Management</h1>
          <button onClick={() => setShowForm(!showForm)} style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            + New User
          </button>
        </div>

        {msg && <div style={{ background: msg.includes("!") ? "#10b98122" : "#ef444422", border: `1px solid ${msg.includes("!") ? "#10b981" : "#ef4444"}`, borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: msg.includes("!") ? "#10b981" : "#ef4444" }}>{msg}</div>}

        {showForm && (
          <div style={{ background: "#1e1e2e", borderRadius: 12, padding: "1.5rem", border: "1px solid #2d2d44", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#a78bfa" }}>Create New User</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {["name", "email", "password", "department"].map((f) => (
                <div key={f}>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: 4 }}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input type={f === "password" ? "password" : "text"} value={(form as any)[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                    style={{ width: "100%", background: "#0f0f1a", border: "1px solid #2d2d44", borderRadius: 8, padding: "0.5rem 0.75rem", color: "#e2e8f0", fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: 4 }}>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: "100%", background: "#0f0f1a", border: "1px solid #2d2d44", borderRadius: 8, padding: "0.5rem 0.75rem", color: "#e2e8f0", fontSize: "0.9rem" }}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={createUser} disabled={saving} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                {saving ? "Creating..." : "Create User"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: "#2d2d44", color: "#94a3b8", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", background: "#1e1e2e", border: "1px solid #2d2d44", borderRadius: 8, padding: "0.75rem 1rem", color: "#e2e8f0", fontSize: "0.9rem" }} />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading users...</div>
        ) : (
          <div style={{ background: "#1e1e2e", borderRadius: 12, overflow: "hidden", border: "1px solid #2d2d44" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f0f1a" }}>
                  {["Name", "Email", "Role", "Department", "Created", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "0.875rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr key={user.id} style={{ borderTop: "1px solid #2d2d44", background: i % 2 === 0 ? "transparent" : "#ffffff05" }}>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>{user.name}</td>
                    <td style={{ padding: "0.875rem 1rem", color: "#94a3b8", fontSize: "0.9rem" }}>{user.email}</td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ background: `${roleColor[user.role] || "#64748b"}22`, color: roleColor[user.role] || "#64748b", padding: "0.2rem 0.6rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>{user.role}</span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "#94a3b8" }}>{user.department || "—"}</td>
                    <td style={{ padding: "0.875rem 1rem", color: "#64748b", fontSize: "0.85rem" }}>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <button onClick={() => deleteUser(user.id)} style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", padding: "0.25rem 0.75rem", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>No users found</div>}
          </div>
        )}
      </div>
    </div>
  );
}
