import React from "react";
import { RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import type { NetWorthPoint } from "../../api/types";
import { formatMoney, useApi } from "../../hooks/useApi";
import { LineChart } from "../../components/LineChart";

export function NetWorthScreen() {
  const { width } = useWindowDimensions();
  const netWorth = useApi<NetWorthPoint[]>("/accounts/net-worth");

  const points = (netWorth.data ?? []).map((p) => ({ date: p.date.slice(5, 10), value: p.net_worth }));
  const latest = points.at(-1)?.value ?? 0;
  const first = points[0]?.value ?? 0;
  const delta = latest - first;

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="p-4"
      refreshControl={<RefreshControl refreshing={netWorth.loading} onRefresh={netWorth.refresh} tintColor="#94a3b8" />}
    >
      <View className="bg-slate-900 rounded-2xl p-5">
        <Text className="text-slate-400 text-sm">Net worth</Text>
        <Text className="text-white text-3xl font-bold mt-1">{formatMoney(latest)}</Text>
        <Text className={delta >= 0 ? "text-emerald-400 mt-1" : "text-red-400 mt-1"}>
          {delta >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(delta))} since tracking started
        </Text>

        <View className="mt-4">
          {netWorth.error ? (
            <Text className="text-red-400">{netWorth.error}</Text>
          ) : points.length < 2 ? (
            <Text className="text-slate-500">
              Not enough history yet — snapshots accumulate each time transactions sync.
            </Text>
          ) : (
            <LineChart points={points} width={width - 72} height={220} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
