import "../env.js";
import { pool } from "./pool.js";

// Assigns data created before multi-user support (user_id IS NULL) to one user.
// Usage: npm run claim -- <supabase-user-id>
// Find the id in Supabase → Authentication → Users (the "UID" column).
async function claim() {
  const userId = process.argv[2];
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    console.error("usage: npm run claim -- <supabase-user-id (uuid)>");
    process.exit(1);
  }

  const items = await pool.query("UPDATE plaid_items SET user_id = $1 WHERE user_id IS NULL", [userId]);
  const budgets = await pool.query("UPDATE budgets SET user_id = $1 WHERE user_id IS NULL", [userId]);
  console.log(`claimed ${items.rowCount} linked institution(s) and ${budgets.rowCount} budget(s) for ${userId}`);
  await pool.end();
}

claim().catch((err) => {
  console.error(err);
  process.exit(1);
});
