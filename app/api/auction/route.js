import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getPlayers, savePlayers,
  getTeams, saveTeams,
  getAuctionState, saveAuctionState,
  appendAuctionLog, pickRandomPlayer,
  DEFAULT_AUCTION_STATE,
} from "@/lib/auction";

export async function GET() {
  const state = await getAuctionState();
  return NextResponse.json({ state });
}

export async function POST(request) {
  const auth = await requireAuth(["admin"]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, conditions, timer, teamId, price } = await request.json();
  const state = await getAuctionState();
  const players = await getPlayers();

  const getNextPlayerWithRecycle = async (cond) => {
    let player = pickRandomPlayer(players, cond);
    if (!player) {
      const needsRecycle = players.some(
        (p) => p.status === "skipped" || p.status === "unsold"
      );
      if (needsRecycle) {
        // Immutable map — no mutation of the outer `players` reference
        const recycledPlayers = players.map((p) =>
          p.status === "skipped" || p.status === "unsold"
            ? { ...p, status: "pending" }
            : p
        );
        await savePlayers(recycledPlayers);
        // Pick directly from the new array — no in-place mutation needed
        player = pickRandomPlayer(recycledPlayers, cond);
      }
    }
    return player;
  };

  if (action === "start") {
    // Pick random player based on conditions
    const cond = conditions || state.conditions;
    const player = await getNextPlayerWithRecycle(cond);
    if (!player) {
      return NextResponse.json({ error: "No eligible players found" }, { status: 400 });
    }

    const newState = {
      ...state,
      status: "bidding",
      currentPlayer: player,
      currentBid: player.basePrice,
      currentBidder: null,
      timer: timer || 300,
      timerActive: true,
      bidHistory: [],
      conditions: cond,
    };

    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "next") {
    // Same as start but for next player
    const player = await getNextPlayerWithRecycle(state.conditions);
    if (!player) {
      const endState = { ...state, status: "idle", currentPlayer: null };
      await saveAuctionState(endState);
      return NextResponse.json({ state: endState, message: "No more eligible players" });
    }

    const newState = {
      ...state,
      status: "bidding",
      currentPlayer: player,
      currentBid: player.basePrice,
      currentBidder: null,
      timer: state.timer || 300,
      timerActive: true,
      bidHistory: [],
    };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "manualSell") {
    if (!state.currentPlayer) {
      return NextResponse.json({ error: "No active player" }, { status: 400 });
    }
    if (!teamId || !price) {
      return NextResponse.json({ error: "Team and price are required" }, { status: 400 });
    }

    // Mark player as sold
    const updatedPlayers = players.map((p) =>
      p.id === state.currentPlayer.id
        ? { ...p, status: "sold", soldTo: teamId, soldFor: price }
        : p
    );
    await savePlayers(updatedPlayers);

    // Update team — immutable spread to prevent reference mutation
    const teams = await getTeams();
    if (teams[teamId]) {
      teams[teamId] = {
        ...teams[teamId],
        players: [...teams[teamId].players, { ...state.currentPlayer, soldFor: price }],
        spent: teams[teamId].spent + price,
      };
    }
    await saveTeams(teams);

    // Log
    await appendAuctionLog({
      type: "sold",
      player: state.currentPlayer,
      soldTo: teamId,
      soldFor: price,
    });

    const newState = {
      ...state,
      status: "sold",
      currentBidder: teamId,
      currentBid: price,
      timerActive: false,
    };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "unsold") {
    if (!state.currentPlayer) return NextResponse.json({ error: "No active player" }, { status: 400 });

    const updatedPlayers = players.map((p) =>
      p.id === state.currentPlayer.id ? { ...p, status: "unsold" } : p
    );
    await savePlayers(updatedPlayers);

    await appendAuctionLog({
      type: "unsold",
      player: state.currentPlayer,
    });

    const newState = { ...state, status: "unsold", timerActive: false };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "skip") {
    if (!state.currentPlayer) return NextResponse.json({ error: "No active player" }, { status: 400 });

    const updatedPlayers = players.map((p) =>
      p.id === state.currentPlayer.id ? { ...p, status: "skipped" } : p
    );
    await savePlayers(updatedPlayers);

    await appendAuctionLog({
      type: "unsold",
      player: state.currentPlayer, // Log as unsold or skipped
    });

    const newState = { ...state, status: "unsold", timerActive: false };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "pause") {
    const newState = { ...state, status: "paused", timerActive: false };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "resume") {
    const newState = { ...state, status: "bidding", timerActive: true };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "reset") {
    await saveAuctionState(DEFAULT_AUCTION_STATE);
    return NextResponse.json({ state: DEFAULT_AUCTION_STATE });
  }

  if (action === "updateConditions") {
    const newState = { ...state, conditions };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  if (action === "updateTimer") {
    const newState = { ...state, timer: parseInt(timer) };
    await saveAuctionState(newState);
    return NextResponse.json({ state: newState });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
