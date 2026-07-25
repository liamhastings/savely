import React from "react";
import { Text } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DashboardScreen } from "../screens/Dashboard/DashboardScreen";
import { TransactionsScreen } from "../screens/Transactions/TransactionsScreen";
import { BudgetsScreen } from "../screens/Budgets/BudgetsScreen";
import { NetWorthScreen } from "../screens/NetWorth/NetWorthScreen";

const Tab = createBottomTabNavigator();

const icons: Record<string, string> = {
  Dashboard: "◧",
  Transactions: "☰",
  Budgets: "◔",
  "Net Worth": "↗",
};

export function RootNavigator() {
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: "#020617", card: "#0f172a", primary: "#10b981" },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f8fafc",
          tabBarStyle: { backgroundColor: "#0f172a", borderTopColor: "#1e293b" },
          tabBarActiveTintColor: "#10b981",
          tabBarInactiveTintColor: "#64748b",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>{icons[route.name] ?? "•"}</Text>
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Budgets" component={BudgetsScreen} />
        <Tab.Screen name="Net Worth" component={NetWorthScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
