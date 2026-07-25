import React, { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../../api/client";
import type { Account, SpendingRow } from "../../api/types";
import { formatMoney, thisMonth, useApi } from "../../hooks/useApi";
import { PlaidLinkButton } from "../../components/PlaidLinkButton";

export function DashboardScreen() {
  const accounts = useApi<Account[]>("/accounts");
  const spending = useApi<SpendingRow[]>(`/transactions/spending?month=${thisMonth()}`);
  const [syncing, setSyncing] = useState(false);

  const refreshAll = () => {
    accounts.refresh();
    spending.refresh();
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await api.post("/transactions/sync");
      refreshAll();
    } catch (err) {
      Alert.alert("Sync failed", err instanceof Error ? err.message : "unknown error");
    } finally {
      setSyncing(false);
    }
  };

  const assets = (accounts.data ?? [])
    .filter((a) => !["credit", "loan"].includes(a.type))
    .reduce((s, a) => s + a.current_balance, 0);
  const debts = (accounts.data ?? [])
    .filter((a) => ["credit", "loan"].includes(a.type))
    .reduce((s, a) => s + a.current_balance, 0);

  const totalSpend = (spending.data ?? []).reduce((s, r) => s + r.total, 0);
  const maxSpend = Math.max(...(spending.data ?? []).map((r) => r.total), 1);

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="p-4 pb-12"
      refreshControl={<RefreshControl refreshing={accounts.loading} onRefresh={refreshAll} tintColor="#94a3b8" />}
    >
      <View className="bg-slate-900 rounded-2xl p-5 mb-4">
        <Text className="text-slate-400 text-sm">Net worth</Text>
        <Text className="text-white text-3xl font-bold mt-1">{formatMoney(assets - debts)}</Text>
        <View className="flex-row mt-3">
          <Text className="text-emerald-400 mr-4">Assets {formatMoney(assets)}</Text>
          <Text className="text-red-400">Debts {formatMoney(debts)}</Text>
        </View>
      </View>

      <View className="bg-slate-900 rounded-2xl p-5 mb-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white font-semibold text-lg">Spending this month</Text>
          <Text className="text-slate-400">{formatMoney(totalSpend)}</Text>
        </View>
        {spending.error && <Text className="text-red-400">{spending.error}</Text>}
        {(spending.data ?? []).slice(0, 6).map((row) => (
          <View key={`${row.category_id}`} className="mb-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-slate-300">{row.category_name}</Text>
              <Text className="text-slate-400">{formatMoney(row.total)}</Text>
            </View>
            <View className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-2 bg-emerald-500 rounded-full"
                style={{ width: `${Math.max((row.total / maxSpend) * 100, 3)}%` }}
              />
            </View>
          </View>
        ))}
        {!spending.loading && !(spending.data ?? []).length && (
          <Text className="text-slate-500">No transactions yet — link an account and sync.</Text>
        )}
      </View>

      <View className="bg-slate-900 rounded-2xl p-5 mb-4">
        <Text className="text-white font-semibold text-lg mb-3">Accounts</Text>
        {(accounts.data ?? []).map((a) => (
          <View key={a.id} className="flex-row justify-between py-2 border-b border-slate-800">
            <View>
              <Text className="text-slate-200">{a.name}</Text>
              <Text className="text-slate-500 text-xs">{a.institution_name ?? a.type}</Text>
            </View>
            <Text className={["credit", "loan"].includes(a.type) ? "text-red-400" : "text-slate-200"}>
              {formatMoney(a.current_balance)}
            </Text>
          </View>
        ))}
      </View>

      <PlaidLinkButton onLinked={refreshAll} />
      <Pressable onPress={sync} disabled={syncing} className="mt-3 bg-slate-800 rounded-xl py-3 items-center active:opacity-80">
        <Text className="text-slate-200 font-semibold">{syncing ? "Syncing…" : "Sync transactions"}</Text>
      </Pressable>
    </ScrollView>
  );
}
