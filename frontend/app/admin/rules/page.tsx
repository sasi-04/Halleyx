"use client";
import { useState, useEffect, useCallback } from "react";

interface Rule {
  id: string;
  name: string;
  description?: string;
  request_type?: string;
  condition: string;
  action: string;
  priority: number;
  is_enabled: boolean;
  created_at: string;
}

export default function AdminRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", condition: "", action: "", priority: "1", request_type: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/automation-rules`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setRules(Array.isArray(d) ? d : d.rules || []);
    } catch { setRules([]); }
    setLoading(false);
  }, [token, BASE]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const createRule = async () => {
    setSaving(true); setMsg("");
    try {
      const r = await fetch(`${BASE}/admin/automation-rules`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, priority: parseInt(form.priority) }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      setMsg("Rule created!"); setShowForm(false); fetchRules();
    } catch (e: any) { setMsg(e.message); }
    setSaving(false);
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    await fetch(`${BASE}/admin/automation-rules/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: !enabled }),
    });
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await fetch(`${BASE}/admin/automation-rules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchRules();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(90deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>Automation Rules</h1>
          <button onClick={() => setShowForm(!showForm)} style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>+ New Rule</button>
        </div>

        {msg && <div style={{ background: msg.includes("!") ? "#10b98122" : "#ef444422", border: `1px solid ${msg.includes("!") ? "#10b981" : "#ef4444"}`, borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", color: msg.includes("!") ? "#10b981" : "#ef4444" }}>{msg}</div>}

        {showForm && (
          <div style={{ background: "#1e1e2e", borderRadius: 12, padding: "1.5rem", border: "1px solid #2d2d44", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#a78bfa" }}>Create New Rule</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[["name", "Rule Name"], ["description", "Description"], ["condition", "Condition Expression"], ["action", "Action"], ["priority", "Priority (number)"], ["request_type", "Request Type (expense/onboarding)"]].map(([field, label]) => (
                <div key={field}>
                  <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    style={{ width: "100%", background: "#0f0f1a", border: "1px solid #2d2d44", borderRadius: 8, padding: "0.5rem 0.75rem", color: "#e2e8f0", fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={createRule} disabled={saving} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                {saving ? "Creating..." : "Create Rule"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: "#2d2d44", color: "#94a3b8", border: "none", padding: "0.6rem 1.5rem", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>Loading rules...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {rules.map((rule) => (
              <div key={rule.id} style={{ background: "#1e1e2e", borderRadius: 12, padding: "1.25rem", border: `1px solid ${rule.is_enabled ? "#6366f133" : "#2d2d44"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem" }}>{rule.name}</span>
                      <span style={{ background: rule.is_enabled ? "#10b98122" : "#64748b22", color: rule.is_enabled ? "#10b981" : "#64748b", padding: "0.15rem 0.5rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 }}>
                        {rule.is_enabled ? "ENABLED" : "DISABLED"}
                      </span>
                      {rule.request_type && <span style={{ background: "#6366f122", color: "#6366f1", padding: "0.15rem 0.5rem", borderRadius: 6, fontSize: "0.75rem" }}>{rule.request_type}</span>}
                    </div>
                    {rule.description && <div style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{rule.description}</div>}
                    <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.8rem" }}>
                      <span><span style={{ color: "#64748b" }}>Condition: </span><code style={{ color: "#a78bfa", background: "#0f0f1a", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{rule.condition}</code></span>
                      <span><span style={{ color: "#64748b" }}>Action: </span><code style={{ color: "#10b981", background: "#0f0f1a", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{rule.action}</code></span>
                      <span style={{ color: "#64748b" }}>Priority: {rule.priority}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                    <button onClick={() => toggleRule(rule.id, rule.is_enabled)} style={{ background: rule.is_enabled ? "#f59e0b22" : "#10b98122", color: rule.is_enabled ? "#f59e0b" : "#10b981", border: `1px solid ${rule.is_enabled ? "#f59e0b44" : "#10b98144"}`, padding: "0.3rem 0.75rem", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" }}>
                      {rule.is_enabled ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", padding: "0.3rem 0.75rem", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {rules.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>No automation rules found</div>}
          </div>
        )}
      </div>
    </div>
  );
}
