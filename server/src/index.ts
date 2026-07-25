import "./env.js";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { authRouter } from "./routes/auth.js";
import { plaidRouter } from "./routes/plaid.js";
import { transactionsRouter } from "./routes/transactions.js";
import { accountsRouter } from "./routes/accounts.js";
import { budgetsRouter } from "./routes/budgets.js";
import { categoriesRouter } from "./routes/categories.js";
import { requireAuth } from "./middleware/auth.js";
import { syncAllItems } from "./services/syncEngine.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);

app.use("/plaid", requireAuth, plaidRouter);
app.use("/transactions", requireAuth, transactionsRouter);
app.use("/accounts", requireAuth, accountsRouter);
app.use("/budgets", requireAuth, budgetsRouter);
app.use("/categories", requireAuth, categoriesRouter);

// Basic error handler so route errors return JSON instead of hanging.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "internal error";
  res.status(500).json({ error: message });
});

// Refresh transactions every 6 hours.
cron.schedule("0 */6 * * *", () => {
  syncAllItems().catch((err) => console.error("cron sync failed:", err));
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Savely server listening on :${port} (Plaid env: ${process.env.PLAID_ENV ?? "sandbox"})`);
});
