# Finance Tracker

A personal finance web app for tracking income, expenses, and savings goals. Data is stored locally in the browser and can optionally sync to the cloud via Vercel serverless functions and Upstash Redis.

## Features

- **Balance overview** — Total balance, net spendable balance (after allocated savings), and savings percentage
- **Transactions** — Record income, expenses, and transfers to savings goals; tap any entry to edit or delete it
- **Custom dates** — Backdate transactions to log past expenses; the timeline sorts and groups them correctly
- **Backup** — Export all data as JSON and import it back (merges additively, safe to re-import)
- **Savings goals** — Target-based goals with progress bars, plus long-term savings buckets without a fixed target
- **Goal lifecycle** — Add funds to goals, withdraw part of a goal's balance, mark goals as complete (recorded as spent), or delete goals (funds return to spendable balance)
- **Budgets** — Set a monthly spending limit per expense category; the Budgets section shows spent-vs-limit progress, what's left this month, and flags any category that's over
- **Insights** — A spending-by-category donut for the current month and a six-month net trend, drawn inline with no chart library
- **Monthly summary** — Per-month income, spending, and savings totals with a category breakdown and month navigation
- **Overspend warning** — A gentle warning (not a block) when an expense or transfer exceeds your spendable balance
- **Bulk add** — Paste multiple transactions in shorthand (sign, amount, description, optional date, `@Category`) with a live preview
- **Recurring** — Auto-post rent, salary, or subscriptions on a weekly or monthly schedule when they come due
- **Timeline search** — Filter the timeline by description, category, or goal name
- **Installable PWA** — Add to your home screen and use it offline (app shell cached via a service worker)
- **Categories** — Customizable income and expense categories
- **Transaction history** — Grouped by date with labels like Today and Yesterday
- **Cloud sync** — Optional sync across devices when deployed to Vercel with Redis configured
- **Offline-first** — Works fully in the browser with `localStorage`; sync merges additively (transactions are unioned by id, never overwritten wholesale)

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
3. **Set the sync secret** — Add the `SYNC_SECRET` environment variable with a long random value, then redeploy.
4. **Enter the key in the app** — Open the deployed app, tap the sync button under the balance, and enter the same value. The key is stored in that browser's `localStorage` only — it is never embedded in the public JS bundle. Repeat once per device you want to sync.

> If you previously set `VITE_SYNC_SECRET`, remove it from Vercel and redeploy — it is no longer used, and build-time `VITE_*` values are readable by anyone in the served bundle.

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
| `SYNC_SECRET` | Server | Bearer token the API requires; enter the same value in the app's sync settings |
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
