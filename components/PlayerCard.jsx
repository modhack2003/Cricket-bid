"use client";
import { formatCurrency } from "@/lib/auction";

const roleIcons = {
  Batsman: "🏏",
  Bowler: "🎯",
  "All-rounder": "⭐",
  Wicketkeeper: "🧤",
};

const statusColors = {
  pending: "badge-gray",
  sold: "badge-green",
  unsold: "badge-red",
};

export default function PlayerCard({ player, compact = false, onClick }) {
  if (!player) return null;
  return (
    <div
      className="card"
      style={{ cursor: onClick ? "pointer" : "default", position: "relative" }}
      onClick={onClick}
    >
      {player.isTemp && (
        <span className="badge badge-blue" style={{ position: "absolute", top: "1rem", right: "1rem", fontSize: "0.65rem" }}>
          TEMP
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem", flexShrink: 0, boxShadow: "0 0 20px rgba(245,197,24,0.2)",
        }}>
          {roleIcons[player.role] || "🏏"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {player.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
            <span className="badge badge-gray">{player.role}</span>
            {player.country && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{player.country}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-gold)" }}>
            {formatCurrency(player.soldFor || player.basePrice)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {player.soldFor ? "Sold for" : "Base"}
          </div>
        </div>
      </div>

      {!compact && player.soldTo && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Won by</span>
          <span className="badge badge-green" style={{ fontSize: "0.78rem" }}>
            {player.soldTo === "vipers" ? "🐍 Roaring Vipers" : "🦡 Mighty Mongooses"}
          </span>
        </div>
      )}

      <div style={{ marginTop: compact ? "0.5rem" : "0.75rem", display: "flex", justifyContent: "flex-end" }}>
        <span className={`badge ${statusColors[player.status] || "badge-gray"}`}>
          {player.status}
        </span>
      </div>
    </div>
  );
}
