import { Router } from "express";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "../services/plaidClient.js";
import { encrypt } from "../services/crypto.js";
import { pool } from "../db/pool.js";
import { syncItem } from "../services/syncEngine.js";

export const plaidRouter = Router();

// Step 1 of Link flow: the app asks for a link_token, opens Plaid Link with it.
plaidRouter.post("/link-token", async (_req, res, next) => {
  try {
    const { data } = await plaidClient.linkTokenCreate({
      user: { client_user_id: "owner" },
      client_name: "Savely",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    res.json({ link_token: data.link_token });
  } catch (err) {
    next(err);
  }
});

// Step 2: app returns the public_token; exchange it, store access_token encrypted,
// then run an initial sync so data shows up immediately.
plaidRouter.post("/exchange", async (req, res, next) => {
  try {
    const { public_token, institution_name } = req.body ?? {};
    if (!public_token) {
      res.status(400).json({ error: "public_token required" });
      return;
    }

    const { data } = await plaidClient.itemPublicTokenExchange({ public_token });

    const { rows } = await pool.query(
      `INSERT INTO plaid_items (plaid_item_id, access_token_encrypted, institution_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (plaid_item_id) DO UPDATE SET institution_name = EXCLUDED.institution_name
       RETURNING id`,
      [data.item_id, encrypt(data.access_token), institution_name ?? null]
    );

    const result = await syncItem(rows[0].id);
    res.json({ item_id: rows[0].id, initial_sync: result });
  } catch (err) {
    next(err);
  }
});

plaidRouter.get("/items", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.institution_name, i.created_at,
              COUNT(a.id)::int AS account_count
       FROM plaid_items i
       LEFT JOIN accounts a ON a.item_id = i.id
       GROUP BY i.id
       ORDER BY i.id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
