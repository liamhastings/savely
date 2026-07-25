import React, { useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { api } from "../../api/client";
import type { BudgetRow, Category } from "../../api/types";
import { formatMoney, thisMonth, useApi } from "../../hooks/useApi";

export function BudgetsScreen() {
  const month = thisMonth();
  const budgets = useApi<BudgetRow[]>(`/budgets?month=${month}`);
  const categories = useApi<Category[]>("/categories");

  const [adding, setAdding] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");

  const save = async () => {
    if (!selectedCat) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      Alert.alert("Enter a valid amount");
      return;
    }
    await api.put("/budgets", { category_id: selectedCat.id, month, allocated_amount: value });
    setAdding(false);
    setSelectedCat(null);
    setAmount("");
    budgets.refresh();
  };

  return (
    <View className="flex-1 bg-slate-950 p-4">
      <Text className="text-white font-semibold text-lg mb-3">Budgets · {month}</Text>

      <FlatList
        data={budgets.data ?? []}
        keyExtractor={(b) => String(b.id)}
        refreshControl={<RefreshControl refreshing={budgets.loading} onRefresh={budgets.refresh} tintColor="#94a3b8" />}
        ListEmptyComponent={
          budgets.loading ? null : (
            <Text className="text-slate-500 mt-8 text-center">No budgets yet — add one below.</Text>
          )
        }
        renderItem={({ item }) => {
          const pct = item.allocated_amount > 0 ? item.actual_amount / item.allocated_amount : 0;
          const over = pct > 1;
          return (
            <Pressable
              onPress={() => {
                setSelectedCat({ id: item.category_id, name: item.category_name, parent_category_id: null });
                setAmount(String(item.allocated_amount));
                setAdding(true);
              }}
              className="bg-slate-900 rounded-2xl p-4 mb-3 active:opacity-80"
            >
              <View className="flex-row justify-between mb-2">
                <Text className="text-slate-200 font-medium">{item.category_name}</Text>
                <Text className={over ? "text-red-400" : "text-slate-400"}>
                  {formatMoney(item.actual_amount)} / {formatMoney(item.allocated_amount)}
                </Text>
              </View>
              <View className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <View
                  className={`h-2.5 rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(pct * 100, 100)}%` }}
                />
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => { setSelectedCat(null); setAmount(""); setAdding(true); }}
        className="bg-emerald-600 rounded-xl py-3 items-center active:opacity-80"
      >
        <Text className="text-white font-semibold">+ Set a budget</Text>
      </Pressable>

      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <Pressable className="flex-1 bg-black/60" onPress={() => setAdding(false)} />
        <View className="bg-slate-900 rounded-t-3xl p-5 max-h-[70%]">
          <Text className="text-white font-semibold text-lg mb-3">
            {selectedCat ? selectedCat.name : "Choose category"}
          </Text>

          {!selectedCat ? (
            <FlatList
              data={(categories.data ?? []).filter((c) => !c.parent_category_id)}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <Pressable onPress={() => setSelectedCat(item)} className="py-3 border-b border-slate-800 active:opacity-70">
                  <Text className="text-slate-200">{item.name}</Text>
                </Pressable>
              )}
            />
          ) : (
            <>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Monthly amount"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                className="bg-slate-800 text-white rounded-xl px-4 py-3 mb-3"
              />
              <Pressable onPress={save} className="bg-emerald-600 rounded-xl py-3 items-center active:opacity-80">
                <Text className="text-white font-semibold">Save</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
