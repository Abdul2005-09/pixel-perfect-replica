import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { safeRedirect, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } =>
    typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {},
  head: () => ({ meta: [{ title: "Sign in — ASTRA STYLIN" }, { name: "description", content: "Sign in or create your ASTRA STYLIN account." }, { property: "og:title", content: "Sign in — ASTRA STYLIN" }, { property: "og:description", content: "Sign in or create your ASTRA STYLIN account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Login,
});

const GOOGLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>`;

function Login() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeRedirect(redirect);

  useEffect(() => { if (user) navigate({ to: target, replace: true }); }, [user, target, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + target, data: { full_name: name } } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  async function google() {
    if (redirect) sessionStorage.setItem("astra-after-login", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/login${redirect ? `?redirect=${encodeURIComponent(target)}` : ""}` });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  return (
    <section className="mx-auto max-w-md px-5 py-20">
      <p className="eyebrow text-center text-burgundy">My account</p>
      <h1 className="font-display mt-3 text-center text-5xl">{mode === "in" ? "Welcome back" : "Create account"}</h1>
      <div className="mt-10 grid grid-cols-2 border">
        {(["in", "up"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`eyebrow h-11 ${mode === m ? "bg-foreground text-background" : ""}`}>{m === "in" ? "Sign in" : "Register"}</button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {mode === "up" && <div><Label htmlFor="name">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-2" /></div>}
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" /></div>
        <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" /></div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <button onClick={google} className="flex h-11 w-full items-center justify-center gap-[10px] border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">
        <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: GOOGLE }} className="flex" />Continue with Google
      </button>
    </section>
  );
}
