import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPlayers, savePlayers } from "@/lib/auction";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const players = await getPlayers();
  return NextResponse.json({ players });
}

export async function POST(request) {
  const auth = await requireAuth(["admin"]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const players = await getPlayers();

  if (Array.isArray(body)) {
    const newPlayers = [];
    for (const p of body) {
      if (!p.name) continue;
      const exists = players.some((existing) => existing.name.toLowerCase() === p.name.toLowerCase());
      if (!exists) {
        newPlayers.push({
          id: uuidv4(),
          name: p.name,
          role: p.role || "Batsman",
          basePrice: parseInt(p.basePrice) || 1000,
          country: p.country || "India",
          status: "pending",
          isTemp: p.isTemp || false,
          soldTo: null,
          soldFor: null,
          stats: p.stats || {},
        });
      }
    }
    
    if (newPlayers.length > 0) {
      players.push(...newPlayers);
      await savePlayers(players);
    }
    return NextResponse.json({ added: newPlayers.length });
  }

  const newPlayer = {
    id: uuidv4(),
    name: body.name,
    role: body.role,
    basePrice: parseInt(body.basePrice),
    country: body.country || "India",
    status: "pending",
    isTemp: body.isTemp || false,
    soldTo: null,
    soldFor: null,
    stats: body.stats || {},
  };

  players.push(newPlayer);
  await savePlayers(players);

  return NextResponse.json({ player: newPlayer });
}

export async function PUT(request) {
  const auth = await requireAuth(["admin"]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const players = await getPlayers();
  const idx = players.findIndex((p) => p.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  players[idx] = { ...players[idx], ...body };
  await savePlayers(players);

  return NextResponse.json({ player: players[idx] });
}

export async function DELETE(request) {
  const auth = await requireAuth(["admin"]);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");
  
  if (all === "true") {
    await savePlayers([]);
    return NextResponse.json({ success: true });
  }

  const id = searchParams.get("id");
  let players = await getPlayers();
  players = players.filter((p) => p.id !== id);
  await savePlayers(players);

  return NextResponse.json({ success: true });
}
