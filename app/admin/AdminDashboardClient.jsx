"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast, ToastContainer } from "@/components/Toast";
import Link from "next/link";

function formatCurrency(amount) {
  if (!amount && amount !== 0) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export default function AdminDashboardClient() {
  const { toasts, addToast } = useToast();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [auctionState, setAuctionState] = useState(null);
  const [auctionLog, setAuctionLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [pRes, tRes, aRes, lRes] = await Promise.all([
          fetch("/api/players"),
          fetch("/api/teams"),
          fetch("/api/auction"),
          fetch("/api/auction/log"),
        ]);
        const [p, t, a, l] = await Promise.all([pRes.json(), tRes.json(), aRes.json(), lRes.json()]);
        setPlayers(p.players || []);
        setTeams(t.teams || {});
        setAuctionState(a.state);
        setAuctionLog(l.log || []);
      } catch {
        addToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const stats = {
    total: players.length,
    // skipped players re-enter the pool, so count them alongside pending
    pending: players.filter((p) => p.status === "pending" || p.status === "skipped").length,
    sold: players.filter((p) => p.status === "sold").length,
    unsold: players.filter((p) => p.status === "unsold").length,
    temp: players.filter((p) => p.isTemp).length,
  };

  const vipers = teams.vipers;
  const mongooses = teams.mongooses;

  if (loading) return (
    <>
      <Navbar role="admin" />
      <div className="loading"><div className="spinner" /> Loading dashboard...</div>
    </>
  );

  return (
    <>
      <Navbar role="admin" />
      <ToastContainer toasts={toasts} />
      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">⚙️ Admin Dashboard</h1>
            <p className="page-subtitle">Manage the Maar Katar Tournament Auction</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/admin/auction" className="btn btn-gold">🏏 Auction Control</Link>
            <Link href="/admin/players" className="btn btn-ghost">Manage Players</Link>
          </div>
        </div>

        {/* Auction Status Banner */}
        {auctionState && (
          <div className="card" style={{
            marginBottom: "2rem",
            background: auctionState.status === "bidding"
              ? "linear-gradient(135deg, rgba(245,197,24,0.1), rgba(245,197,24,0.05))"
              : "var(--bg-card)",
            border: auctionState.status === "bidding" ? "1px solid rgba(245,197,24,0.4)" : "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {auctionState.status === "bidding" && <div className="live-dot" />}
                <div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.3rem", fontWeight: 700 }}>
                    {auctionState.status === "bidding" ? "🔥 Auction Live" :
                      auctionState.status === "sold" ? "🎉 Player Sold" :
                        auctionState.status === "paused" ? "⏸ Paused" : "💤 No Active Auction"}
                  </div>
                  {auctionState.currentPlayer && (
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                      Current: <strong style={{ color: "var(--text-primary)" }}>{auctionState.currentPlayer.name}</strong>
                      {" — "}{formatCurrency(auctionState.currentBid)}
                      {auctionState.currentBidder && ` (${auctionState.currentBidder === "vipers" ? "🐍 Vipers" : "🦡 Mongooses"})`}
                    </div>
                  )}
                </div>
              </div>
              <Link href="/admin/auction" className="btn btn-gold btn-sm">Go to Auction →</Link>
            </div>
          </div>
        )}

        {/* Player Stats */}
        <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem", color: "var(--text-secondary)", fontFamily: "Inter" }}>
          Players Overview
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total Players", value: stats.total, color: "var(--accent-gold)" },
            { label: "Pending", value: stats.pending, color: "var(--text-secondary)" },
            { label: "Sold", value: stats.sold, color: "var(--accent-green)" },
            { label: "Unsold", value: stats.unsold, color: "var(--accent-red)" },
            { label: "Temp Players", value: stats.temp, color: "var(--accent-blue)" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Team Summary */}
        <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem", color: "var(--text-secondary)", fontFamily: "Inter" }}>
          Team Summary
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          {[vipers, mongooses].filter(Boolean).map((team) => {
            const pct = Math.round((team.spent / team.budget) * 100);
            return (
              <div key={team.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "2rem" }}>{team.logo}</span>
                  <div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: team.color }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      👔 {team.managerId ? (team.players.find(p => p.id === team.managerId)?.name || "Manager set") : "No Manager"}
                      {" · "}
                      ⭐ {team.captainId ? (team.players.find(p => p.id === team.captainId)?.name || "Captain set") : "No Captain"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div><div className="stat-label">Players</div><div className="stat-value" style={{ fontSize: "1.5rem" }}>{team.players.length}</div></div>
                  <div><div className="stat-label">Spent</div><div className="stat-value" style={{ fontSize: "1.2rem", color: "var(--accent-gold)" }}>{formatCurrency(team.spent)}</div></div>
                </div>
                <div className="budget-bar">
                  <div className="budget-bar-fill" style={{ width: `${pct}%`, background: team.color }} />
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                  Remaining: {formatCurrency(team.budget - team.spent)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Auction Log */}
        {auctionLog.length > 0 && (() => {
          // Filter to only meaningful sold/unsold/skipped entries (exclude zero-cost pre-assigns)
          const meaningful = auctionLog.filter(e =>
            e.type === "sold" ? e.soldFor > 0 : true
          );
          if (meaningful.length === 0) return null;

          const teamName = (id) => id === "vipers" ? "🐍 Vipers" : id === "mongooses" ? "🦡 Mongooses" : id;
          const relTime = (ts) => {
            if (!ts) return "";
            const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
            if (diff < 60) return `${diff}s ago`;
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          };
          const entryIcon = (e) => e.type === "sold" ? "🎉" : e.type === "skipped" ? "⏭️" : "❌";
          const entryLabel = (e) => e.type === "sold" ? "Sold" : e.type === "skipped" ? "Skipped" : "Unsold";
          const entryColor = (e) => e.type === "sold" ? "var(--accent-green)" : "var(--accent-red)";

          return (
            <>
              <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem", color: "var(--text-secondary)", fontFamily: "Inter" }}>
                Recent Auction Activity
              </h2>
              <div className="card">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {meaningful.slice(0, 8).map((entry, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--bg-secondary)",
                      flexWrap: "wrap", gap: "0.5rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{entryIcon(entry)}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            {entry.player?.name || "Unknown Player"}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {entry.player?.role}{entry.player?.role && " · "}{relTime(entry.ts)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {entry.type === "sold" ? (
                          <>
                            <div style={{ color: entryColor(entry), fontWeight: 700, fontSize: "0.9rem" }}>
                              {formatCurrency(entry.soldFor)}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              → {teamName(entry.soldTo)}
                            </div>
                          </>
                        ) : (
                          <span style={{
                            fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                            borderRadius: 4, background: "rgba(239,68,68,0.12)", color: "var(--accent-red)",
                          }}>
                            {entryLabel(entry)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
