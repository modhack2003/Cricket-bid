"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const roles = [
  {
    id: "admin",
    label: "Admin",
    icon: "⚙️",
    description: "Full auction control & management",
    color: "#f5c518",
    gradient: "linear-gradient(135deg, rgba(245,197,24,0.15), rgba(245,197,24,0.05))",
    border: "rgba(245,197,24,0.4)",
    requiresPin: true,
  },
  {
    id: "team1",
    label: "Roaring Vipers",
    icon: "🐍",
    description: "Place bids & manage your squad",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))",
    border: "rgba(34,197,94,0.4)",
    requiresPin: true,
    redirect: "/team/vipers",
  },
  {
    id: "team2",
    label: "Mighty Mongooses",
    icon: "🦡",
    description: "Place bids & manage your squad",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
    border: "rgba(245,158,11,0.4)",
    requiresPin: true,
    redirect: "/team/mongooses",
  },
  {
    id: "guest",
    label: "Watch Live",
    icon: "📺",
    description: "View the auction in real-time",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
    border: "rgba(59,130,246,0.4)",
    requiresPin: false,
    redirect: "/live",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleClick = async (role) => {
    if (!role.requiresPin) {
      // Guest — just redirect
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "guest", pin: "" }),
      });
      router.push(role.redirect);
      return;
    }
    setSelected(role);
    setPin("");
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selected.id, pin }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError("Invalid PIN. Please try again.");
      return;
    }

    if (selected.id === "admin") router.push("/admin");
    else router.push(selected.redirect);
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 20% 50%, rgba(245,197,24,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(34,197,94,0.06) 0%, transparent 60%), #050b14",
      }} />

      {/* Cricket Field Pattern */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, opacity: 0.04,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)",
      }} />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem", animation: "slideUp 0.6s ease" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🏏</div>
          <div style={{
            fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.3em", color: "var(--accent-gold)",
            textTransform: "uppercase", marginBottom: "0.75rem", opacity: 0.8,
          }}>
            Live Cricket Auction
          </div>
          <h1 style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 900,
            lineHeight: 1,
            background: "linear-gradient(135deg, #f5c518 0%, #fff 50%, #f5c518 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}>
            MAAR KATAR
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Roaring Vipers 🐍 &nbsp;vs&nbsp; 🦡 Mighty Mongooses
          </p>
        </div>

        {/* PIN Modal */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.8rem" }}>{selected.icon}</span>
                  <div>
                    <div className="modal-title">{selected.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Enter your PIN to continue</div>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Access PIN</label>
                  <input
                    className="input"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN"
                    autoFocus
                    maxLength={20}
                    style={{ fontSize: "1.2rem", letterSpacing: "0.3em", textAlign: "center" }}
                  />
                </div>
                {error && (
                  <div style={{ color: "var(--accent-red)", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-gold w-full btn-lg"
                  disabled={loading || !pin}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Verifying...</> : "Enter →"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Role Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          width: "100%",
          maxWidth: "950px",
        }}>
          {roles.map((role, i) => (
            <button
              key={role.id}
              onClick={() => handleRoleClick(role)}
              style={{
                background: role.gradient,
                border: `1px solid ${role.border}`,
                borderRadius: "20px",
                padding: "2rem 1.5rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.25s ease",
                animation: `slideUp ${0.4 + i * 0.1}s ease`,
                color: "var(--text-primary)",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = `0 20px 50px ${role.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{role.icon}</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "1.4rem", fontWeight: 700, color: role.color, marginBottom: "0.4rem" }}>
                {role.label}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {role.description}
              </div>
              {!role.requiresPin && (
                <div style={{ marginTop: "1rem" }}>
                  <span className="badge badge-blue">No PIN Required</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "3rem", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
          Maar Katar Tournament • Live Cricket Auction Platform
        </div>
      </div>
    </div>
  );
}
