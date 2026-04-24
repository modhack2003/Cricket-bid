"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast, ToastContainer } from "@/components/Toast";
import AuctionLiveView from "@/components/AuctionLiveView";

const ROLES = ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"];

function formatCurrency(a) {
  if (!a) return "₹0";
  if (a >= 10000000) return `₹${(a / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `₹${(a / 100000).toFixed(1)}L`;
  if (a >= 1000) return `₹${(a / 1000).toFixed(0)}K`;
  return `₹${a}`;
}

export default function AuctionControlClient() {
  const { toasts, addToast } = useToast();
  const [auctionState, setAuctionState] = useState(null);
  const [auctionLog, setAuctionLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [conditions, setConditions] = useState({
    roles: [],
    minBasePrice: 0,
    maxBasePrice: 9999999,
    excludeSold: true,
    lastPlayerIds: [],
    maxPlayersPerTeam: 15,
  });
  const [allPlayers, setAllPlayers] = useState([]);
  const [manualSellTeam, setManualSellTeam] = useState("vipers");
  const [manualSellPrice, setManualSellPrice] = useState("");

  const fetchState = async () => {
    const [aRes, lRes] = await Promise.all([
      fetch("/api/auction"),
      fetch("/api/auction/log"),
    ]);
    const [a, l] = await Promise.all([aRes.json(), lRes.json()]);
    setAuctionState(a.state);
    if (a.state?.conditions) setConditions(a.state.conditions);
    if (a.state?.currentBid) setManualSellPrice(a.state.currentBid);
    else if (a.state?.currentPlayer) setManualSellPrice(a.state.currentPlayer.basePrice);
    setAuctionLog(l.log || []);
    // Also fetch player list for Priority Last selector
    const pRes = await fetch("/api/players");
    const pData = await pRes.json();
    setAllPlayers(pData.players || []);
    setLoading(false);
  };

  useEffect(() => { fetchState(); }, []);

  const action = async (act, extra = {}) => {
    setActing(true);
    try {
      const res = await fetch("/api/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, conditions, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Action failed", "error");
      } else {
        setAuctionState(data.state);
        const msgs = {
          start: "🏏 Auction started! Player selected randomly.",
          next: "➡️ Next player selected!",
          sell: "🎉 Player sold!",
          unsold: "❌ Player marked as unsold",
          pause: "⏸ Auction paused",
          resume: "▶️ Auction resumed",
          reset: "🔄 Auction reset",
        };
        addToast(msgs[act] || "Done", "success");
        if (["sell", "unsold"].includes(act)) fetchState();
      }
    } catch {
      addToast("Network error", "error");
    } finally {
      setActing(false);
    }
  };

  const toggleRole = (r) => {
    setConditions((c) => ({
      ...c,
      roles: c.roles.includes(r) ? c.roles.filter((x) => x !== r) : [...c.roles, r],
    }));
  };

  const toggleLastPlayer = (id) => {
    setConditions((c) => ({
      ...c,
      lastPlayerIds: c.lastPlayerIds?.includes(id)
        ? c.lastPlayerIds.filter((x) => x !== id)
        : [...(c.lastPlayerIds || []), id],
    }));
  };

  const saveConditions = async () => {
    await action("updateConditions", { conditions });
    addToast("Conditions saved", "success");
    setShowConditions(false);
  };

  const status = auctionState?.status;
  const isIdle = status === "idle" || !status;
  const isBidding = status === "bidding";
  const isPaused = status === "paused";
  const isSold = status === "sold";
  const isUnsold = status === "unsold";
  const canStart = isIdle || isSold || isUnsold;

  return (
    <>
      <Navbar role="admin" />
      <ToastContainer toasts={toasts} />
      <div className="admin-layout">
        {/* Left Panel - Controls */}
        <div className="sidebar auction-sidebar" style={{
          flexShrink: 0,
          background: "var(--bg-secondary)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}>
          <div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", marginBottom: "0.25rem" }}>⚙️ Auction Control</h2>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Admin panel — control the live auction</div>
          </div>

          {/* Status */}
          <div className="card" style={{
            background: isBidding ? "rgba(245,197,24,0.08)" : "var(--bg-card)",
            border: isBidding ? "1px solid rgba(245,197,24,0.4)" : "1px solid var(--border)",
            padding: "1rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              {isBidding && <div className="live-dot" />}
              <span style={{ fontWeight: 700, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {status || "idle"}
              </span>
            </div>
            {auctionState?.currentPlayer && (
              <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{auctionState.currentPlayer.name}</strong>
                <br />
                {auctionState.currentPlayer.role} • Base: {formatCurrency(auctionState.currentPlayer.basePrice)}
                {auctionState.currentBid > 0 && (
                  <><br />Current bid: <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{formatCurrency(auctionState.currentBid)}</span>
                    {auctionState.currentBidder && ` (${auctionState.currentBidder === "vipers" ? "🐍" : "🦡"})`}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Main Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {canStart && (
              <button className="btn btn-gold btn-lg" style={{ width: "100%", justifyContent: "center" }}
                disabled={acting} onClick={() => action(isIdle ? "start" : "next")}>
                {acting ? "Loading..." : isIdle ? "🚀 Start Auction (Random Player)" : "➡️ Next Player (Random)"}
              </button>
            )}
            {(isBidding || isPaused) && (
              <div className="card" style={{ padding: "0.75rem", background: "var(--bg-secondary)", border: "1px solid var(--border)", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>Admin Override: Assign Player</div>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <select className="select" value={manualSellTeam} onChange={(e) => setManualSellTeam(e.target.value)} style={{ flex: 1, padding: "0.4rem" }}>
                    <option value="vipers">🐍 Roaring Vipers</option>
                    <option value="mongooses">🦡 Mighty Mongooses</option>
                  </select>
                  <input type="number" className="input" style={{ width: 100, padding: "0.4rem" }} value={manualSellPrice} onChange={(e) => setManualSellPrice(parseInt(e.target.value) || 0)} placeholder="Price" />
                </div>
                <button className="btn btn-green" style={{ width: "100%", justifyContent: "center" }}
                  disabled={acting || !manualSellPrice} 
                  onClick={() => action("manualSell", { teamId: manualSellTeam, price: manualSellPrice })}>
                  ✅ Assign Player
                </button>
              </div>
            )}
            {(isBidding || isPaused) && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center", border: "1px solid var(--border)" }}
                  disabled={acting} onClick={() => action("skip")}>
                  ⏭️ Skip Player
                </button>
                <button className="btn btn-red" style={{ flex: 1, justifyContent: "center" }}
                  disabled={acting} onClick={() => action("unsold")}>
                  ❌ Mark Unsold
                </button>
              </div>
            )}
            {!isIdle && (
              <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }}
                disabled={acting} onClick={() => { if (confirm("Reset entire auction? This clears the current session.")) action("reset"); }}>
                🔄 Reset Auction
              </button>
            )}
          </div>

          {/* Timer Setting Removed */}
          {/* Conditions */}
          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>🎯 Selection Conditions</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConditions(!showConditions)}>
                {showConditions ? "Close" : "Edit"}
              </button>
            </div>

            {/* Current conditions summary */}
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {conditions.roles.length > 0 ? `Roles: ${conditions.roles.join(", ")}` : "All roles"}
              {" • "}
              {conditions.excludeSold ? "Skip sold" : "Include sold"}
              {conditions.minBasePrice > 0 && ` • Min: ${formatCurrency(conditions.minBasePrice)}`}
              {conditions.maxBasePrice < 9999999 && ` • Max: ${formatCurrency(conditions.maxBasePrice)}`}
              {" • "}
              Max Players/Team: {conditions.maxPlayersPerTeam || 15}
              {conditions.lastPlayerIds?.length > 0 && (
                <span style={{ color: "var(--accent-red)" }}> • {conditions.lastPlayerIds.length} player(s) set to come last</span>
              )}
            </div>

            {showConditions && (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ marginBottom: "0.4rem" }}>Filter by Role</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {ROLES.map((r) => (
                      <button key={r} onClick={() => toggleRole(r)}
                        className="btn btn-sm"
                        style={{
                          background: conditions.roles.includes(r) ? "rgba(245,197,24,0.2)" : "transparent",
                          border: conditions.roles.includes(r) ? "1px solid var(--accent-gold)" : "1px solid var(--border)",
                          color: conditions.roles.includes(r) ? "var(--accent-gold)" : "var(--text-secondary)",
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Leave all unselected to allow any role</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem" }}>
                  <div>
                    <label>Min Base (₹)</label>
                    <input type="number" className="input" value={conditions.minBasePrice} step={50000}
                      onChange={(e) => setConditions({ ...conditions, minBasePrice: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label>Max Base (₹)</label>
                    <input type="number" className="input" value={conditions.maxBasePrice} step={50000}
                      onChange={(e) => setConditions({ ...conditions, maxBasePrice: parseInt(e.target.value) || 9999999 })} />
                  </div>
                </div>

                <div>
                  <label>Max Players Per Team</label>
                  <input type="number" className="input" value={conditions.maxPlayersPerTeam || 15} min={1} max={50}
                    onChange={(e) => setConditions({ ...conditions, maxPlayersPerTeam: parseInt(e.target.value) || 15 })} />
                </div>

                <div className="checkbox-row">
                  <input type="checkbox" id="excSold" checked={conditions.excludeSold}
                    onChange={(e) => setConditions({ ...conditions, excludeSold: e.target.checked })} />
                  <label htmlFor="excSold" style={{ marginBottom: 0, textTransform: "none", letterSpacing: "normal", fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer" }}>
                    Skip already sold/unsold players
                  </label>
                </div>

                {/* Priority Last */}
                <div>
                  <label style={{ marginBottom: "0.5rem", color: "var(--accent-red)" }}>🔒 Priority Last Players</label>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    These players will only be selected after all other eligible players are done.
                  </div>
                  <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {allPlayers.filter((p) => p.status === "pending").length === 0 && (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No pending players</div>
                    )}
                    {allPlayers.filter((p) => p.status === "pending").map((p) => {
                      const isLast = conditions.lastPlayerIds?.includes(p.id);
                      return (
                        <div key={p.id}
                          onClick={() => toggleLastPlayer(p.id)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer",
                            background: isLast ? "rgba(239,68,68,0.12)" : "var(--bg-secondary)",
                            border: isLast ? "1px solid rgba(239,68,68,0.4)" : "1px solid transparent",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{p.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{p.role}</span>
                            {isLast && <span style={{ fontSize: "0.65rem", color: "var(--accent-red)", fontWeight: 700 }}>LAST</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button className="btn btn-gold" onClick={saveConditions} style={{ width: "100%" }}>
                  Save Conditions
                </button>
              </div>
            )}
          </div>

          {/* Auction Log */}
          {auctionLog.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Auction Log
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {auctionLog.slice(0, 10).map((entry, i) => (
                  <div key={i} style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", background: "var(--bg-card)", fontSize: "0.8rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>{entry.player?.name}</span>
                      {entry.type === "sold" ? (
                        <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>{formatCurrency(entry.soldFor)}</span>
                      ) : (
                        <span className="badge badge-red" style={{ fontSize: "0.65rem" }}>Unsold</span>
                      )}
                    </div>
                    {entry.type === "sold" && (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        → {entry.soldTo === "vipers" ? "🐍 Vipers" : "🦡 Mongooses"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Live View */}
        <div className="main-content">
          <h3 style={{ marginBottom: "1.5rem", color: "var(--text-secondary)", fontFamily: "Inter", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Live Auction Preview
          </h3>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <AuctionLiveView canBid={false} />
          </div>
        </div>
      </div>
    </>
  );
}
