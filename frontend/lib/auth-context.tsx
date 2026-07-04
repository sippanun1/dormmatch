"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken } from "./api";

export type UserRole = "platform_admin" | "owner" | "tenant";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "owner" | "tenant";
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session from stored token on first load
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/api/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user, token } = await api<{ user: User; token: string }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } }
    );
    setToken(token);
    setUser(user);
    return user;
  }

  async function register(input: RegisterInput) {
    const { user, token } = await api<{ user: User; token: string }>(
      "/api/auth/register",
      { method: "POST", body: input }
    );
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
