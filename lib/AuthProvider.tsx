"use client";

import * as React from "react";

export type UsageFeature = {
  featureCode: string;
  displayName: string;
  limit: number;
  remaining: number;
  isActive: boolean;
};

export type Usage = {
  subscriptionStatus: string;
  planName: string;
  features: UsageFeature[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  planName: string;
  status: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  usage: Usage | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  checkAccess: (featureCode: string) => boolean;
  checkActive: (featureCode: string) => boolean;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [usage, setUsage] = React.useState<Usage | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        setUsage(null);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setUser({
          id: json.data.id,
          name: json.data.name,
          email: json.data.email,
          planName: json.data.planName,
          status: json.data.status,
        });
        setUsage(json.data.usage);
      }
    } catch {
      setUser(null);
      setUsage(null);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return { ok: false, message: json.message ?? "Login failed." };
      }
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const register = React.useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return { ok: false, message: json.message ?? "Registration failed." };
      }
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const logout = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setUsage(null);
  }, []);

  const checkAccess = React.useCallback(
    (featureCode: string) => {
      const feature = usage?.features.find((f) => f.featureCode === featureCode);
      if (!feature) return false;
      if (feature.limit === -1) return true;
      return feature.remaining > 0;
    },
    [usage]
  );

  const checkActive = React.useCallback(
    (featureCode: string) => {
      const feature = usage?.features.find((f) => f.featureCode === featureCode);
      return !!feature?.isActive;
    },
    [usage]
  );

  const value = React.useMemo(
    () => ({ user, usage, loading, login, register, logout, refresh, checkAccess, checkActive }),
    [user, usage, loading, login, register, logout, refresh, checkAccess, checkActive]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
