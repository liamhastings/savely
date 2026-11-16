import { Router } from "express";
import { pool } from "../db/pool.js";

export const accountsRouter = Router();

accountsRouter.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.name, a.type, a.subtype, a.current_balance::float AS current_balance,
              i.institution_name
       FROM accounts a
       JOIN plaid_items i ON i.id = a.item_id
       WHERE i.user_id = $1 AND NOT a.hidden
       ORDER BY a.type, a.name`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Net worth over time. For each day since the first snapshot, carry forward each
// account's last known balance; credit and loan balances count as liabilities.
accountsRouter.get("/net-worth", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `WITH my_accounts AS (
         SELECT a.id, a.type
         FROM accounts a
         JOIN plaid_items i ON i.id = a.item_id
         WHERE i.user_id = $1 AND NOT a.hidden
       ),
       days AS (
         SELECT generate_series(
           (SELECT COALESCE(MIN(s.date), CURRENT_DATE)
            FROM account_balance_snapshots s
            JOIN my_accounts a ON a.id = s.account_id),
           CURRENT_DATE,
           '1 day'
         )::date AS date
       )
       SELECT to_char(d.date, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(
                CASE WHEN a.type IN ('credit', 'loan') THEN -s.balance ELSE s.balance END
              ), 0)::float AS net_worth
       FROM days d
       CROSS JOIN my_accounts a
       LEFT JOIN LATERAL (
         SELECT balance FROM account_balance_snapshots s
         WHERE s.account_id = a.id AND s.date <= d.date
         ORDER BY s.date DESC LIMIT 1
       ) s ON TRUE
       GROUP BY d.date
       ORDER BY d.date`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
