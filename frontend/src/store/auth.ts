import { create } from "zustand";
import { apiFetch } from "../lib/api";
import { demoUser } from "../lib/demoData";
import type { User } from "../types";

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
  token: localStorage.getItem("finflow_token"),
  loading: false,
  login: async (email, password) => {
    set({ loading: true });
    try {
      const token = await apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('finflow_token', token.access_token);
      const user = await apiFetch<User>('/auth/me');
      set({ token: token.access_token, user, loading: false });
    } catch (error) {
      if (email === 'demo@finflow.ai' && password === 'demo12345') {
        localStorage.setItem('finflow_token', 'demo-token');
        set({ token: 'demo-token', user: demoUser, loading: false });
        return;
      }
      throw error;
    }
  },
  loadMe: async () => {
    const storedToken = localStorage.getItem("finflow_token");
    if (!storedToken) return;
    set({ loading: true });
    try {
      const user = await apiFetch<User>("/auth/me");
      set({ user, token: storedToken, loading: false });
    } catch {
      if (storedToken === "demo-token") {
        set({ user: demoUser, token: storedToken, loading: false });
        return;
      }
      localStorage.removeItem("finflow_token");
      set({ user: null, token: null, loading: false });
    }
  },
  logout: () => {
    localStorage.removeItem("finflow_token");
    set({ user: null, token: null });
  },
}));
