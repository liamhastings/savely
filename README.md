# Savely

Personal finance tracker (Monarch-style) — a web app with Supabase sign-in and Plaid for bank data.

```
Savely/
├── web/       # React web app (Vite + Tailwind)
├── server/    # Node + Express + TypeScript API
└── ml/        # optional ML categorizer, later
```

How the pieces fit: the browser signs in with **Supabase Auth** and sends the resulting
access token to the **API server** on every request. The server verifies the token, reads
the user id from it, and only ever returns that user's data. Plaid secrets and bank access
tokens stay on the server.

## Prerequisites

- Node 20+
- PostgreSQL (`createdb savely`) — local, or the Postgres that comes with your Supabase project
- A Supabase project — https://supabase.com/dashboard
- Plaid account — https://dashboard.plaid.com → Sandbox `client_id` + `secret`

## 1. Supabase

1. Create a project.
2. Project Settings → API: copy the **Project URL** and the **publishable** key
   (older projects call it the `anon` key). Never put the secret / `service_role` key in `.env`'s `VITE_` keys.
3. Authentication → Sign In / Providers: Email is on by default. With "Confirm email" on,
   new users must click the emailed link before they can sign in.
4. When you host the site, add its address under Authentication → URL Configuration.

## 2. Environment

`.env` lives at the **repo root** and is shared by the server and the web app (only `VITE_*`
keys reach the browser). Write it as UTF-8 **without** a BOM — a BOM corrupts the first key name.

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, the Plaid keys, `ENCRYPTION_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_URL`
and `VITE_SUPABASE_PUBLISHABLE_KEY`. Generate `ENCRYPTION_KEY` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Server

```bash
cd server
npm install
npm run migrate         # creates/updates tables, seeds categories and merchant rules
npm run dev             # http://localhost:4000
```

## 4. Web app

```bash
cd web
npm install
npm run dev             # http://localhost:5173
```

Create an account on the sign-in page, then use **+ Link a bank account** on the dashboard.
In Sandbox, Plaid Link accepts the test login `user_good` / `pass_good`.

### Data from before accounts existed

Rows created while Savely was single-user have no owner and are hidden. To hand them to
your account, copy your user's UID from Supabase → Authentication → Users and run:

```bash
cd server
npm run claim -- YOUR-USER-UID
```

## API overview

Every route except `/health` needs `Authorization: Bearer <Supabase access token>` and is
scoped to that user.

| Route | What |
|---|---|
| `POST /plaid/link-token` | link_token for Plaid Link |
| `POST /plaid/exchange` | public_token → stores encrypted access_token, runs initial sync |
| `GET /plaid/items` | linked institutions |
| `POST /transactions/sync` | on-demand sync of your items (all users' items also sync on a 6-hour cron) |
| `GET /transactions?month=&category_id=&search=` | transaction list |
| `PATCH /transactions/:id` | recategorize (locks against re-sync) |
| `GET /transactions/spending?month=` | spend by top-level category |
| `GET /accounts` | accounts + balances |
| `GET /accounts/net-worth` | daily net worth series |
| `GET /budgets?month=` / `PUT /budgets` | budget vs. actual / upsert |
| `GET /categories` | category tree (shared by all users) |

## Hosting later

Three things need a home:

- **Web app** — `cd web && npm run build` produces static files in `web/dist`. Any static host
  works (Vercel, Netlify, Cloudflare Pages). It's a single-page app, so configure the host to
  serve `index.html` for unknown paths. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  and `VITE_API_URL` in the host's build environment.
- **API server** — any Node host (Render, Railway, Fly.io). It must stay running for the sync
  cron. Set the server keys from `.env.example`, plus `WEB_ORIGIN` to the web app's address.
- **Database** — point `DATABASE_URL` at hosted Postgres (your Supabase project's database
  works) and run `npm run migrate` against it.

## Going to Plaid Production Trial

1. Request Production access in the Plaid dashboard (free trial tier, 10 Items max).
2. Set `PLAID_ENV=production` and swap `PLAID_SECRET` to the production secret in `.env`.
3. Relink your real accounts through the app.
