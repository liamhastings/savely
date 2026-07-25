import "../env.js";
import fs from "fs";
import path from "path";
import { pool } from "./pool.js";

// Applies every .sql file in ./migrations in filename order, tracking what has
// already run in a _migrations table.
async function migrate() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );

  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rowCount } = await pool.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
    if (rowCount) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log("migrations up to date");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
