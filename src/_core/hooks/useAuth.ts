import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth" } = options ?? {};
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (sUser: SupabaseUser | null) => {
    if (!sUser) {
      setUser(null);
      return;
    }
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, name, email").eq("id", sUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", sUser.id),
    ]);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    setUser({
      id: sUser.id,
      name: profile?.name ?? sUser.email ?? null,
      email: profile?.email ?? sUser.email ?? null,
      role: isAdmin ? "admin" : "user",
    });
  }, []);

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession (Lovable auth pattern)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Defer Supabase calls
      setTimeout(() => loadProfile(newSession?.user ?? null), 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      loadProfile(s?.user ?? null).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, user]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return {
    user,
    session,
    loading,
    error: null as Error | null,
    isAuthenticated: Boolean(user),
    refresh: () => loadProfile(session?.user ?? null),
    logout,
  };
}
