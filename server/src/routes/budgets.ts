import { Router } from "express";
import { pool } from "../db/pool.js";

export const budgetsRouter = Router();

function parseMonth(raw: unknown): string {
  return typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)
    ? `${raw}-01`
    : new Date().toISOString().slice(0, 8) + "01";
}

// Budget vs. actual for a month. Actual spend for a category includes its subcategories.
// GET /budgets?month=2026-07
budgetsRouter.get("/", async (req, res, next) => {
  try {
    const month = parseMonth(req.query.month);
    const { rows } = await pool.query(
      `SELECT b.id, b.category_id, c.name AS category_name,
              b.allocated_amount::float AS allocated_amount,
              COALESCE((
                SELECT SUM(t.amount)
                FROM transactions t
                JOIN categories tc ON tc.id = t.category_id
                WHERE (tc.id = b.category_id OR tc.parent_category_id = b.category_id)
                  AND t.amount > 0
                  AND t.date >= b.month AND t.date < b.month + INTERVAL '1 month'
              ), 0)::float AS actual_amount
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.month = $1
       ORDER BY c.name`,
      [month]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Upsert one budget line. PUT /budgets  { category_id, month: "2026-07", allocated_amount }
budgetsRouter.put("/", async (req, res, next) => {
  try {
    const { category_id, allocated_amount } = req.body ?? {};
    const month = parseMonth(req.body?.month);
    if (!category_id) {
      res.status(400).json({ error: "category_id required" });
      return;
    }
    const { rows } = await pool.query(
      `INSERT INTO budgets (category_id, month, allocated_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (category_id, month)
       DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount
       RETURNING id, category_id, month, allocated_amount::float AS allocated_amount`,
      [category_id, month, allocated_amount ?? 0]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
