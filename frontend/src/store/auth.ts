import { create } from "zustand";
import { apiFetch } from "../lib/api";
import type { User } from "../types";

const TOKEN_KEY = "finflow_token";

export type RegisterPayload = {
  email: string;
  full_name: string;
  password: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
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
      set({ loading: false });
      throw error;
    }
  },

  register: async (payload) => {
    set({ loading: true });
    try {
      await apiFetch<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...payload, currency: "INR" }),
      });
      // Registration does not return a token — sign in with the same credentials.
      const { access_token } = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });
      localStorage.setItem(TOKEN_KEY, access_token);
      const user = await apiFetch<User>("/auth/me");
      set({ token: access_token, user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  loadMe: async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;

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
    // Revoke the session on the server so a copied token stops working too. The
    // request reads the token before it is cleared below; the local sign-out does
    // not wait for it, so logging out works even when the backend is down.
    if (localStorage.getItem(TOKEN_KEY)) {
      apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    }
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },
}));

// apiFetch clears the stored token on any 401 and fires this event. Dropping the
// token from the store sends ProtectedRoutes back to /login.
window.addEventListener("auth:unauthorized", () => {
  if (useAuthStore.getState().token) {
    useAuthStore.setState({ user: null, token: null, loading: false });
  }
});
