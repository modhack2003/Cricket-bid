import redis from "./redis";
import { v4 as uuidv4 } from "uuid";

// ─── Default Data ─────────────────────────────────────────────────────────────

export const DEFAULT_TEAMS = {
  vipers: {
    id: "vipers",
    name: "Roaring Vipers",
    managerId: null,
    captainId: null,
    logo: "🐍",
    color: "#22c55e",
    budget: 30000,
    spent: 0,
    players: [],
    pin: process.env.TEAM1_PIN || "vipers123",
  },
  mongooses: {
    id: "mongooses",
    name: "Mighty Mongooses",
    managerId: null,
    captainId: null,
    logo: "🦡",
    color: "#f59e0b",
    budget: 30000,
    spent: 0,
    players: [],
    pin: process.env.TEAM2_PIN || "mongooses123",
  },
};

export const DEFAULT_AUCTION_STATE = {
  status: "idle", // idle | active | bidding | sold | unsold | paused
  currentPlayer: null,
  currentBid: 0,
  currentBidder: null,
  timer: 30,
  timerActive: false,
  bidHistory: [],
  conditions: {
    roles: [],
    minBasePrice: 0,
    maxBasePrice: 99999999,
    excludeSold: true,
    lastPlayerIds: [], // player IDs forced to come last
    maxPlayersPerTeam: 15, // default max players
  },
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const SEED_PLAYERS = [
  { role: "Batsman", name: "Arjun Sharma", basePrice: 500000, country: "India" },
  { role: "Batsman", name: "Vikram Patel", basePrice: 400000, country: "India" },
  { role: "Bowler", name: "Ravi Kumar", basePrice: 600000, country: "India" },
  { role: "Bowler", name: "Sameer Khan", basePrice: 350000, country: "Pakistan" },
  { role: "All-rounder", name: "Dev Singh", basePrice: 800000, country: "India" },
  { role: "All-rounder", name: "Aarav Mehta", basePrice: 750000, country: "India" },
  { role: "Wicketkeeper", name: "Nikhil Rao", basePrice: 500000, country: "Sri Lanka" },
  { role: "Batsman", name: "Karan Verma", basePrice: 300000, country: "India" },
  { role: "Bowler", name: "Ishaan Malik", basePrice: 450000, country: "India" },
  { role: "All-rounder", name: "Tarun Das", basePrice: 550000, country: "India" },
];

// ─── Data Access ──────────────────────────────────────────────────────────────

export async function getPlayers() {
  const players = await redis.get("mk:players");
  if (!players) {
    const seeded = SEED_PLAYERS.map((p) => ({
      ...p,
      id: uuidv4(),
      status: "pending",
      isTemp: false,
      soldTo: null,
      soldFor: null,
    }));
    await redis.set("mk:players", seeded);
    return seeded;
  }
  return players;
}

export async function savePlayers(players) {
  await redis.set("mk:players", players);
}

export async function getTeams() {
  const teams = await redis.get("mk:teams");
  if (!teams) {
    await redis.set("mk:teams", DEFAULT_TEAMS);
    return DEFAULT_TEAMS;
  }
  return teams;
}

export async function saveTeams(teams) {
  await redis.set("mk:teams", teams);
}

export async function getAuctionState() {
  const state = await redis.get("mk:auction");
  if (!state) {
    await redis.set("mk:auction", DEFAULT_AUCTION_STATE);
    return DEFAULT_AUCTION_STATE;
  }
  return state;
}

export async function saveAuctionState(state) {
  await redis.set("mk:auction", state);
}

export async function getAuctionLog() {
  const log = await redis.get("mk:auction:log");
  return log || [];
}

export async function appendAuctionLog(entry) {
  // Read only the first 99 entries so we can prepend without exceeding 100 total
  const log = await getAuctionLog();
  const newLog = [{ ...entry, ts: new Date().toISOString() }, ...log].slice(0, 100);
  await redis.set("mk:auction:log", newLog);
}

// ─── Auction Logic ────────────────────────────────────────────────────────────

export function pickRandomPlayer(players, conditions) {
  // Use a Set for O(1) lookups instead of O(n) array.includes()
  const lastIds = new Set(conditions.lastPlayerIds || []);

  const baseFilter = (p) => {
    if (conditions.excludeSold && p.status !== "pending") return false;
    if (conditions.roles && conditions.roles.length > 0 && !conditions.roles.includes(p.role)) return false;
    if (p.basePrice < (conditions.minBasePrice || 0)) return false;
    if (p.basePrice > (conditions.maxBasePrice || 99999999)) return false;
    return true;
  };

  // Single pass: split into normal and last-priority buckets simultaneously
  const normal = [];
  const last = [];
  for (const p of players) {
    if (!baseFilter(p)) continue;
    if (lastIds.has(p.id)) last.push(p);
    else normal.push(p);
  }

  const pool = normal.length > 0 ? normal : last;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function formatCurrency(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}
