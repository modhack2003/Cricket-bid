import { cookies } from "next/headers";

export const ROLES = {
  ADMIN: "admin",
  TEAM1: "team1",
  TEAM2: "team2",
  GUEST: "guest",
};

export const TEAM_IDS = {
  team1: "vipers",
  team2: "mongooses",
};

export function getPins() {
  return {
    admin: process.env.ADMIN_PIN || "admin123",
    team1: process.env.TEAM1_PIN || "vipers123",
    team2: process.env.TEAM2_PIN || "mongooses123",
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("mk_session");
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(
      Buffer.from(sessionCookie.value, "base64").toString("utf-8")
    );
    return session;
  } catch {
    return null;
  }
}

export function createSessionToken(role, teamId = null) {
  const payload = {
    role,
    teamId,
    ts: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export async function requireAuth(allowedRoles) {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.role)) {
    return null;
  }
  return session;
}
