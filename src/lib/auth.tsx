import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { redirect } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; loading: boolean };
const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true });
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, user: data.session?.user ?? null, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** For client-only (ssr: false) routes: send signed-out visitors to /login and back. */
export async function requireSession(href: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw redirect({ to: "/login", search: { redirect: href } });
  return data.session;
}

export function safeRedirect(path: string | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/account";
  return path;
}
