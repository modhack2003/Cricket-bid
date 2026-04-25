import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAuctionState, saveAuctionState, getTeams } from "@/lib/auction";

export async function POST(request) {
  const session = await getSession();
  // Allow team1, team2, and admin sessions (admin useful for testing)
  if (!session || (session.role !== "team1" && session.role !== "team2" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized — please log in as a team" }, { status: 401 });
  }

  const { amount, teamId: bodyTeamId } = await request.json();
  // Team sessions use their own teamId; admin can pass teamId in body
  const teamId = session.role === "admin" ? bodyTeamId : session.teamId;

  const state = await getAuctionState();
  if (state.status !== "bidding") {
    return NextResponse.json({ error: "Auction not active" }, { status: 400 });
  }

  if (!state.currentPlayer) {
    return NextResponse.json({ error: "No player up for auction" }, { status: 400 });
  }

  const bidAmount = parseInt(amount);
  if (state.currentBidder) {
    if (bidAmount < state.currentBid + 100) {
      return NextResponse.json({ error: `Bid must be at least ₹${state.currentBid + 100} (min increment is 100)` }, { status: 400 });
    }
  } else {
    if (bidAmount < state.currentBid) {
      return NextResponse.json({ error: `Bid must be at least base price of ₹${state.currentBid}` }, { status: 400 });
    }
  }

  // Check team budget
  const teams = await getTeams();
  const team = teams[teamId];
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const remaining = team.budget - team.spent;
  if (bidAmount > remaining) {
    return NextResponse.json({ error: "Insufficient budget" }, { status: 400 });
  }

  const maxPlayers = state.conditions?.maxPlayersPerTeam || 15;
  if (team.players.length >= maxPlayers) {
    return NextResponse.json({ error: `Team has reached the maximum limit of ${maxPlayers} players` }, { status: 400 });
  }

  // Cannot outbid your own bid
  if (state.currentBidder === teamId) {
    return NextResponse.json({ error: "You are already the highest bidder!" }, { status: 400 });
  }

  const newBid = {
    teamId,
    teamName: team.name,
    amount: bidAmount,
    ts: new Date().toISOString(),
  };

  const newState = {
    ...state,
    currentBid: bidAmount,
    currentBidder: teamId,
    timer: Math.max(state.timer || 0, 15), // Extend timer to 15s if below 15s
    timerActive: true,
    bidHistory: [newBid, ...(state.bidHistory || [])].slice(0, 20),
  };

  await saveAuctionState(newState);
  return NextResponse.json({ success: true, state: newState });
}
