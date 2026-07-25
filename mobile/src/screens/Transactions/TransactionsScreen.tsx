import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { api } from "../../api/client";
import type { Category, Transaction } from "../../api/types";
import { formatMoney, thisMonth, useApi } from "../../hooks/useApi";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function TransactionsScreen() {
  const [month, setMonth] = useState(thisMonth());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const path = useMemo(() => {
    const params = new URLSearchParams({ month, limit: "200" });
    if (search.trim()) params.set("search", search.trim());
    return `/transactions?${params}`;
  }, [month, search]);

  const txns = useApi<Transaction[]>(path);
  const categories = useApi<Category[]>("/categories");

  const recategorize = async (categoryId: number) => {
    if (!editing) return;
    try {
      await api.patch(`/transactions/${editing.id}`, { category_id: categoryId });
      txns.refresh();
    } finally {
      setEditing(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-950 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} className="px-3 py-1">
          <Text className="text-emerald-400 text-lg">‹</Text>
        </Pressable>
        <Text className="text-white font-semibold text-lg">{month}</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} className="px-3 py-1">
          <Text className="text-emerald-400 text-lg">›</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search merchants…"
        placeholderTextColor="#64748b"
        className="bg-slate-800 text-white rounded-xl px-4 py-2 mb-3"
      />

      {txns.error && <Text className="text-red-400 mb-2">{txns.error}</Text>}

      <FlatList
        data={txns.data ?? []}
        keyExtractor={(t) => String(t.id)}
        refreshControl={<RefreshControl refreshing={txns.loading} onRefresh={txns.refresh} tintColor="#94a3b8" />}
        ListEmptyComponent={
          txns.loading ? null : <Text className="text-slate-500 mt-8 text-center">No transactions.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setEditing(item)}
            className="flex-row justify-between py-3 border-b border-slate-800 active:opacity-70"
          >
            <View className="flex-1 pr-3">
              <Text className="text-slate-200" numberOfLines={1}>
                {item.merchant_name ?? item.name ?? "Unknown"}
                {item.pending ? "  ⏳" : ""}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                {item.date.slice(0, 10)} · {item.category_name ?? "Uncategorized"} · {item.account_name}
              </Text>
            </View>
            <Text className={item.amount < 0 ? "text-emerald-400" : "text-slate-200"}>
              {item.amount < 0 ? "+" : ""}{formatMoney(Math.abs(item.amount))}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable className="flex-1 bg-black/60" onPress={() => setEditing(null)} />
        <View className="bg-slate-900 rounded-t-3xl p-5 max-h-[60%]">
          <Text className="text-white font-semibold text-lg mb-1">
            {editing?.merchant_name ?? editing?.name}
          </Text>
          <Text className="text-slate-400 mb-4">Pick a category</Text>
          <FlatList
            data={categories.data ?? []}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item }) => (
              <Pressable onPress={() => recategorize(item.id)} className="py-3 border-b border-slate-800 active:opacity-70">
                <Text className={item.id === editing?.category_id ? "text-emerald-400" : "text-slate-200"}>
                  {item.parent_category_id ? "   " : ""}{item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
