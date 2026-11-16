-- Reference schema (the migrations in ./migrations are the source of truth).

-- Users live in Supabase Auth; user_id columns hold the Supabase auth.users.id.
-- Accounts, transactions and snapshots are owned through their plaid_item.

CREATE TABLE plaid_items (
  id SERIAL PRIMARY KEY,
  user_id UUID,                     -- NULL only for rows that predate multi-user (npm run claim)
  plaid_item_id TEXT UNIQUE NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  institution_name TEXT,
  sync_cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plaid_items_user ON plaid_items(user_id);

CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,            -- depository | credit | loan | investment | other
  subtype TEXT,
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  parent_category_id INTEGER REFERENCES categories(id)
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT UNIQUE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,   -- Plaid convention: positive = money out
  date DATE NOT NULL,
  merchant_name TEXT,
  name TEXT,
  category_id INTEGER REFERENCES categories(id),
  category_locked BOOLEAN NOT NULL DEFAULT FALSE,  -- user override; sync won't recategorize
  pending BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);

CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  month DATE NOT NULL,              -- first day of month
  allocated_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  UNIQUE (user_id, category_id, month)
);

-- Daily balance snapshots taken during sync, for net-worth-over-time.
CREATE TABLE account_balance_snapshots (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  balance NUMERIC(14, 2) NOT NULL,
  UNIQUE (account_id, date)
);

-- Rule-based categorizer: first matching pattern (by priority) wins.
CREATE TABLE categorization_rules (
  id SERIAL PRIMARY KEY,
  pattern TEXT NOT NULL,            -- case-insensitive substring match on merchant/name
  category_id INTEGER NOT NULL REFERENCES categories(id),
  priority INTEGER NOT NULL DEFAULT 100
);
