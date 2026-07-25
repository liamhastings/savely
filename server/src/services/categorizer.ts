import { pool } from "../db/pool.js";

interface Rule {
  pattern: string;
  category_id: number;
}

// Fallback: map Plaid's personal_finance_category.primary to our category names.
const PLAID_PFC_MAP: Record<string, string> = {
  INCOME: "Income",
  TRANSFER_IN: "Transfers",
  TRANSFER_OUT: "Transfers",
  LOAN_PAYMENTS: "Bills & Utilities",
  BANK_FEES: "Fees & Charges",
  ENTERTAINMENT: "Entertainment",
  FOOD_AND_DRINK: "Food & Drink",
  GENERAL_MERCHANDISE: "Shopping",
  HOME_IMPROVEMENT: "Housing",
  MEDICAL: "Health & Fitness",
  PERSONAL_CARE: "Personal Care",
  GENERAL_SERVICES: "Bills & Utilities",
  GOVERNMENT_AND_NON_PROFIT: "Fees & Charges",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  RENT_AND_UTILITIES: "Bills & Utilities",
};

let rulesCache: Rule[] | null = null;
let categoryIdByName: Map<string, number> | null = null;

export async function reloadCategorizer(): Promise<void> {
  const rules = await pool.query(
    "SELECT pattern, category_id FROM categorization_rules ORDER BY priority ASC, id ASC"
  );
  rulesCache = rules.rows;

  const cats = await pool.query("SELECT id, name FROM categories");
  categoryIdByName = new Map(cats.rows.map((r) => [r.name, r.id]));
}

/**
 * Returns a category_id for a transaction, or null if nothing matches.
 * Order: user-defined merchant rules first, then Plaid's own category, then Uncategorized.
 */
export async function categorize(
  merchantName: string | null | undefined,
  transactionName: string | null | undefined,
  plaidPfcPrimary: string | null | undefined
): Promise<number | null> {
  if (!rulesCache || !categoryIdByName) await reloadCategorizer();

  const haystack = `${merchantName ?? ""} ${transactionName ?? ""}`.toLowerCase();
  for (const rule of rulesCache!) {
    if (haystack.includes(rule.pattern.toLowerCase())) return rule.category_id;
  }

  if (plaidPfcPrimary) {
    const mapped = PLAID_PFC_MAP[plaidPfcPrimary];
    if (mapped) {
      const id = categoryIdByName!.get(mapped);
      if (id) return id;
    }
  }

  return categoryIdByName!.get("Uncategorized") ?? null;
}
