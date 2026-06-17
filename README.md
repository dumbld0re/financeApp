# Finance Tracker

A personal finance web app for tracking income, expenses, and savings goals. Data is stored locally in the browser and can optionally sync to the cloud via Vercel serverless functions and Upstash Redis.

## Features

- **Balance overview** — Total balance, net spendable balance (after allocated savings), and savings percentage
- **Transactions** — Record income, expenses, and transfers to savings goals
- **Savings goals** — Target-based goals with progress bars, plus long-term savings buckets without a fixed target
- **Goal lifecycle** — Add funds to goals, mark goals as complete (recorded as spent), or delete goals (funds return to spendable balance)
- **Categories** — Customizable income and expense categories
- **Transaction history** — Grouped by date with labels like Today and Yesterday
- **Cloud sync** — Optional sync across devices when deployed to Vercel with Redis configured
- **Offline-first** — Works fully in the browser with `localStorage`; sync is additive

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6 |
| Styling | CSS (custom, no UI framework) |
| API | Vercel serverless functions (`/api/data`, `/api/health`) |
| Storage | Browser `localStorage` + Upstash Redis (cloud) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Local development (offline mode)

```bash
git clone https://github.com/dumbld0re/financeApp.git
cd financeApp
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`). Without sync secrets configured, the app runs in local-only mode and persists data in your browser.

### Build for production

```bash
npm run build
npm run preview
```

## Cloud Sync Setup (Vercel)

Deploy to [Vercel](https://vercel.com) to enable cross-device sync.

1. **Import the repo** into Vercel and deploy.
2. **Add Upstash Redis** — In the Vercel project, go to Storage → Create Database → Upstash Redis. This auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. **Set sync secrets** — Add both environment variables with the same random value:
   - `SYNC_SECRET` — used by the server API
   - `VITE_SYNC_SECRET` — embedded in the client at build time
4. **Redeploy** — Vite bakes `VITE_*` variables in at build time, so you must redeploy after adding or changing them.

Copy `.env.example` to `.env.local` for local testing with the full stack:

```bash
cp .env.example .env.local
# Edit .env.local with your secrets, then:
npx vercel dev
```

> **Note:** `npm run dev` alone does not serve the `/api` routes. Use `npx vercel dev` to test sync locally.

### Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SYNC_SECRET` | Client (build time) | Bearer token sent with sync requests |
| `SYNC_SECRET` | Server | Must match `VITE_SYNC_SECRET` |
| `UPSTASH_REDIS_REST_URL` | Server | Auto-set by Vercel Upstash integration |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Auto-set by Vercel Upstash integration |

## How Balances Work

- **Total balance** — Sum of all income minus expenses and completed goal purchases
- **Allocated savings** — Money currently held in active savings goals
- **Net balance** — Total balance minus allocated savings (what you can still spend or allocate)

Savings transfers move money from spendable balance into a goal without changing total balance. Completing a goal records the amount as spent; deleting a goal releases funds back to spendable balance.

## Project Structure

```
financeApp/
├── api/                  # Vercel serverless functions
│   ├── data.js           # GET/PUT finance data (Redis)
│   └── health.js         # Sync health check
├── lib/
│   └── redis.js          # Upstash Redis client and helpers
├── src/
│   ├── components/       # React UI components
│   ├── utils/            # Calculations, sync, categories, migration
│   ├── App.jsx           # Main app state and handlers
│   └── main.jsx          # Entry point
├── vercel.json           # Vercel routing and build config
└── .env.example          # Environment variable template
```

## API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | None | Reports Redis and secret configuration status |
| `/api/data` | GET | Bearer `SYNC_SECRET` | Load finance data from Redis |
| `/api/data` | PUT | Bearer `SYNC_SECRET` | Save finance data to Redis |

## License

Private project — all rights reserved.
