import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type Vertical = "qualidade" | "checklist" | "qsms" | "vistoria";
const ALL_VERTICAIS: Vertical[] = ["qualidade", "checklist", "qsms", "vistoria"];

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
  roles: string[];
  verticais: Vertical[];
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
    const [{ data: profile }, { data: roles }, { data: membro }] = await Promise.all([
      supabase.from("profiles").select("id, name, email").eq("id", sUser.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", sUser.id),
      supabase.from("membros_equipe").select("verticais").eq("user_id", sUser.id).maybeSingle(),
    ]);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    const allRoles = (roles ?? []).map((r: { role: string }) => r.role);
    const rawV = (membro as any)?.verticais;
    const parsedV: Vertical[] = Array.isArray(rawV)
      ? (rawV as any[]).filter((v): v is Vertical => ALL_VERTICAIS.includes(v as Vertical))
      : [];
    const verticais: Vertical[] = isAdmin ? ALL_VERTICAIS : (parsedV.length ? parsedV : ALL_VERTICAIS);
    setUser({
      id: sUser.id,
      name: profile?.name ?? sUser.email ?? null,
      email: profile?.email ?? sUser.email ?? null,
      role: isAdmin ? "admin" : "user",
      roles: allRoles,
      verticais,
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
