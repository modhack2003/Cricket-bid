import { NextResponse } from "next/server";
import { requireAuth, getSession } from "@/lib/auth";
import { getTeams, saveTeams, getPlayers, savePlayers } from "@/lib/auction";
import { getPins } from "@/lib/auth";

export async function GET() {
  const teams = await getTeams();
  return NextResponse.json({ teams });
}

export async function PUT(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const teams = await getTeams();

  // Admin can update any team; team managers can only update their own
  if (session.role === "admin") {
    if (body.teamId && teams[body.teamId]) {
      const { teamId, ...updates } = body;
      teams[teamId] = { ...teams[teamId], ...updates };
      await saveTeams(teams);
      return NextResponse.json({ team: teams[teamId] });
    }

    // Reset PINs (admin only) — stored in Redis config
    if (body.action === "resetPin") {
      const pins = getPins();
      const teamId = body.teamId;
      // Save new pin to teams object
      teams[teamId].pin = body.newPin;
      await saveTeams(teams);
      return NextResponse.json({ success: true });
    }
  }

  // Team manager updates own profile
  if (session.role === "team1" || session.role === "team2") {
    const teamId = session.teamId;
    const allowedFields = ["logo", "color", "managerId", "captainId"];
    const updates = {};
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        // Normalize empty string to null for managerId / captainId
        updates[f] = (f === "managerId" || f === "captainId") && body[f] === ""
          ? null
          : body[f];
      }
    }
    
    // Handle manager/captain logic
    if (updates.managerId !== undefined || updates.captainId !== undefined) {
      const players = await getPlayers();
      const currentTeam = teams[teamId];
      
      const oldManagerId = currentTeam.managerId;
      const oldCaptainId = currentTeam.captainId;
      
      const newManagerId = updates.managerId !== undefined ? updates.managerId : oldManagerId;
      const newCaptainId = updates.captainId !== undefined ? updates.captainId : oldCaptainId;
      
      // Determine players to "release"
      const releaseIds = [];
      if (oldManagerId && oldManagerId !== newManagerId && oldManagerId !== newCaptainId) releaseIds.push(oldManagerId);
      if (oldCaptainId && oldCaptainId !== newCaptainId && oldCaptainId !== newManagerId) releaseIds.push(oldCaptainId);
      
      // Determine players to "acquire"
      const acquireIds = [];
      if (newManagerId && newManagerId !== oldManagerId && newManagerId !== oldCaptainId) acquireIds.push(newManagerId);
      if (newCaptainId && newCaptainId !== oldCaptainId && newCaptainId !== oldManagerId) acquireIds.push(newCaptainId);
      
      let spentDelta = 0;
      
      // Release players
      for (const id of releaseIds) {
        const pIdx = players.findIndex(p => p.id === id);
        if (pIdx !== -1) {
          spentDelta -= 0; // Free refund
          players[pIdx] = { ...players[pIdx], status: "pending", soldTo: null, soldFor: null };
        }
        currentTeam.players = currentTeam.players.filter(p => p.id !== id);
      }
      
      // Acquire players
      for (const id of acquireIds) {
        const pIdx = players.findIndex(p => p.id === id);
        if (pIdx === -1) continue;

        const p = players[pIdx];
        if (p.status === "pending") {
          // New player from the free pool
          players[pIdx] = { ...p, status: "sold", soldTo: teamId, soldFor: 0 };
          currentTeam.players.push({ ...players[pIdx] });
        } else if (p.status === "sold" && p.soldTo === teamId) {
          // Player already on this team's squad — just updating the role, no cost
        } else {
          return NextResponse.json({ error: "One or more selected players are not available" }, { status: 400 });
        }
      }
      
      if (currentTeam.spent + spentDelta > currentTeam.budget) {
        return NextResponse.json({ error: "Insufficient budget to acquire these players" }, { status: 400 });
      }
      
      currentTeam.spent += spentDelta;
      await savePlayers(players);
    }

    teams[teamId] = { ...teams[teamId], ...updates };
    await saveTeams(teams);
    return NextResponse.json({ team: teams[teamId] });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
