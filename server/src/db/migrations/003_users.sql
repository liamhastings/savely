-- Multi-user. Users live in Supabase Auth; user_id is the Supabase auth.users.id.
-- Accounts, transactions and balance snapshots are owned through their plaid_item.
-- Categories and categorization rules stay shared across all users.
--
-- Rows created before this migration keep user_id NULL and are invisible until
-- claimed with:  npm run claim -- <user-id>

ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_plaid_items_user ON plaid_items(user_id);

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_category_month_key
  ON budgets(user_id, category_id, month);
