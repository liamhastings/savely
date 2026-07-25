import { Router } from "express";
import { pool } from "../db/pool.js";
import { syncAllItems } from "../services/syncEngine.js";

export const transactionsRouter = Router();

// GET /transactions?month=2026-07&category_id=3&account_id=1&search=uber&limit=50&offset=0
transactionsRouter.get("/", async (req, res, next) => {
  try {
    const { month, category_id, account_id, search } = req.query;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const where: string[] = [];
    const params: unknown[] = [];

    if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      params.push(`${month}-01`);
      where.push(`t.date >= $${params.length}::date AND t.date < $${params.length}::date + INTERVAL '1 month'`);
    }
    if (category_id) {
      params.push(Number(category_id));
      where.push(`t.category_id = $${params.length}`);
    }
    if (account_id) {
      params.push(Number(account_id));
      where.push(`t.account_id = $${params.length}`);
    }
    if (typeof search === "string" && search.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(t.merchant_name ILIKE $${params.length} OR t.name ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT t.id, t.amount, t.date, t.merchant_name, t.name, t.pending,
              t.category_id, c.name AS category_name,
              a.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       JOIN accounts a ON a.id = t.account_id
       ${whereSql}
       ORDER BY t.date DESC, t.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Manual recategorization — locks the category so sync won't overwrite it.
transactionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const { category_id } = req.body ?? {};
    const { rows } = await pool.query(
      `UPDATE transactions SET category_id = $1, category_locked = TRUE
       WHERE id = $2 RETURNING id, category_id`,
      [category_id ?? null, Number(req.params.id)]
    );
    if (!rows.length) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// On-demand sync of all linked items.
transactionsRouter.post("/sync", async (_req, res, next) => {
  try {
    const results = await syncAllItems();
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// Spend by top-level category for a month (subcategories rolled up to parents).
// GET /transactions/spending?month=2026-07
transactionsRouter.get("/spending", async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? `${req.query.month}-01`
      : new Date().toISOString().slice(0, 8) + "01";

    const { rows } = await pool.query(
      `SELECT COALESCE(parent.id, c.id) AS category_id,
              COALESCE(parent.name, c.name, 'Uncategorized') AS category_name,
              SUM(t.amount)::float AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN categories parent ON parent.id = c.parent_category_id
       WHERE t.date >= $1::date AND t.date < $1::date + INTERVAL '1 month'
         AND t.amount > 0
         AND COALESCE(parent.name, c.name, 'Uncategorized') NOT IN ('Income', 'Transfers')
       GROUP BY 1, 2
       ORDER BY total DESC`,
      [month]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
