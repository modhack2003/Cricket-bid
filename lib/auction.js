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
  const log = await getAuctionLog();
  log.unshift({ ...entry, ts: new Date().toISOString() });
  await redis.set("mk:auction:log", log.slice(0, 100)); // keep last 100
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

  // Normal pool — excludes players flagged as "last"
  const normalPool = players.filter((p) => baseFilter(p) && !lastIds.has(p.id));

  if (normalPool.length > 0) {
    return normalPool[Math.floor(Math.random() * normalPool.length)];
  }

  // Fall back to "last" players only when normal pool is empty
  const lastPool = players.filter((p) => baseFilter(p) && lastIds.has(p.id));
  if (lastPool.length === 0) return null;
  return lastPool[Math.floor(Math.random() * lastPool.length)];
}

export function formatCurrency(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}
