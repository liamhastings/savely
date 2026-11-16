import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Category, Transaction } from "../api/types";
import { formatMoney, monthLabel, shiftMonth, thisMonth, useApi } from "../hooks/useApi";
import { Modal } from "../components/Modal";

export function TransactionsPage() {
  const [month, setMonth] = useState(thisMonth());
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Wait for a pause in typing before hitting the server.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const path = useMemo(() => {
    const params = new URLSearchParams({ month, limit: "200" });
    if (query) params.set("search", query);
    return `/transactions?${params}`;
  }, [month, query]);

  const txns = useApi<Transaction[]>(path);
  const categories = useApi<Category[]>("/categories");

  // Parents first, each followed by its subcategories.
  const categoryTree = useMemo(() => {
    const all = categories.data ?? [];
    return all
      .filter((c) => !c.parent_category_id)
      .flatMap((parent) => [parent, ...all.filter((c) => c.parent_category_id === parent.id)]);
  }, [categories.data]);

  const recategorize = async (categoryId: number) => {
    if (!editing) return;
    setSaveError(null);
    try {
      await api.patch(`/transactions/${editing.id}`, { category_id: categoryId });
      txns.refresh();
    } catch (err) {
      setSaveError(`Couldn't change the category: ${err instanceof Error ? err.message : "request failed"}`);
    } finally {
      setEditing(null);
    }
  };

  const rows = txns.data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-white text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Previous month"
            className="text-emerald-400 hover:bg-slate-800 rounded-lg px-3 py-1 text-xl"
          >
            ‹
          </button>
          <span className="text-white font-semibold w-40 text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
            className="text-emerald-400 hover:bg-slate-800 rounded-lg px-3 py-1 text-xl"
          >
            ›
          </button>
        </div>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search merchants…"
        aria-label="Search merchants"
        className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {txns.error && <p className="text-red-400 mb-3">{txns.error}</p>}
      {saveError && <p className="text-red-400 mb-3">{saveError}</p>}

      <div className="bg-slate-900 rounded-2xl px-5">
        {rows.map((t) => (
          <button
            key={t.id}
            onClick={() => setEditing(t)}
            title="Change category"
            className="w-full flex items-center justify-between gap-3 py-3 border-b border-slate-800 last:border-0 text-left hover:opacity-80"
          >
            <div className="min-w-0">
              <p className="text-slate-200 truncate">
                {t.merchant_name ?? t.name ?? "Unknown"}
                {t.pending && <span className="text-slate-500 text-xs ml-2">pending</span>}
              </p>
              <p className="text-slate-500 text-xs mt-0.5 truncate">
                {t.date.slice(0, 10)} · {t.category_name ?? "Uncategorized"} · {t.account_name}
              </p>
            </div>
            <span className={`shrink-0 tabular-nums ${t.amount < 0 ? "text-emerald-400" : "text-slate-200"}`}>
              {t.amount < 0 ? "+" : ""}
              {formatMoney(Math.abs(t.amount))}
            </span>
          </button>
        ))}
        {!txns.loading && !txns.error && !rows.length && (
          <p className="text-slate-500 py-10 text-center">
            {query ? `No transactions matching “${query}” in ${monthLabel(month)}.` : `No transactions in ${monthLabel(month)}.`}
          </p>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.merchant_name ?? editing.name ?? "Transaction"}
          subtitle="Pick a category"
          onClose={() => setEditing(null)}
        >
          {categoryTree.map((c) => (
            <button
              key={c.id}
              onClick={() => recategorize(c.id)}
              className={`block w-full text-left py-2.5 border-b border-slate-800 last:border-0 hover:text-emerald-400 ${
                c.parent_category_id ? "pl-5" : ""
              } ${c.id === editing.category_id ? "text-emerald-400" : "text-slate-200"}`}
            >
              {c.name}
            </button>
          ))}
        </Modal>
      )}
    </>
  );
}
