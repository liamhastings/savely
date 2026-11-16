import type { NetWorthPoint } from "../api/types";
import { formatMoney, useApi } from "../hooks/useApi";
import { LineChart } from "../components/LineChart";

export function NetWorthPage() {
  const netWorth = useApi<NetWorthPoint[]>("/accounts/net-worth");

  const points = (netWorth.data ?? []).map((p) => ({ date: p.date.slice(5, 10), value: p.net_worth }));
  const latest = points.at(-1)?.value ?? 0;
  const first = points[0]?.value ?? 0;
  const delta = latest - first;

  return (
    <>
      <h1 className="text-white text-2xl font-bold mb-6">Net Worth</h1>

      <section className="bg-slate-900 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">Net worth</p>
        <p className="text-white text-4xl font-bold mt-1">{formatMoney(latest)}</p>
        {points.length >= 2 && (
          <p className={`mt-1 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(delta))} since tracking started
          </p>
        )}

        <div className="mt-5">
          {netWorth.error ? (
            <p className="text-red-400">{netWorth.error}</p>
          ) : netWorth.loading && !netWorth.data ? null : points.length < 2 ? (
            <p className="text-slate-500">
              Not enough history yet — a balance snapshot is saved each day transactions sync.
            </p>
          ) : (
            <LineChart points={points} height={320} />
          )}
        </div>
      </section>
    </>
  );
}
