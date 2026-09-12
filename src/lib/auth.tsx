"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import * as api from "./api";
import { AuthUser, WorkspaceSummary } from "./types";

interface AuthState {
  user: AuthUser | null;
  workspaces: WorkspaceSummary[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const bootstrap = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const envelope = await api.me();
      setUser(envelope.user);
      setWorkspaces(envelope.workspaces);
    } catch {
      // token invalid/expired — api.request already cleared it on 401
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount: rehydrate the session from the stored token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (email: string, password: string) => {
    const envelope = await api.login({
      email,
      password,
      device_name: "zenogrid-web",
    });
    api.setToken(envelope.token ?? null, envelope.expires_at);
    setUser(envelope.user);
    setWorkspaces(envelope.workspaces);
  }, []);

  const doRegister = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      workspaceName: string;
    }) => {
      const envelope = await api.register({
        name: input.name,
        email: input.email,
        password: input.password,
        password_confirmation: input.password,
        workspace_name: input.workspaceName,
        terms_accepted: true,
        device_name: "zenogrid-web",
      });
      api.setToken(envelope.token ?? null, envelope.expires_at);
      setUser(envelope.user);
      setWorkspaces(envelope.workspaces);
    },
    [],
  );

  const signOut = useCallback(async () => {
      await api.logout();
      // even if the server call fails, drop the local token
    api.setToken(null);
    setUser(null);
    setWorkspaces([]);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, workspaces, loading, signIn, register: doRegister, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
