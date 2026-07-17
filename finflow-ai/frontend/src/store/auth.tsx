import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearStoredToken, getStoredToken, setStoredToken, type AuthUser, type LoginRequest, type RegisterRequest } from "../services/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (payload: LoginRequest) => Promise<AuthUser>;
  signUp: (payload: RegisterRequest) => Promise<AuthUser>;
  signOut: () => void;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(token ? "loading" : "unauthenticated");

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = token ?? getStoredToken();
    if (!savedToken) {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }

    setStatus("loading");
    try {
      const currentUser = await api.getCurrentUser(savedToken);
      setToken(savedToken);
      setUser(currentUser);
      setStatus("authenticated");
      return currentUser;
    } catch {
      signOut();
      return null;
    }
  }, [signOut, token]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async (payload: LoginRequest) => {
    const { access_token } = await api.login(payload);
    setStoredToken(access_token);
    setToken(access_token);
    const currentUser = await api.getCurrentUser(access_token);
    setUser(currentUser);
    setStatus("authenticated");
    return currentUser;
  }, []);

  const signUp = useCallback(async (payload: RegisterRequest) => {
    await api.register(payload);
    return signIn({ email: payload.email, password: payload.password });
  }, [signIn]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    status,
    isAuthenticated: status === "authenticated",
    signIn,
    signUp,
    signOut,
    refreshUser,
  }), [refreshUser, signIn, signOut, signUp, status, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}