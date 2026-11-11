import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBag } from "@/lib/cart";
import { formatINR } from "@/lib/catalog";

export function BagDrawer() {
  const { items, open, setOpen, subtotal, setQuantity, remove } = useBag();
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col border-none bg-background p-0 [&>button]:hidden">
        <div className="flex h-20 items-center justify-between border-b px-6">
          <SheetTitle className="font-display text-2xl font-normal">Your Bag</SheetTitle>
          <button onClick={() => setOpen(false)} aria-label="Close bag">
            <X className="size-5" strokeWidth={1.4} />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <p className="font-display text-3xl">Your bag is empty</p>
            <p className="text-sm text-muted-foreground">Discover polos and T-shirts made for every day.</p>
            <Button asChild onClick={() => setOpen(false)}>
              <Link to="/shop">Shop the collection</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-6">
              {items.map((i) => (
                <li key={i.key} className="flex gap-4 py-5">
                  <Link to="/product/$slug" params={{ slug: i.slug }} onClick={() => setOpen(false)}>
                    <img src={i.image} alt={i.name} className="h-28 w-22 bg-tile object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.15em]">{i.name}</p>
                      <button onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`} className="text-muted-foreground hover:text-foreground">
                        <X className="size-4" strokeWidth={1.4} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {i.colour ? `${i.colour} · ` : ""}Size {i.size}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border">
                        <button className="p-2" aria-label="Decrease" onClick={() => setQuantity(i.key, i.quantity - 1)}>
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-xs">{i.quantity}</span>
                        <button className="p-2" aria-label="Increase" onClick={() => setQuantity(i.key, i.quantity + 1)}>
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <p className="text-sm">{formatINR(i.price * i.quantity)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-4 border-t px-6 py-6">
              <div className="flex justify-between text-sm">
                <span className="eyebrow">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Payment and delivery are confirmed with you on WhatsApp.</p>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/checkout" });
                }}
              >
                Checkout
              </Button>
              <Button variant="link" className="w-full" asChild onClick={() => setOpen(false)}>
                <Link to="/bag">View bag</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
