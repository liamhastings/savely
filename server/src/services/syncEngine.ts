import type { RemovedTransaction, Transaction } from "plaid";
import { pool } from "../db/pool.js";
import { plaidClient } from "./plaidClient.js";
import { decrypt } from "./crypto.js";
import { categorize } from "./categorizer.js";

export interface SyncResult {
  itemId: number;
  added: number;
  modified: number;
  removed: number;
}

/** Sync all linked items. Called on demand from the app and by cron. */
export async function syncAllItems(): Promise<SyncResult[]> {
  const { rows: items } = await pool.query("SELECT id FROM plaid_items ORDER BY id");
  const results: SyncResult[] = [];
  for (const item of items) {
    results.push(await syncItem(item.id));
  }
  return results;
}

export async function syncItem(itemId: number): Promise<SyncResult> {
  const { rows } = await pool.query(
    "SELECT id, access_token_encrypted, sync_cursor FROM plaid_items WHERE id = $1",
    [itemId]
  );
  if (!rows.length) throw new Error(`plaid_items id ${itemId} not found`);

  const accessToken = decrypt(rows[0].access_token_encrypted);
  let cursor: string | undefined = rows[0].sync_cursor ?? undefined;

  await upsertAccounts(itemId, accessToken);

  let added = 0;
  let modified = 0;
  let removed = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });

    for (const txn of data.added) {
      if (await upsertTransaction(txn)) added++;
    }
    for (const txn of data.modified) {
      if (await upsertTransaction(txn)) modified++;
    }
    for (const txn of data.removed) {
      removed += await removeTransaction(txn);
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;

    // Persist the cursor after each page so a crash mid-sync resumes cleanly.
    await pool.query("UPDATE plaid_items SET sync_cursor = $1 WHERE id = $2", [cursor, itemId]);
  }

  return { itemId, added, modified, removed };
}

async function upsertAccounts(itemId: number, accessToken: string): Promise<void> {
  const { data } = await plaidClient.accountsGet({ access_token: accessToken });

  for (const acct of data.accounts) {
    const balance = acct.balances.current ?? 0;
    const { rows } = await pool.query(
      `INSERT INTO accounts (item_id, plaid_account_id, name, type, subtype, current_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (plaid_account_id)
       DO UPDATE SET name = EXCLUDED.name, current_balance = EXCLUDED.current_balance
       RETURNING id`,
      [itemId, acct.account_id, acct.name, acct.type, acct.subtype, balance]
    );

    // Daily balance snapshot for net-worth history.
    await pool.query(
      `INSERT INTO account_balance_snapshots (account_id, date, balance)
       VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (account_id, date) DO UPDATE SET balance = EXCLUDED.balance`,
      [rows[0].id, balance]
    );
  }
}

/** Returns true if the row was written (account known), false if skipped. */
async function upsertTransaction(txn: Transaction): Promise<boolean> {
  const { rows: acctRows } = await pool.query(
    "SELECT id FROM accounts WHERE plaid_account_id = $1",
    [txn.account_id]
  );
  if (!acctRows.length) return false;

  const categoryId = await categorize(
    txn.merchant_name,
    txn.name,
    txn.personal_finance_category?.primary
  );

  // category_locked rows keep the user's manual category on re-sync.
  await pool.query(
    `INSERT INTO transactions
       (account_id, plaid_transaction_id, amount, date, merchant_name, name, category_id, pending)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (plaid_transaction_id)
     DO UPDATE SET
       amount = EXCLUDED.amount,
       date = EXCLUDED.date,
       merchant_name = EXCLUDED.merchant_name,
       name = EXCLUDED.name,
       pending = EXCLUDED.pending,
       category_id = CASE WHEN transactions.category_locked THEN transactions.category_id
                          ELSE EXCLUDED.category_id END`,
    [
      acctRows[0].id,
      txn.transaction_id,
      txn.amount,
      txn.date,
      txn.merchant_name ?? null,
      txn.name ?? null,
      categoryId,
      txn.pending,
    ]
  );
  return true;
}

async function removeTransaction(txn: RemovedTransaction): Promise<number> {
  const { rowCount } = await pool.query(
    "DELETE FROM transactions WHERE plaid_transaction_id = $1",
    [txn.transaction_id]
  );
  return rowCount ?? 0;
}
