import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meta } from "@/components/site/InfoPage";
import { useBag } from "@/lib/cart";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/bag")({
  head: () => ({ meta: meta("Your Bag — ASTRA STYLIN", "Review the pieces in your ASTRA STYLIN bag.") }),
  component: BagPage,
});

function BagPage() {
  const { items, subtotal, setQuantity, remove } = useBag();
  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="font-display text-5xl">Your Bag</h1>
      {items.length === 0 ? (
        <div className="py-20 text-center"><p className="text-muted-foreground">Your bag is empty.</p><Button asChild className="mt-6"><Link to="/shop">Shop now</Link></Button></div>
      ) : (
        <>
          <ul className="mt-10 divide-y border-y">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-5 py-5">
                <img src={i.image} alt="" className="h-28 w-22 bg-tile object-cover" />
                <div className="flex-1">
                  <Link to="/product/$slug" params={{ slug: i.slug }} className="text-xs uppercase tracking-[0.15em]">{i.name}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{i.colour ? `${i.colour} · ` : ""}Size {i.size}</p>
                  <select value={i.quantity} onChange={(e) => setQuantity(i.key, Number(e.target.value))} className="mt-3 border bg-transparent px-2 py-1 text-xs">
                    {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <p className="text-sm">{formatINR(i.price * i.quantity)}</p>
                <button onClick={() => remove(i.key)} aria-label="Remove"><X className="size-4" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center justify-between">
            <p className="eyebrow">Subtotal <span className="ml-3 text-base normal-case tracking-normal">{formatINR(subtotal)}</span></p>
            <Button asChild size="lg"><Link to="/checkout">Checkout</Link></Button>
          </div>
        </>
      )}
    </section>
  );
}
