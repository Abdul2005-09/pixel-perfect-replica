import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBag } from "@/lib/cart";
import { SIZES, formatINR, primaryImage, stockFor, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductPurchase({ product, onDone }: { product: Product; onDone?: () => void }) {
  const { add, setOpen } = useBag();
  const navigate = useNavigate();
  const [colour, setColour] = useState<string | null>(product.variants[0]?.colour_name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setColour(product.variants[0]?.colour_name ?? null);
    setSize(null);
    setQty(1);
  }, [product.id, product.variants]);

  const available = size ? stockFor(product, size) : 0;
  const allSoldOut = SIZES.every((s) => stockFor(product, s) <= 0);

  function commit(goCheckout: boolean) {
    if (!size) {
      toast.error("Please choose a size");
      return;
    }
    if (qty > available) {
      toast.error(available > 0 ? `Only ${available} left in size ${size}` : `Size ${size} is sold out`);
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: primaryImage(product),
      colour,
      size,
      quantity: qty,
    });
    onDone?.();
    if (goCheckout) {
      navigate({ to: "/checkout" });
    } else {
      toast.success(`${product.name} added to your bag`);
      setOpen(true);
    }
  }

  return (
    <div className="space-y-7">
      {product.variants.length > 0 && (
        <div>
          <p className="eyebrow mb-3">
            Colour <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">{colour}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setColour(v.colour_name)}
                aria-label={v.colour_name}
                title={v.colour_name}
                className={cn(
                  "size-8 rounded-full border p-0.5 transition-all",
                  colour === v.colour_name ? "border-foreground" : "border-transparent hover:border-border",
                )}
              >
                <span className="block size-full rounded-full border border-foreground/10" style={{ backgroundColor: v.colour_hex }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Size</p>
          {size && (
            <p className={cn("text-xs", available > 0 ? "text-muted-foreground" : "text-destructive")}>
              {available > 0 ? (available <= 5 ? `Only ${available} left` : "In stock") : "Sold out"}
            </p>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SIZES.map((s) => {
            const q = stockFor(product, s);
            return (
              <button
                key={s}
                onClick={() => {
                  setSize(s);
                  setQty(1);
                }}
                disabled={q <= 0}
                className={cn(
                  "relative h-11 border text-xs tracking-widest transition-colors",
                  size === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                  q <= 0 && "cursor-not-allowed text-muted-foreground/50 line-through hover:border-border",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        {allSoldOut && (
          <p className="mt-3 text-xs text-muted-foreground">
            This piece is currently sold out in every size. New stock arrives soon.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <p className="eyebrow">Quantity</p>
        <div className="flex items-center border">
          <button className="p-3" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus className="size-3" />
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button
            className="p-3"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(size ? Math.max(1, available) : 20, q + 1))}
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" size="lg" disabled={allSoldOut} onClick={() => commit(false)}>
          Add to Bag
        </Button>
        <Button size="lg" disabled={allSoldOut} onClick={() => commit(true)}>
          Buy Now · {formatINR(product.price * qty)}
        </Button>
      </div>
    </div>
  );
}
