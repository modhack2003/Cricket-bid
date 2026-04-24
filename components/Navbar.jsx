"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar({ role, teamId, teamName }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const isAdmin = role === "admin";
  const isTeam = role === "team1" || role === "team2";

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">🏏 MAAR KATAR</Link>

        <div className="nav-links">
          {isAdmin && (
            <>
              <Link href="/admin" className={`nav-link ${pathname === "/admin" ? "active" : ""}`}>Dashboard</Link>
              <Link href="/admin/players" className={`nav-link ${pathname === "/admin/players" ? "active" : ""}`}>Players</Link>
              <Link href="/admin/auction" className={`nav-link ${pathname === "/admin/auction" ? "active" : ""}`}>Auction</Link>
              <Link href="/admin/teams" className={`nav-link ${pathname === "/admin/teams" ? "active" : ""}`}>Teams</Link>
            </>
          )}

          {isTeam && (
            <>
              <Link href={`/team/${teamId}`} className={`nav-link ${pathname.includes("/team/") && !pathname.includes("profile") ? "active" : ""}`}>Auction</Link>
              <Link href={`/team/${teamId}/profile`} className={`nav-link ${pathname.includes("profile") ? "active" : ""}`}>Team Profile</Link>
            </>
          )}

          <Link href="/live" className={`nav-link ${pathname === "/live" ? "active" : ""}`}>🔴 Live</Link>

          {role && role !== "guest" && (
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ marginLeft: "0.5rem" }}>
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
