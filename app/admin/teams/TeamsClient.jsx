"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast, ToastContainer } from "@/components/Toast";

function formatCurrency(a) {
  if (!a && a !== 0) return "₹0";
  if (a >= 10000000) return `₹${(a / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `₹${(a / 100000).toFixed(1)}L`;
  return `₹${a}`;
}

const roleIcons = { Batsman: "🏏", Bowler: "🎯", "All-rounder": "⭐", Wicketkeeper: "🧤" };

export default function TeamsClient() {
  const { toasts, addToast } = useToast();
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [editTeam, setEditTeam] = useState(null);
  const [pinModal, setPinModal] = useState(null);
  const [form, setForm] = useState({});
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTeams = async () => {
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeams(data.teams || {});
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const handleEditSave = async () => {
    setSaving(true);
    const res = await fetch("/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: editTeam, ...form }),
    });
    if (res.ok) { addToast("Team updated!", "success"); setEditTeam(null); fetchTeams(); }
    else addToast("Failed to update", "error");
    setSaving(false);
  };

  const handlePinReset = async () => {
    if (!newPin || newPin.length < 4) { addToast("PIN must be at least 4 characters", "error"); return; }
    setSaving(true);
    const res = await fetch("/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetPin", teamId: pinModal, newPin }),
    });
    if (res.ok) { addToast("PIN reset successfully!", "success"); setPinModal(null); setNewPin(""); fetchTeams(); }
    else addToast("Failed to reset PIN", "error");
    setSaving(false);
  };

  const handleBudgetReset = async (teamId) => {
    if (!confirm("Reset this team's budget and clear all players? This cannot be undone.")) return;
    const res = await fetch("/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, spent: 0, players: [] }),
    });
    if (res.ok) { addToast("Team reset!", "success"); fetchTeams(); }
    else addToast("Failed", "error");
  };

  if (loading) return (
    <>
      <Navbar role="admin" />
      <div className="loading"><div className="spinner" /> Loading teams...</div>
    </>
  );

  return (
    <>
      <Navbar role="admin" />
      <ToastContainer toasts={toasts} />

      {/* Edit Modal */}
      {editTeam && teams[editTeam] && (
        <div className="modal-overlay" onClick={() => setEditTeam(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit {teams[editTeam].name}</div>
              <button className="modal-close" onClick={() => setEditTeam(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Team Name</label>
              <input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Manager Name</label>
              <input className="input" value={form.manager || ""} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Team Logo (Emoji)</label>
                <input className="input" value={form.logo || ""} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="🐍" />
              </div>
              <div className="form-group">
                <label>Team Color</label>
                <input type="color" value={form.color || "#22c55e"} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ width: "100%", height: 42, border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-secondary)", cursor: "pointer" }} />
              </div>
            </div>
            <div className="form-group">
              <label>Total Budget (₹)</label>
              <input type="number" className="input" step={1000000} value={form.budget || 10000000}
                onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) })} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditTeam(null)}>Cancel</button>
              <button className="btn btn-gold" style={{ flex: 2 }} disabled={saving} onClick={handleEditSave}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Reset Modal */}
      {pinModal && (
        <div className="modal-overlay" onClick={() => setPinModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🔑 Reset PIN</div>
              <button className="modal-close" onClick={() => setPinModal(null)}>✕</button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1rem" }}>
              Set a new PIN for <strong>{teams[pinModal]?.name}</strong>
            </p>
            <div className="form-group">
              <label>New PIN</label>
              <input type="password" className="input" value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN (min 4 chars)"
                style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.1rem" }} />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setPinModal(null); setNewPin(""); }}>Cancel</button>
              <button className="btn btn-gold" style={{ flex: 2 }} disabled={saving || newPin.length < 4} onClick={handlePinReset}>
                {saving ? "Resetting..." : "Reset PIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Teams</h1>
            <p className="page-subtitle">Manage Roaring Vipers and Mighty Mongooses</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          {Object.values(teams).map((team) => {
            const pct = Math.round((team.spent / team.budget) * 100);
            return (
              <div key={team.id} className="card">
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: `${team.color}20`,
                      border: `2px solid ${team.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "2rem",
                    }}>
                      {team.logo}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: team.color }}>
                        {team.name}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>👤 {team.manager}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditTeam(team.id); setForm({ name: team.name, manager: team.manager, logo: team.logo, color: team.color, budget: team.budget }); }}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPinModal(team.id)}>🔑 PIN</button>
                  </div>
                </div>

                {/* Budget */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Budget Used ({pct}%)</span>
                    <span style={{ fontWeight: 700, color: "var(--accent-gold)" }}>
                      {formatCurrency(team.spent)} / {formatCurrency(team.budget)}
                    </span>
                  </div>
                  <div className="budget-bar">
                    <div className="budget-bar-fill" style={{ width: `${pct}%`, background: team.color }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Remaining: {formatCurrency(team.budget - team.spent)}</span>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }} onClick={() => handleBudgetReset(team.id)}>
                      🔄 Reset
                    </button>
                  </div>
                </div>

                {/* Players List */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Players ({team.players.length})
                  </div>
                  {team.players.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
                      No players acquired yet
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 300, overflowY: "auto" }}>
                      {team.players.map((p, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.5rem 0.75rem", borderRadius: "8px", background: "var(--bg-secondary)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span>{roleIcons[p.role] || "🏏"}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{p.name}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{p.role}</div>
                            </div>
                          </div>
                          <span style={{ color: "var(--accent-gold)", fontWeight: 700, fontSize: "0.85rem" }}>
                            {formatCurrency(p.soldFor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
