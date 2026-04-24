"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast, ToastContainer } from "@/components/Toast";

const ROLES = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];
const roleIcons = { Batsman: "🏏", Bowler: "🎯", "All-rounder": "⭐", Wicketkeeper: "🧤" };
const statusColors = { pending: "badge-gray", sold: "badge-green", unsold: "badge-red" };

function formatCurrency(amount) {
  if (!amount) return "₹0";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

const EMPTY_FORM = { name: "", role: "Batsman", basePrice: 1000, country: "India", isTemp: false };

export default function PlayersClient() {
  const { toasts, addToast } = useToast();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState({ role: "", status: "", search: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllInput, setDeleteAllInput] = useState("");

  const fetchPlayers = async () => {
    const res = await fetch("/api/players");
    const data = await res.json();
    setPlayers(data.players || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlayers(); }, []);

  const filtered = players.filter((p) => {
    if (filter.role && p.role !== filter.role) return false;
    if (filter.status && p.status !== filter.status) return false;
    if (filter.search && !p.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => { setEditPlayer(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (p) => { setEditPlayer(p); setForm({ name: p.name, role: p.role, basePrice: p.basePrice, country: p.country || "India", isTemp: p.isTemp }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editPlayer ? "PUT" : "POST";
      const body = editPlayer ? { ...form, id: editPlayer.id } : form;
      const res = await fetch("/api/players", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      addToast(editPlayer ? "Player updated!" : "Player added!", "success");
      setShowModal(false);
      fetchPlayers();
    } catch {
      addToast("Failed to save player", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/players?id=${id}`, { method: "DELETE" });
    if (res.ok) { addToast("Player deleted", "success"); fetchPlayers(); }
    else addToast("Failed to delete", "error");
    setDeleteConfirm(null);
  };

  const handleDeleteAll = async () => {
    if (deleteAllInput !== "YES") {
      addToast("You must type YES to confirm", "error");
      return;
    }
    const res = await fetch("/api/players?all=true", { method: "DELETE" });
    if (res.ok) { addToast("All players deleted", "success"); fetchPlayers(); }
    else addToast("Failed to delete all", "error");
    setDeleteAllConfirm(false);
    setDeleteAllInput("");
  };

  const handleStatusReset = async (player) => {
    const res = await fetch("/api/players", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: player.id, status: "pending", soldTo: null, soldFor: null }),
    });
    if (res.ok) { addToast("Player reset to pending", "success"); fetchPlayers(); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error("JSON must be an array of players");

      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      addToast(`Successfully added ${data.added} players!`, "success");
      fetchPlayers();
    } catch (err) {
      addToast(err.message || "Invalid JSON file", "error");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  return (
    <>
      <Navbar role="admin" />
      <ToastContainer toasts={toasts} />

      {/* Player Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editPlayer ? "Edit Player" : "Add New Player"}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Player Name *</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Virat Kohli" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Role *</label>
                  <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="India" />
                </div>
              </div>
              <div className="form-group">
                <label>Base Price (₹)</label>
                <input className="input" type="number" min={1000} step={1000} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: parseInt(e.target.value) })} />
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>= {formatCurrency(form.basePrice)}</div>
              </div>
              <div className="checkbox-row form-group">
                <input type="checkbox" checked={form.isTemp} onChange={(e) => setForm({ ...form, isTemp: e.target.checked })} id="isTemp" />
                <label htmlFor="isTemp" style={{ marginBottom: 0, cursor: "pointer", textTransform: "none", letterSpacing: "normal", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                  Temporary Player (added just for this session)
                </label>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 2 }} disabled={saving}>
                  {saving ? "Saving..." : editPlayer ? "Save Changes" : "Add Player"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🗑️</div>
              <h3>Delete Player?</h3>
              <p style={{ color: "var(--text-secondary)", margin: "0.75rem 0 1.5rem" }}>
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-red" style={{ flex: 1 }} onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirm */}
      {deleteAllConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteAllConfirm(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
              <h3>Delete ALL Players?</h3>
              <p style={{ color: "var(--text-secondary)", margin: "0.75rem 0 1.5rem" }}>
                This will permanently remove every player from the pool. Type <strong>YES</strong> to confirm.
              </p>
              <input className="input" value={deleteAllInput} onChange={(e) => setDeleteAllInput(e.target.value)} placeholder="Type YES" style={{ marginBottom: "1rem", textAlign: "center", fontWeight: "bold" }} />
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteAllConfirm(false)}>Cancel</button>
                <button className="btn btn-red" style={{ flex: 1 }} onClick={handleDeleteAll} disabled={deleteAllInput !== "YES"}>Delete All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Players</h1>
            <p className="page-subtitle">{players.length} total players in the pool</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button className="btn btn-red btn-ghost" onClick={() => { setDeleteAllConfirm(true); setDeleteAllInput(""); }}>
              🗑️ Delete All
            </button>
            <input type="file" id="jsonUpload" accept=".json" style={{ display: "none" }} onChange={handleFileUpload} />
            <button className="btn btn-ghost" disabled={uploading} onClick={() => document.getElementById("jsonUpload").click()}>
              {uploading ? "Uploading..." : "📂 Upload JSON"}
            </button>
            <button className="btn btn-gold" onClick={openAdd}>+ Add Player</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <input
            className="input" style={{ flex: 1, minWidth: 180 }}
            placeholder="🔍 Search player..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <select className="select" style={{ minWidth: 140 }} value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })}>
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className="select" style={{ minWidth: 140 }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="badge badge-gray">{filtered.length} shown</span>
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading players...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Role</th>
                  <th>Country</th>
                  <th>Base Price</th>
                  <th>Status</th>
                  <th>Sold To / For</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>{roleIcons[p.role] || "🏏"}</span>
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{p.role}</span></td>
                    <td style={{ color: "var(--text-secondary)" }}>{p.country || "—"}</td>
                    <td style={{ color: "var(--accent-gold)", fontWeight: 600 }}>{formatCurrency(p.basePrice)}</td>
                    <td><span className={`badge ${statusColors[p.status]}`}>{p.status}</span></td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {p.soldTo ? (
                        <span style={{ color: "var(--accent-green)" }}>
                          {p.soldTo === "vipers" ? "🐍" : "🦡"} {formatCurrency(p.soldFor)}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      {p.isTemp ? <span className="badge badge-blue">Temp</span> : <span className="badge badge-gray">Regular</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        {p.status !== "pending" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleStatusReset(p)} title="Reset to pending">↩</button>
                        )}
                        <button className="btn btn-red btn-sm" onClick={() => setDeleteConfirm(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No players found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
