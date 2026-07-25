import { Router } from "express";
import { pool } from "../db/pool.js";

export const accountsRouter = Router();

accountsRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.name, a.type, a.subtype, a.current_balance::float AS current_balance,
              i.institution_name
       FROM accounts a
       LEFT JOIN plaid_items i ON i.id = a.item_id
       WHERE NOT a.hidden
       ORDER BY a.type, a.name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Net worth over time. For each day since the first snapshot, carry forward each
// account's last known balance; credit and loan balances count as liabilities.
accountsRouter.get("/net-worth", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `WITH days AS (
         SELECT generate_series(
           (SELECT COALESCE(MIN(date), CURRENT_DATE) FROM account_balance_snapshots),
           CURRENT_DATE,
           '1 day'
         )::date AS date
       )
       SELECT d.date,
              COALESCE(SUM(
                CASE WHEN a.type IN ('credit', 'loan') THEN -s.balance ELSE s.balance END
              ), 0)::float AS net_worth
       FROM days d
       CROSS JOIN accounts a
       LEFT JOIN LATERAL (
         SELECT balance FROM account_balance_snapshots s
         WHERE s.account_id = a.id AND s.date <= d.date
         ORDER BY s.date DESC LIMIT 1
       ) s ON TRUE
       WHERE NOT a.hidden
       GROUP BY d.date
       ORDER BY d.date`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
