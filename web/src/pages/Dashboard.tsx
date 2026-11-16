import { useState } from "react";
import { api } from "../api/client";
import type { Account, SpendingRow } from "../api/types";
import { formatMoney, thisMonth, useApi } from "../hooks/useApi";
import { PlaidLinkButton } from "../components/PlaidLinkButton";

const isDebt = (a: Account) => ["credit", "loan"].includes(a.type);

export function DashboardPage() {
  const accounts = useApi<Account[]>("/accounts");
  const spending = useApi<SpendingRow[]>(`/transactions/spending?month=${thisMonth()}`);
  const [syncing, setSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshAll = () => {
    setActionError(null);
    accounts.refresh();
    spending.refresh();
  };

  const sync = async () => {
    setSyncing(true);
    setActionError(null);
    try {
      await api.post("/transactions/sync");
      refreshAll();
    } catch (err) {
      setActionError(`Sync failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const list = accounts.data ?? [];
  const assets = list.filter((a) => !isDebt(a)).reduce((s, a) => s + a.current_balance, 0);
  const debts = list.filter(isDebt).reduce((s, a) => s + a.current_balance, 0);

  const rows = spending.data ?? [];
  const totalSpend = rows.reduce((s, r) => s + r.total, 0);
  const maxSpend = Math.max(...rows.map((r) => r.total), 1);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={sync}
            disabled={syncing}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            {syncing ? "Syncing…" : "Sync transactions"}
          </button>
          <PlaidLinkButton onLinked={refreshAll} onError={setActionError} />
        </div>
      </div>

      {actionError && <p className="text-red-400 mb-4">{actionError}</p>}
      {accounts.error && <p className="text-red-400 mb-4">{accounts.error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-slate-900 rounded-2xl p-5 lg:col-span-2">
          <p className="text-slate-400 text-sm">Net worth</p>
          <p className="text-white text-4xl font-bold mt-1">{formatMoney(assets - debts)}</p>
          <div className="flex gap-4 mt-3">
            <span className="text-emerald-400">Assets {formatMoney(assets)}</span>
            <span className="text-red-400">Debts {formatMoney(debts)}</span>
          </div>
        </section>

        <section className="bg-slate-900 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-semibold text-lg">Spending this month</h2>
            <span className="text-slate-400">{formatMoney(totalSpend)}</span>
          </div>
          {spending.error && <p className="text-red-400">{spending.error}</p>}
          {rows.slice(0, 8).map((row) => (
            <div key={`${row.category_id}`} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">{row.category_name}</span>
                <span className="text-slate-400">{formatMoney(row.total)}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-emerald-500 rounded-full"
                  style={{ width: `${Math.max((row.total / maxSpend) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))}
          {!spending.loading && !spending.error && !rows.length && (
            <p className="text-slate-500">No spending yet this month — link an account and sync.</p>
          )}
        </section>

        <section className="bg-slate-900 rounded-2xl p-5">
          <h2 className="text-white font-semibold text-lg mb-2">Accounts</h2>
          {list.map((a) => (
            <div key={a.id} className="flex justify-between items-center py-2.5 border-b border-slate-800 last:border-0">
              <div className="min-w-0 pr-3">
                <p className="text-slate-200 truncate">{a.name}</p>
                <p className="text-slate-500 text-xs">{a.institution_name ?? a.type}</p>
              </div>
              <span className={isDebt(a) ? "text-red-400" : "text-slate-200"}>{formatMoney(a.current_balance)}</span>
            </div>
          ))}
          {!accounts.loading && !accounts.error && !list.length && (
            <p className="text-slate-500">No accounts linked yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
