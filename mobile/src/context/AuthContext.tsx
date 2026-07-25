import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken } from "../api/client";

const TOKEN_KEY = "savely_token";

interface AuthState {
  ready: boolean;
  loggedIn: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  ready: false,
  loggedIn: false,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => {
        if (token) {
          setAuthToken(token);
          setLoggedIn(true);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const login = async (password: string) => {
    const { token } = await api.post<{ token: string }>("/auth/login", { password });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    setLoggedIn(true);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ ready, loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
