import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { requireSession } from "@/lib/auth";
import { formatINR, settingsQuery } from "@/lib/catalog";
import { buildOrderMessage, whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/order/$id")({
  ssr: false,
  beforeLoad: ({ location }) => requireSession(location.href),
  head: () => ({ meta: [{ title: "Order placed — ASTRA STYLIN" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { data: settings } = useQuery(settingsQuery());
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle()).data,
  });
  if (isLoading) return <p className="py-24 text-center text-muted-foreground">Loading your order…</p>;
  if (!order) return <p className="py-24 text-center">Order not found.</p>;
  const link = whatsappLink(settings?.whatsapp_number ?? "919361617869", buildOrderMessage({ ...order, items: order.order_items }));
  return (
    <section className="mx-auto max-w-2xl px-5 py-20 text-center">
      <p className="eyebrow text-burgundy">Order {order.order_number}</p>
      <h1 className="font-display mt-4 text-5xl">Thank you, {order.shipping_name.split(" ")[0]}</h1>
      <p className="mt-4 text-sm text-muted-foreground">Your pieces are reserved. Send the order summary on WhatsApp so we can confirm payment and delivery.</p>
      <Button asChild size="lg" variant="burgundy" className="mt-8"><a href={link} target="_blank" rel="noreferrer"><MessageCircle /> Send order on WhatsApp</a></Button>
      <ul className="mt-12 divide-y border-y text-left text-sm">
        {order.order_items.map((i) => (
          <li key={i.id} className="flex justify-between py-4"><span>{i.product_name} · {i.colour ? `${i.colour} · ` : ""}{i.size} × {i.quantity}</span><span>{formatINR(i.unit_price * i.quantity)}</span></li>
        ))}
      </ul>
      <p className="mt-4 text-right">Total {formatINR(order.total)}</p>
      <Link to="/account" className="eyebrow mt-10 inline-block underline underline-offset-4">View my orders</Link>
    </section>
  );
}
