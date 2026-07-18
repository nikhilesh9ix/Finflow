import { create } from "zustand";
import { apiFetch } from "../lib/api";
import { demoUser } from "../lib/demoData";
import type { User } from "../types";

const DEMO_TOKEN = "demo-token";
const DEMO_EMAIL = "demo@finflow.ai";
const DEMO_PASSWORD = "demo12345";
const TOKEN_KEY = "finflow_token";

export function isDemoSession(token: string | null): boolean {
  return token === DEMO_TOKEN;
}

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { access_token } = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(TOKEN_KEY, access_token);
      const user = await apiFetch<User>("/auth/me");
      set({ token: access_token, user, loading: false });
    } catch (error) {
      // Allow demo mode when backend is unavailable
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
        set({ token: DEMO_TOKEN, user: demoUser, loading: false });
        return;
      }
      set({ loading: false });
      throw error;
    }
  },

  loadMe: async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;

    if (isDemoSession(storedToken)) {
      set({ user: demoUser, token: storedToken, loading: false });
      return;
    }

    set({ loading: true });
    try {
      const user = await apiFetch<User>("/auth/me");
      set({ user, token: storedToken, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },
}));
