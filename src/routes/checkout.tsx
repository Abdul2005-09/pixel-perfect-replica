import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { requireSession, useAuth } from "@/lib/auth";
import { useBag } from "@/lib/cart";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location.href),
  head: () => ({ meta: [{ title: "Checkout — ASTRA STYLIN" }, { name: "robots", content: "noindex" }] }),
  component: Checkout,
});

const FIELDS = [
  ["full_name", "Full name"], ["phone", "Phone (WhatsApp)"], ["line1", "Address line 1"], ["line2", "Address line 2 (optional)"],
  ["city", "City"], ["state", "State"], ["postal_code", "PIN code"],
] as const;
type Addr = Record<(typeof FIELDS)[number][0], string>;

function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useBag();
  const navigate = useNavigate();
  const [addr, setAddr] = useState<Addr>({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "" });
  const [notes, setNotes] = useState("");
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const { data: saved = [] } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });
  useEffect(() => {
    const a = saved[0];
    if (a) { setAddr({ full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postal_code: a.postal_code }); setSave(false); }
  }, [saved]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_items: items.map((i) => ({ product_id: i.productId, size: i.size, colour: i.colour, quantity: i.quantity })),
      p_address: addr, p_notes: notes,
    });
    if (error) { setBusy(false); toast.error(error.message); return; }
    if (save && user) await supabase.from("addresses").insert({ ...addr, line2: addr.line2 || null, user_id: user.id, is_default: saved.length === 0 });
    clear();
    const id = (data as { id: string }).id;
    navigate({ to: "/order/$id", params: { id } });
  }

  if (!items.length) return <section className="py-24 text-center"><p className="font-display text-4xl">Your bag is empty</p><Button asChild className="mt-6"><Link to="/shop">Shop now</Link></Button></section>;

  return (
    <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 md:grid-cols-[1.3fr_1fr] md:px-10">
      <form onSubmit={submit} className="space-y-5">
        <h1 className="font-display text-5xl">Delivery details</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([k, label]) => (
            <div key={k} className={k === "line1" || k === "line2" || k === "full_name" ? "sm:col-span-2" : ""}>
              <Label htmlFor={k} className="eyebrow">{label}</Label>
              <Input id={k} required={k !== "line2"} value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} className="mt-2 h-11 rounded-none" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="notes" className="eyebrow">Order note (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 h-11 rounded-none" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address to my account</label>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Placing order…" : `Buy Now · ${formatINR(subtotal)}`}</Button>
        <p className="text-xs text-muted-foreground">No online payment. Your stock is reserved and you'll confirm the order with us on WhatsApp.</p>
      </form>
      <aside className="bg-cream p-8 md:self-start">
        <p className="eyebrow mb-6">Order summary</p>
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.key} className="flex gap-4 text-sm">
              <img src={i.image} alt="" className="h-20 w-16 object-cover" />
              <div className="flex-1"><p className="text-xs uppercase tracking-wider">{i.name}</p><p className="text-xs text-muted-foreground">{i.colour ? `${i.colour} · ` : ""}Size {i.size} × {i.quantity}</p></div>
              <p>{formatINR(i.price * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-between border-t pt-4"><span className="eyebrow">Total</span><span>{formatINR(subtotal)}</span></div>
      </aside>
    </section>
  );
}
