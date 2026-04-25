import { NextResponse } from "next/server";
import { getPins, createSessionToken } from "@/lib/auth";
import { getTeams } from "@/lib/auction";

export async function POST(request) {
  const { role, pin } = await request.json();
  const pins = getPins();
  const teams = await getTeams();

  let valid = false;
  let teamId = null;

  if (role === "admin" && pin === pins.admin) {
    valid = true;
  } else if (role === "team1" && teams?.vipers?.pin === pin) {
    valid = true;
    teamId = "vipers";
  } else if (role === "team2" && teams?.mongooses?.pin === pin) {
    valid = true;
    teamId = "mongooses";
  } else if (role === "guest") {
    valid = true;
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const token = createSessionToken(role, teamId);
  const response = NextResponse.json({ success: true, role, teamId });
  response.cookies.set("mk_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("mk_session");
  return response;
}
