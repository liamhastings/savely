# Savely

Personal finance tracker (Monarch-style) — single user, iOS via Expo, Plaid for bank data.

```
Savely/
├── mobile/    # React Native (Expo) app
├── server/    # Node + Express + TypeScript API
└── ml/        # optional ML categorizer, later
```

## Prerequisites

- Node 20+
- PostgreSQL running locally (`createdb savely`)
- Plaid account — https://dashboard.plaid.com → get Sandbox `client_id` + `secret`

## Server setup

`.env` lives at the **repo root** (not in `server/`). `server/src/env.ts` resolves that
path explicitly, so it is found no matter which directory you start the server from.
Write it as UTF-8 **without** a BOM — a BOM corrupts the first key name.

```bash
cp .env.example .env    # fill in Plaid keys, DATABASE_URL, APP_PASSWORD, JWT_SECRET, ENCRYPTION_KEY
cd server
npm install
npm run migrate         # creates tables + seeds categories and merchant rules
npm run dev             # http://localhost:4000
```

Generate `ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Mobile setup

```bash
cd mobile
npm install
npm start               # Expo dev server; scan QR with your iPhone
```

Set the server URL in `mobile/src/api/client.ts` (`API_URL`) to your computer's LAN IP
(e.g. `http://192.168.1.x:4000`) so the phone can reach it. Phone and computer must be
on the same Wi-Fi.

### Important: Plaid Link needs a dev build, not Expo Go

`react-native-plaid-link-sdk` is a native module, so the **bank-linking flow will not run
inside Expo Go**. Everything else (dashboard, transactions, budgets against sandbox data)
works in Expo Go. To use Plaid Link on your iPhone:

```bash
cd mobile
npx expo prebuild
eas build --profile development --platform ios   # or: npx expo run:ios (needs a Mac)
```

A free Apple ID works for development builds via `expo run:ios`; EAS builds to a device
require the paid developer account. Alternative while in Sandbox: link accounts by calling
the server directly with Plaid's sandbox `public_token` flow (see below).

### Linking a sandbox item without the native SDK

```bash
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d "{\"password\":\"YOUR_APP_PASSWORD\"}"
```

Then create a sandbox public token and exchange it:

```bash
curl -X POST https://sandbox.plaid.com/sandbox/public_token/create -H "Content-Type: application/json" -d "{\"client_id\":\"CLIENT_ID\",\"secret\":\"SECRET\",\"institution_id\":\"ins_109508\",\"initial_products\":[\"transactions\"]}"
```

```bash
curl -X POST http://localhost:4000/plaid/exchange -H "Content-Type: application/json" -H "Authorization: Bearer TOKEN" -d "{\"public_token\":\"public-sandbox-...\",\"institution_name\":\"First Platypus Bank\"}"
```

## API overview

| Route | What |
|---|---|
| `POST /auth/login` | `{password}` → JWT |
| `POST /plaid/link-token` | link_token for Plaid Link |
| `POST /plaid/exchange` | public_token → stores encrypted access_token, runs initial sync |
| `POST /transactions/sync` | on-demand sync (also runs on a 6-hour cron) |
| `GET /transactions?month=&category_id=&search=` | transaction list |
| `PATCH /transactions/:id` | recategorize (locks against re-sync) |
| `GET /transactions/spending?month=` | spend by top-level category |
| `GET /accounts` | accounts + balances |
| `GET /accounts/net-worth` | daily net worth series |
| `GET /budgets?month=` / `PUT /budgets` | budget vs. actual / upsert |
| `GET /categories` | category tree |

## Going to Production Trial

1. Request Production access in the Plaid dashboard (free trial tier, 10 Items max).
2. Set `PLAID_ENV=production` and swap `PLAID_SECRET` to the production secret in `.env`.
3. Relink your real accounts through the app.
