import "./global.css";
import React from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/Login/LoginScreen";
import { RootNavigator } from "./src/navigation";

function Gate() {
  const { ready, loggedIn } = useAuth();
  if (!ready) return <View className="flex-1 bg-slate-950" />;
  return loggedIn ? <RootNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Gate />
    </AuthProvider>
  );
}
