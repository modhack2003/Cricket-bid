"use client";
import { useEffect, useState, useRef, memo } from "react";

const roleIcons = { Batsman: "🏏", Bowler: "🎯", "All-rounder": "⭐", Wicketkeeper: "🧤" };

function formatCurrency(amount) {
  if (!amount) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

const TEAM_STYLES = {
  vipers: { name: "Roaring Vipers", icon: "🐍", color: "#22c55e" },
  mongooses: { name: "Mighty Mongooses", icon: "🦡", color: "#f59e0b" },
};

export default function AuctionLiveView({ onBid, canBid = false, myTeamId = null }) {
  const [data, setData] = useState(null);
  const [bidKey, setBidKey] = useState(0);
  const prevBidRef = useRef(null);

  useEffect(() => {
    let es = null;
    let reconnectTimeout = null;
    let retryDelay = 1000;

    const connect = () => {
      es = new EventSource("/api/auction/stream");
      es.onmessage = (e) => {
        retryDelay = 1000;
        try {
          const d = JSON.parse(e.data);
          setData(d);

          // Detect new bid
          if (prevBidRef.current !== d.state?.currentBid) {
            prevBidRef.current = d.state?.currentBid;
            setBidKey((k) => k + 1);
          }
        } catch (err) {
          console.error("Failed to parse live auction data:", err);
        }
      };
      es.onerror = (err) => {
        console.error("Live auction stream error. Reconnecting in", retryDelay, "ms...", err);
        es.close();
        reconnectTimeout = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
    };

    connect();

    return () => {
      if (es) es.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  if (!data) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Connecting to live auction...</span>
      </div>
    );
  }

  const { state, teams } = data;
  const statusText = {
    idle: "Waiting for auction to start...",
    bidding: "🔥 BIDDING LIVE",
    paused: "⏸ Auction Paused",
    sold: "🎉 SOLD!",
    unsold: "❌ Unsold",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Current Player */}
      <div className="player-card-big animate-glow" style={{ position: "relative" }}>
        {/* Live indicator */}
        {state.status === "bidding" && (
          <div style={{ position: "absolute", top: "1.2rem", right: "1.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div className="live-dot" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-red)", textTransform: "uppercase", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        )}

        {state.currentPlayer ? (
          <>
            <div className="player-avatar">{roleIcons[state.currentPlayer.role] || "🏏"}</div>
            <div className="player-name-big">{state.currentPlayer.name}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge badge-gray">{state.currentPlayer.role}</span>
              <span className="badge badge-gold">Base: {formatCurrency(state.currentPlayer.basePrice)}</span>
              {state.currentPlayer.country && <span className="badge badge-blue">{state.currentPlayer.country}</span>}
            </div>

            {/* Current Bid */}
            <div key={bidKey} className="current-bid-display bid-pulse">
              {formatCurrency(state.currentBid)}
            </div>

            {state.currentBidder && (
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Highest bidder: </span>
                <span style={{ color: TEAM_STYLES[state.currentBidder]?.color, fontWeight: 700 }}>
                  {TEAM_STYLES[state.currentBidder]?.icon} {TEAM_STYLES[state.currentBidder]?.name}
                </span>
              </div>
            )}

            {/* Status */}
            <div style={{ marginBottom: "1rem" }}>
              {state.status === "sold" ? (
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-green)" }}>
                  🎉 SOLD to {TEAM_STYLES[state.currentBidder]?.icon} {TEAM_STYLES[state.currentBidder]?.name} for {formatCurrency(state.currentBid)}!
                </div>
              ) : state.status === "unsold" ? (
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent-red)" }}>❌ Player Unsold</div>
              ) : (
                <div style={{ fontWeight: 700, color: state.status === "bidding" ? "var(--accent-gold)" : "var(--text-muted)" }}>
                  {statusText[state.status]}
                </div>
              )}
            </div>

            {/* Timer Removed */}
          </>
        ) : (
          <div style={{ padding: "2rem 0" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏏</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.5rem", color: "var(--text-secondary)" }}>
              {statusText[state.status] || "No auction in progress"}
            </div>
          </div>
        )}
      </div>

      {/* Bid Buttons (team only) */}
      {canBid && state.status === "bidding" && state.currentPlayer && (
        <BidButtons
          currentBid={state.currentBid}
          currentBidder={state.currentBidder}
          myTeamId={myTeamId}
          teamBudget={teams?.[myTeamId] ? teams[myTeamId].budget - teams[myTeamId].spent : 0}
          onBid={onBid}
        />
      )}

      {/* Team Scorecards */}
      {teams && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {Object.values(teams).map((team) => (
            <TeamCard 
              key={team.id} 
              team={team} 
              isHighBidder={state.currentBidder === team.id} 
            />
          ))}
        </div>
      )}

      {/* Bid History */}
      {state.bidHistory && state.bidHistory.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: "1rem", fontSize: "1rem", color: "var(--text-secondary)" }}>📋 Bid History</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {state.bidHistory.slice(0, 8).map((bid, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.5rem 0.75rem", borderRadius: "8px",
                background: i === 0 ? "rgba(245,197,24,0.08)" : "transparent",
                border: i === 0 ? "1px solid rgba(245,197,24,0.2)" : "none",
              }}>
                <span style={{ color: TEAM_STYLES[bid.teamId]?.color, fontSize: "0.85rem", fontWeight: 600 }}>
                  {TEAM_STYLES[bid.teamId]?.icon} {bid.teamName}
                </span>
                <span style={{ fontWeight: 700, color: i === 0 ? "var(--accent-gold)" : "var(--text-primary)", fontSize: "0.9rem" }}>
                  {formatCurrency(bid.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BidButtons({ currentBid, currentBidder, myTeamId, teamBudget, onBid }) {
  const increments = [
    { label: "+100", value: 100 },
    { label: "+500", value: 500 },
    { label: "+1K", value: 1000 },
    { label: "+5K", value: 5000 },
  ];
  const [customBid, setCustomBid] = useState("");
  const isMyleading = currentBidder === myTeamId;

  return (
    <div className="card" style={{ border: "1px solid rgba(245,197,24,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1rem" }}>💰 Place Bid</h3>
        {isMyleading && <span className="badge badge-gold">You're Leading!</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(65px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
        {increments.map((inc) => {
          const newBid = currentBid + inc.value;
          const canAfford = newBid <= teamBudget;
          return (
            <button
              key={inc.label}
              className="btn btn-gold"
              style={{ fontSize: "0.85rem", flexDirection: "column", lineHeight: 1.2 }}
              disabled={!canAfford || isMyleading}
              onClick={() => onBid(newBid)}
            >
              <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{inc.label}</span>
              <span style={{ fontSize: "0.8rem" }}>{formatCurrency(newBid)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input
          type="number"
          className="input"
          placeholder="Custom bid amount (₹)"
          value={customBid}
          onChange={(e) => setCustomBid(e.target.value)}
          min={currentBid + (currentBidder ? 100 : 0)}
          step={100}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-green"
          disabled={!customBid || parseInt(customBid) < currentBid + (currentBidder ? 100 : 0) || parseInt(customBid) > teamBudget || isMyleading}
          onClick={() => { onBid(parseInt(customBid)); setCustomBid(""); }}
        >
          Bid
        </button>
      </div>
      {isMyleading && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--accent-green)", textAlign: "center" }}>
          ✅ Wait for the other team to bid before placing another bid.
        </p>
      )}
    </div>
  );
}

const TeamCard = memo(({ team, isHighBidder }) => {
  const remaining = team.budget - team.spent;
  const pct = Math.round((team.spent / team.budget) * 100);
  return (
    <div className="card" style={{
      border: isHighBidder ? `2px solid ${team.color}` : "1px solid var(--border)",
      boxShadow: isHighBidder ? `0 0 20px ${team.color}30` : "none",
      transition: "all 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{team.logo}</span>
        <div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1rem", fontWeight: 700, color: team.color }}>{team.name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{team.players.length} players</div>
        </div>
        {isHighBidder && (
          <span className="badge badge-gold" style={{ marginLeft: "auto", fontSize: "0.65rem" }}>LEADING</span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Budget Left</span>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-gold)" }}>{formatCurrency(remaining)}</span>
      </div>
      <div className="budget-bar">
        <div className="budget-bar-fill" style={{ width: `${pct}%`, background: team.color }} />
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
        Spent: {formatCurrency(team.spent)} / {formatCurrency(team.budget)}
      </div>
    </div>
  );
});
