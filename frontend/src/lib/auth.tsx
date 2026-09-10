import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, ApiError, getToken, setToken } from "./api";
import type { Role, User } from "./roles";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  assertRole: (...roles: Role[]) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api
      .get<{ user: User }>("/api/v1/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: User }>("/api/v1/auth/login", {
      email,
      password,
    });
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const assertRole = useCallback(
    (...roles: Role[]) => {
      if (!user || !roles.includes(user.role)) throw new ApiError(403, { message: "Role not permitted" });
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, assertRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}