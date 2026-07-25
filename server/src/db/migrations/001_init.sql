CREATE TABLE IF NOT EXISTS plaid_items (
  id SERIAL PRIMARY KEY,
  plaid_item_id TEXT UNIQUE NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  institution_name TEXT,
  sync_cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  parent_category_id INTEGER REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT UNIQUE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  date DATE NOT NULL,
  merchant_name TEXT,
  name TEXT,
  category_id INTEGER REFERENCES categories(id),
  category_locked BOOLEAN NOT NULL DEFAULT FALSE,
  pending BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  month DATE NOT NULL,
  allocated_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  UNIQUE (category_id, month)
);

CREATE TABLE IF NOT EXISTS account_balance_snapshots (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  balance NUMERIC(14, 2) NOT NULL,
  UNIQUE (account_id, date)
);

CREATE TABLE IF NOT EXISTS categorization_rules (
  id SERIAL PRIMARY KEY,
  pattern TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  priority INTEGER NOT NULL DEFAULT 100
);
