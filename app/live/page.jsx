"use client";
import Navbar from "@/components/Navbar";
import AuctionLiveView from "@/components/AuctionLiveView";

export default function LivePage() {
  return (
    <>
      <Navbar role="guest" />
      <div style={{
        minHeight: "calc(100vh - 57px)",
        background: "radial-gradient(ellipse at 50% 0%, rgba(245,197,24,0.06) 0%, transparent 60%), var(--bg-primary)",
      }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid var(--border)",
          padding: "1.25rem 1.5rem",
          background: "rgba(10,22,40,0.8)",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div className="live-dot" />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-red)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  LIVE AUCTION
                </span>
              </div>
              <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-gold)", marginTop: "0.2rem" }}>
                🏏 Maar Katar Tournament
              </h1>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span className="badge badge-blue">👁 Spectator View</span>
              <span className="badge badge-gray">🐍 Vipers vs 🦡 Mongooses</span>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem" }}>
          <AuctionLiveView canBid={false} />
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--border)" }}>
          You are watching as a guest. To participate in bidding, log in as a team.
          <br />
          <a href="/" style={{ color: "var(--accent-gold)", textDecoration: "none", marginTop: "0.5rem", display: "inline-block" }}>
            ← Back to Login
          </a>
        </div>
      </div>
    </>
  );
}
