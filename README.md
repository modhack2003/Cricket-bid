# 🏏 Maar Katar — Cricket Auction Platform

A real-time cricket player auction system built for live team bidding events. Two teams compete to build the best squad by bidding on players, with live score tracking, admin controls, and team dashboards.

---

## ✨ Features

- **Live Auction** — Real-time bidding with Server-Sent Events (SSE); bid updates stream to all viewers instantly
- **Admin Control Panel** — Start/pause/reset auctions, manually assign players, skip or mark unsold, set selection conditions
- **Team Dashboards** — Each team sees their live budget, squad, and can place bids directly
- **Manager & Captain Assignment** — Teams pre-select a Manager and Captain from the player pool at ₹0 before the auction begins
- **Pass to Opponent** — Admin or team can pass the current player to the opposing team at the last bid price
- **Auction Log** — Full history of all sold/unsold/skipped events with relative timestamps
- **Player Management** — Add, edit, delete, bulk-upload players via JSON; filter by role and status
- **PIN-based Auth** — Secure role-based access for Admin, Vipers, and Mongooses with 7-day sessions
- **Upstash Redis** — All state persisted in Redis; fully serverless and Vercel-ready

---

## 🧑‍💻 Roles

| Role | Access | Default PIN |
|------|--------|-------------|
| **Admin** | Full auction control, player management | `admin123` |
| **Vipers (Team 1)** | Bidding, squad view, profile | `vipers123` |
| **Mongooses (Team 2)** | Bidding, squad view, profile | `mongooses123` |
| **Guest** | Live auction view only | _(no PIN)_ |

> PINs are overridable via environment variables.

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file:

```env
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

ADMIN_PIN=admin123
TEAM1_PIN=vipers123
TEAM2_PIN=mongooses123
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

---

## 📁 Project Structure

```
app/
  api/
    auction/          # Auction control, bidding, SSE stream, log
    auth/             # Login / logout
    players/          # Player CRUD
    teams/            # Team profile updates
  admin/
    auction/          # Admin auction control panel
    players/          # Player management
    teams/            # Team overview
  team/[teamId]/      # Team dashboard + profile
  page.jsx            # Home / live guest view

components/
  AuctionLiveView     # Live bid display with SSE
  Navbar, Toast, PlayerCard...

lib/
  auction.js          # Core data access + auction logic
  auth.js             # Session helpers
  redis.js            # Upstash Redis client
```

---

## 🏗️ Auction Flow

1. **Setup** — Admin seeds players; each team sets their Manager & Captain from the player pool (free)
2. **Start** — Admin starts the auction; a random player is selected based on active conditions
3. **Bidding** — Teams place bids live; admin can pause, skip, sell, or pass to opponent
4. **Sold / Unsold** — Player is marked sold to the highest bidder, or unsold/skipped to re-enter later
5. **Repeat** — Admin moves to the next player until all players are auctioned

---

## ☁️ Deploying to Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables in the Vercel dashboard:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `ADMIN_PIN`, `TEAM1_PIN`, `TEAM2_PIN`
4. Deploy — no build config needed

---

## 🛠️ Tech Stack

- **Next.js 16** (App Router)
- **Upstash Redis** (serverless persistence)
- **Server-Sent Events** (real-time streaming)
- **Vanilla CSS** (custom design system, dark mode)
- **Vercel** (deployment)
