import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { requireSession, useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/account")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location.href),
  head: () => ({ meta: [{ title: "My Account — ASTRA STYLIN" }, { name: "description", content: "Your ASTRA STYLIN orders and account." }, { property: "og:title", content: "My Account — ASTRA STYLIN" }, { property: "og:description", content: "Your ASTRA STYLIN orders and account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["roles", user?.id], enabled: !!user,
    queryFn: async () => {
      const [{ data: r }, { data: exists }] = await Promise.all([supabase.from("user_roles").select("role").eq("user_id", user!.id), supabase.rpc("admin_exists")]);
      return { isAdmin: (r ?? []).some((x) => x.role === "admin"), adminExists: !!exists };
    },
  });

  async function claim() {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error || !data) { toast.error(error?.message ?? "An admin already exists"); return; }
    toast.success("You are now the store admin");
    qc.invalidateQueries({ queryKey: ["roles"] });
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow text-burgundy">My account</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-5xl">Hello{user?.user_metadata?.["full_name"] ? `, ${user.user_metadata["full_name"]}` : ""}</h1><p className="mt-2 text-sm text-muted-foreground">{user?.email}</p></div>
        <div className="flex gap-3">
          {roles?.isAdmin && <Button asChild variant="outline"><Link to="/admin">Store admin</Link></Button>}
          {roles && !roles.adminExists && <Button variant="outline" onClick={claim}>Become store admin</Button>}
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </div>
      <h2 className="font-display mt-14 text-3xl">Your orders</h2>
      {orders.length === 0 ? (
        <div className="mt-6 border p-10 text-center"><p className="text-sm text-muted-foreground">No orders yet.</p><Button asChild className="mt-5"><Link to="/shop">Start shopping</Link></Button></div>
      ) : (
        <div className="mt-6 divide-y border">
          {orders.map((o) => (
            <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-secondary/40">
              <div><p className="font-medium">{o.order_number}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {o.order_items.length} item(s)</p></div>
              <span className="eyebrow border px-3 py-1">{o.status}</span>
              <span className="text-sm">{formatINR(o.total)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
