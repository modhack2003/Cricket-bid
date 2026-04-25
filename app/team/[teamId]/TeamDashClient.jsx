"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast, ToastContainer } from "@/components/Toast";
import AuctionLiveView from "@/components/AuctionLiveView";

function formatCurrency(a) {
  if (!a && a !== 0) return "₹0";
  if (a >= 10000000) return `₹${(a / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `₹${(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `₹${(a / 1000).toFixed(0)}K`;
  return `₹${a}`;
}

const ROLE_MAP = { vipers: "team1", mongooses: "team2" };

export default function TeamDashClient({ teamId }) {
  const { toasts, addToast } = useToast();
  const [team, setTeam] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passing, setPassing] = useState(false);

  const fetchTeam = async () => {
    const [tRes, aRes] = await Promise.all([
      fetch("/api/teams"),
      fetch("/api/auction"),
    ]);
    const [tData, aData] = await Promise.all([tRes.json(), aRes.json()]);
    setTeam(tData.teams?.[teamId]);
    setAuctionState(aData.state);
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleBid = async (amount) => {
    const res = await fetch("/api/auction/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) {
      addToast(data.error || "Bid failed", "error");
    } else {
      addToast(`💰 Bid placed: ${formatCurrency(amount)}`, "success");
      fetchTeam();
    }
  };

  const handlePassToOpponent = async () => {
    const opponent = teamId === "vipers" ? "🦡 Mongooses" : "🐍 Vipers";
    const price = auctionState?.currentBid || auctionState?.currentPlayer?.basePrice;
    if (!confirm(`Pass ${auctionState?.currentPlayer?.name} to ${opponent} at ${formatCurrency(price)}?`)) return;
    setPassing(true);
    const res = await fetch("/api/auction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "passToOpponent" }),
    });
    const data = await res.json();
    if (!res.ok) addToast(data.error || "Failed", "error");
    else { addToast("🔄 Player passed to opponent!", "success"); fetchTeam(); }
    setPassing(false);
  };

  if (loading || !team) return (
    <>
      <Navbar role={ROLE_MAP[teamId]} teamId={teamId} />
      <div className="loading"><div className="spinner" /> Loading...</div>
    </>
  );

  const remaining = team.budget - team.spent;
  const pct = Math.round((team.spent / team.budget) * 100);

  return (
    <>
      <Navbar role={ROLE_MAP[teamId]} teamId={teamId} teamName={team.name} />
      <ToastContainer toasts={toasts} />

      {/* Team Header */}
      <div style={{
        background: `linear-gradient(135deg, ${team.color}15, transparent)`,
        borderBottom: `1px solid ${team.color}30`,
        padding: "1.5rem",
      }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: `${team.color}20`, border: `2px solid ${team.color}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
              }}>
                {team.logo}
              </div>
              <div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.6rem", fontWeight: 700, color: team.color }}>
                  {team.name}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", gap: "0.75rem" }}>
                  <span>👔 {team.players.find(p => p.id === team.managerId)?.name || "No Manager"}</span>
                  <span>⭐ {team.players.find(p => p.id === team.captainId)?.name || "No Captain"}</span>
                  <span>• {team.players.length} players</span>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Remaining Budget</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--accent-gold)" }}>
                  {formatCurrency(remaining)}
                </div>
                <div style={{ width: 180 }}>
                  <div className="budget-bar">
                    <div className="budget-bar-fill" style={{ width: `${pct}%`, background: team.color }} />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {formatCurrency(team.spent)} spent of {formatCurrency(team.budget)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div className="layout-main-sidebar">

          {/* Live Auction */}
          <div>
            {/* Pass to Opponent button — visible when opponent is winning */}
            {auctionState?.status === "bidding" &&
             auctionState?.currentBidder &&
             auctionState.currentBidder !== teamId && (
              <div style={{
                marginBottom: "1rem",
                padding: "0.85rem 1rem",
                borderRadius: 10,
                background: "rgba(249,115,22,0.10)",
                border: "1px solid rgba(249,115,22,0.45)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f97316" }}>
                    Opponent is highest bidder
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Pass {auctionState.currentPlayer?.name} to them at {formatCurrency(auctionState.currentBid)}?
                  </div>
                </div>
                <button
                  className="btn"
                  style={{
                    background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.6)",
                    color: "#f97316", fontWeight: 700, whiteSpace: "nowrap",
                  }}
                  disabled={passing}
                  onClick={handlePassToOpponent}
                >
                  {passing ? "Passing..." : "🔄 Pass to Opponent"}
                </button>
              </div>
            )}
            <AuctionLiveView canBid={true} myTeamId={teamId} onBid={handleBid} />
          </div>

          {/* My Players Sidebar */}
          <div style={{ position: "sticky", top: "calc(57px + 2rem)" }}>
            <div className="card">
              <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>
                🏏 My Squad ({team.players.length})
              </h3>
              {team.players.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                  No players yet. Start bidding!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 450, overflowY: "auto" }}>
                  {team.players.map((p, i) => (
                    <div key={i} style={{
                      padding: "0.6rem 0.75rem", borderRadius: "8px",
                      background: "var(--bg-secondary)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{p.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{p.role}</div>
                      </div>
                      <span style={{ color: "var(--accent-gold)", fontWeight: 700, fontSize: "0.82rem" }}>
                        {formatCurrency(p.soldFor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="divider" />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Spent</span>
                <span style={{ fontWeight: 700, color: "var(--accent-gold)" }}>{formatCurrency(team.spent)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
