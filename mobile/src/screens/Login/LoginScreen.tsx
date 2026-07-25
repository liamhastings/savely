import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-slate-950 justify-center px-8"
    >
      <Text className="text-emerald-400 text-4xl font-bold mb-1">Savely</Text>
      <Text className="text-slate-400 mb-8">Your money, your server.</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#64748b"
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={submit}
        className="bg-slate-800 text-white rounded-xl px-4 py-3 mb-3"
      />
      {error && <Text className="text-red-400 mb-3">{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={busy || !password}
        className="bg-emerald-600 rounded-xl py-3 items-center active:opacity-80 disabled:opacity-50"
      >
        <Text className="text-white font-semibold">{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
