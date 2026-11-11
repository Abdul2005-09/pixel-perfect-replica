import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatINR, primaryImage, type Product } from "@/lib/catalog";
import { SmartImage } from "./SmartImage";
import { ProductPurchase } from "./ProductPurchase";

export function QuickView({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto rounded-none border-none bg-background p-0">
        <div className="grid md:grid-cols-2">
          <SmartImage src={primaryImage(product)} alt={product.name} className="aspect-[4/5]" eager />
          <div className="flex flex-col p-8">
            <p className="eyebrow text-muted-foreground">{product.subtitle}</p>
            <DialogTitle className="font-display mt-2 text-4xl font-normal">{product.name}</DialogTitle>
            <p className="mt-2 text-lg">{formatINR(product.price)}</p>
            <DialogDescription className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </DialogDescription>
            <div className="mt-8">
              <ProductPurchase product={product} onDone={() => onOpenChange(false)} />
            </div>
            <Link
              to="/product/$slug"
              params={{ slug: product.slug }}
              onClick={() => onOpenChange(false)}
              className="eyebrow mt-6 underline underline-offset-4 hover:text-burgundy"
            >
              View full details
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
