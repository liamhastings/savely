import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/client";

interface Props {
  onLinked: () => void;
  onError: (message: string) => void;
}

/**
 * Opens Plaid Link in the browser. Clicking fetches a link_token from the server;
 * once Plaid's script has loaded with that token, Link opens on its own.
 */
export function PlaidLinkButton({ onLinked, onError }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (publicToken, metadata) => {
      try {
        await api.post("/plaid/exchange", {
          public_token: publicToken,
          institution_name: metadata.institution?.name ?? null,
        });
        onLinked();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Linking failed");
      } finally {
        setBusy(false);
        setToken(null);
      }
    },
    onExit: () => {
      setBusy(false);
      setToken(null);
    },
  });

  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  const start = async () => {
    setBusy(true);
    try {
      const { link_token } = await api.post<{ link_token: string }>("/plaid/link-token");
      setToken(link_token);
    } catch (err) {
      setBusy(false);
      onError(err instanceof Error ? err.message : "Could not start Plaid Link");
    }
  };

  return (
    <button
      onClick={start}
      disabled={busy}
      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2.5 transition-colors"
    >
      {busy ? "Opening…" : "+ Link a bank account"}
    </button>
  );
}
