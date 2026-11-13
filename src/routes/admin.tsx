import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireSession } from "@/lib/auth";
import { SIZES, adminProductsQuery, formatINR } from "@/lib/catalog";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const s = await requireSession(location.href);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin");
    if (!data?.length) throw redirect({ to: "/account" });
  },
  head: () => ({ meta: [{ title: "Store Admin — ASTRA STYLIN" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(adminProductsQuery());
  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });

  async function setStock(productId: string, size: string, value: string) {
    const quantity = Math.max(0, parseInt(value || "0", 10) || 0);
    const { error } = await supabase.from("inventory").upsert({ product_id: productId, size, quantity }, { onConflict: "product_id,size" });
    if (error) { toast.error(error.message); return; }
    toast.success("Stock saved");
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  }
  async function setStatus(id: string, status: (typeof STATUSES)[number]) {
    const { error } = await supabase.rpc("admin_set_order_status", { p_order_id: id, p_status: status });
    if (error) { toast.error(error.message); return; }
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center justify-between"><h1 className="font-display text-4xl">Store admin</h1><Link to="/" className="eyebrow hover:text-burgundy">View store →</Link></div>

      <h2 className="font-display mt-10 text-3xl">Orders</h2>
      {orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p> : (
        <div className="mt-4 divide-y border">
          {orders.map((o) => (
            <div key={o.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_2fr_auto_auto] md:items-center">
              <div><p className="font-medium">{o.order_number}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p></div>
              <div><p>{o.shipping_name} · {o.shipping_phone}</p><p className="text-xs text-muted-foreground">{o.order_items.map((i) => `${i.product_name} (${i.size}) ×${i.quantity}`).join(", ")}</p><p className="text-xs text-muted-foreground">{[o.line1, o.line2, o.city, o.state, o.postal_code].filter(Boolean).join(", ")}</p></div>
              <span>{formatINR(o.total)}</span>
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as (typeof STATUSES)[number])} className="h-9 border bg-background px-2 text-xs uppercase tracking-widest">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display mt-14 text-3xl">Stock</h2>
      <p className="mt-1 text-xs text-muted-foreground">Type a number and click away to save.</p>
      <div className="mt-4 overflow-x-auto border">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr><th className="eyebrow p-3 text-left">Product</th>{SIZES.map((s) => <th key={s} className="eyebrow p-3">{s}</th>)}</tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.name}<span className="block text-xs text-muted-foreground">{formatINR(p.price)}</span></td>
                {SIZES.map((s) => (
                  <td key={s} className="p-2 text-center">
                    <input type="number" min={0} defaultValue={p.inventory.find((i) => i.size === s)?.quantity ?? 0}
                      onBlur={(e) => { if (e.target.value !== e.target.defaultValue) setStock(p.id, s, e.target.value); }}
                      className="h-9 w-16 border bg-background text-center" aria-label={`${p.name} size ${s} stock`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
