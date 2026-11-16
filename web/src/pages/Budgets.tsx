import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { BudgetRow, Category } from "../api/types";
import { formatMoney, monthLabel, thisMonth, useApi } from "../hooks/useApi";
import { Modal } from "../components/Modal";

export function BudgetsPage() {
  const month = thisMonth();
  const budgets = useApi<BudgetRow[]>(`/budgets?month=${month}`);
  const categories = useApi<Category[]>("/categories");

  const [adding, setAdding] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEditor = (cat: Category | null, value: string) => {
    setSelectedCat(cat);
    setAmount(value);
    setFormError(null);
    setAdding(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;
    const value = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(value) || value < 0) {
      setFormError("Enter an amount of 0 or more.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.put("/budgets", { category_id: selectedCat.id, month, allocated_amount: value });
      setAdding(false);
      budgets.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save the budget");
    } finally {
      setSaving(false);
    }
  };

  const rows = budgets.data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Budgets</h1>
          <p className="text-slate-400 text-sm">{monthLabel(month)}</p>
        </div>
        <button
          onClick={() => openEditor(null, "")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 py-2.5 transition-colors"
        >
          + Set a budget
        </button>
      </div>

      {budgets.error && <p className="text-red-400 mb-3">{budgets.error}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((b) => {
          const pct = b.allocated_amount > 0 ? b.actual_amount / b.allocated_amount : 0;
          const over = b.actual_amount > b.allocated_amount;
          return (
            <button
              key={b.id}
              onClick={() =>
                openEditor(
                  { id: b.category_id, name: b.category_name, parent_category_id: null },
                  String(b.allocated_amount)
                )
              }
              title="Edit budget"
              className="bg-slate-900 hover:bg-slate-800/70 rounded-2xl p-4 text-left transition-colors"
            >
              <div className="flex justify-between gap-3 mb-2">
                <span className="text-slate-200 font-medium truncate">{b.category_name}</span>
                <span className={`shrink-0 ${over ? "text-red-400" : "text-slate-400"}`}>
                  {formatMoney(b.actual_amount)} / {formatMoney(b.allocated_amount)}
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${over ? 100 : Math.min(pct * 100, 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      {!budgets.loading && !budgets.error && !rows.length && (
        <p className="text-slate-500 mt-10 text-center">No budgets for this month yet — set one to start tracking.</p>
      )}

      {adding && (
        <Modal title={selectedCat ? selectedCat.name : "Choose a category"} onClose={() => setAdding(false)}>
          {!selectedCat ? (
            (categories.data ?? [])
              .filter((c) => !c.parent_category_id)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c)}
                  className="block w-full text-left text-slate-200 hover:text-emerald-400 py-2.5 border-b border-slate-800 last:border-0"
                >
                  {c.name}
                </button>
              ))
          ) : (
            <form onSubmit={save}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monthly amount"
                aria-label="Monthly amount"
                autoFocus
                className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-3 mb-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {formError && <p className="text-red-400 mb-3">{formError}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
