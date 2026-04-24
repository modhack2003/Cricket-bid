"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast, ToastContainer } from "@/components/Toast";
import PlayerCard from "@/components/PlayerCard";

function formatCurrency(a) {
  if (!a && a !== 0) return "₹0";
  if (a >= 10000000) return `₹${(a / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `₹${(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `₹${(a / 1000).toFixed(0)}K`;
  return `₹${a}`;
}

const ROLE_MAP = { vipers: "team1", mongooses: "team2" };
const roleIcons = { Batsman: "🏏", Bowler: "🎯", "All-rounder": "⭐", Wicketkeeper: "🧤" };

export default function TeamProfileClient({ teamId }) {
  const { toasts, addToast } = useToast();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState([]);

  const fetchTeamAndPlayers = async () => {
    const [tRes, pRes] = await Promise.all([
      fetch("/api/teams"),
      fetch("/api/players")
    ]);
    const tData = await tRes.json();
    const pData = await pRes.json();
    
    const t = tData.teams?.[teamId];
    setTeam(t);
    setAvailablePlayers(pData.players.filter(p => p.status === "pending"));
    
    if (t) setForm({ managerId: t.managerId || "", captainId: t.captainId || "", logo: t.logo, color: t.color });
    setLoading(false);
  };

  useEffect(() => { fetchTeamAndPlayers(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { addToast("Profile updated!", "success"); setEditing(false); fetchTeamAndPlayers(); }
    else addToast(data.error || "Failed to update", "error");
    setSaving(false);
  };

  if (loading || !team) return (
    <>
      <Navbar role={ROLE_MAP[teamId]} teamId={teamId} />
      <div className="loading"><div className="spinner" /> Loading...</div>
    </>
  );

  const remaining = team.budget - team.spent;
  const pct = Math.round((team.spent / team.budget) * 100);

  const byRole = {};
  team.players.forEach((p) => {
    if (!byRole[p.role]) byRole[p.role] = [];
    byRole[p.role].push(p);
  });

  return (
    <>
      <Navbar role={ROLE_MAP[teamId]} teamId={teamId} teamName={team.name} />
      <ToastContainer toasts={toasts} />

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        {/* Team Profile Card */}
        <div className="card" style={{
          background: `linear-gradient(135deg, ${team.color}12 0%, var(--bg-card) 100%)`,
          border: `1px solid ${team.color}30`,
          marginBottom: "2rem",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
            {/* Team Info */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              {editing ? (
                <div style={{ textAlign: "center" }}>
                  <input
                    className="input"
                    value={form.logo}
                    onChange={(e) => setForm({ ...form, logo: e.target.value })}
                    style={{ width: 80, fontSize: "2rem", textAlign: "center", padding: "0.5rem" }}
                    placeholder="🐍"
                  />
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Logo (emoji)</div>
                </div>
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: `${team.color}20`, border: `3px solid ${team.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
                  boxShadow: `0 0 30px ${team.color}30`,
                }}>
                  {team.logo}
                </div>
              )}

              <div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "2rem", fontWeight: 700, color: team.color, marginBottom: "0.3rem" }}>
                  {team.name}
                </div>
                {editing ? (
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div>
                      <label style={{ fontSize: "0.72rem" }}>Manager</label>
                      <select className="select" value={form.managerId || ""} onChange={(e) => setForm({ ...form, managerId: e.target.value })} style={{ padding: "0.4rem 0.7rem", maxWidth: 160 }}>
                        <option value="">None</option>
                        {team.managerId && <option value={team.managerId}>{team.players.find(p => p.id === team.managerId)?.name} (Current)</option>}
                        {availablePlayers.map(p => <option key={p.id} value={p.id} disabled={p.id === form.captainId}>{p.name} ({formatCurrency(p.basePrice)})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem" }}>Captain</label>
                      <select className="select" value={form.captainId || ""} onChange={(e) => setForm({ ...form, captainId: e.target.value })} style={{ padding: "0.4rem 0.7rem", maxWidth: 160 }}>
                        <option value="">None</option>
                        {team.captainId && <option value={team.captainId}>{team.players.find(p => p.id === team.captainId)?.name} (Current)</option>}
                        {availablePlayers.map(p => <option key={p.id} value={p.id} disabled={p.id === form.managerId}>{p.name} ({formatCurrency(p.basePrice)})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.72rem" }}>Color</label>
                      <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                        style={{ width: 48, height: 38, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", gap: "1rem" }}>
                    <span>👔 Manager: {team.players.find(p => p.id === team.managerId)?.name || "Not assigned"}</span>
                    <span>⭐ Captain: {team.players.find(p => p.id === team.captainId)?.name || "Not assigned"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {editing ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn btn-gold" disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save"}</button>
                </>
              ) : (
                <button className="btn btn-ghost" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
              )}
            </div>
          </div>

          {/* Budget Stats */}
          <div className="divider" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.5rem" }}>
            {[
              { label: "Players", value: team.players.length, color: team.color },
              { label: "Total Budget", value: formatCurrency(team.budget), color: "var(--text-primary)" },
              { label: "Spent", value: formatCurrency(team.spent), color: "var(--accent-red)" },
              { label: "Remaining", value: formatCurrency(remaining), color: "var(--accent-green)" },
            ].map((s) => (
              <div key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <div className="budget-bar" style={{ height: 10 }}>
              <div className="budget-bar-fill" style={{ width: `${pct}%`, background: team.color }} />
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>{pct}% budget used</div>
          </div>
        </div>

        {/* Players by Role */}
        {team.players.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏏</div>
            <div style={{ color: "var(--text-muted)", fontSize: "1rem" }}>No players acquired yet. Head to the auction to start bidding!</div>
          </div>
        ) : (
          Object.entries(byRole).map(([role, players]) => (
            <div key={role} style={{ marginBottom: "2rem" }}>
              <h2 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>{roleIcons[role]}</span> {role}s ({players.length})
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                {players.map((p, i) => (
                  <PlayerCard key={i} player={{ ...p, status: "sold" }} compact />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
