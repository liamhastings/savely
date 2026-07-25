import React, { useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import { api } from "../api/client";

interface Props {
  onLinked: () => void;
}

/**
 * Opens Plaid Link via react-native-plaid-link-sdk. The SDK is a native module,
 * so it only works in a development build (expo run:ios / EAS), not Expo Go —
 * we require() it lazily and show a hint instead of crashing there.
 */
export function PlaidLinkButton({ onLinked }: Props) {
  const [busy, setBusy] = useState(false);

  const openLink = async () => {
    let plaid: any;
    try {
      plaid = require("react-native-plaid-link-sdk");
    } catch {
      Alert.alert(
        "Not available in Expo Go",
        "Plaid Link needs a development build (npx expo run:ios). While in Sandbox you can link a test item from the server — see README."
      );
      return;
    }

    setBusy(true);
    try {
      const { link_token } = await api.post<{ link_token: string }>("/plaid/link-token");
      plaid.create({ token: link_token });
      plaid.open({
        onSuccess: async (success: { publicToken: string; metadata?: any }) => {
          try {
            await api.post("/plaid/exchange", {
              public_token: success.publicToken,
              institution_name: success.metadata?.institution?.name ?? null,
            });
            onLinked();
          } catch (err) {
            Alert.alert("Link failed", err instanceof Error ? err.message : "exchange failed");
          } finally {
            setBusy(false);
          }
        },
        onExit: () => setBusy(false),
      });
    } catch (err) {
      setBusy(false);
      Alert.alert("Plaid error", err instanceof Error ? err.message : "could not start Link");
    }
  };

  return (
    <Pressable
      onPress={openLink}
      disabled={busy}
      className="bg-emerald-600 rounded-xl px-4 py-3 items-center active:opacity-80"
    >
      <Text className="text-white font-semibold">{busy ? "Opening…" : "+ Link a bank account"}</Text>
    </Pressable>
  );
}
