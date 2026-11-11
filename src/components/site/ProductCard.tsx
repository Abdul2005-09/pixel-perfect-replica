import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Heart } from "lucide-react";
import { useBag } from "@/lib/cart";
import { availability, formatINR, primaryImage, secondaryImage, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { SmartImage } from "./SmartImage";
import { QuickView } from "./QuickView";

export function ProductCard({ product, eager }: { product: Product; eager?: boolean | undefined }) {
  const { wishlist, toggleWish } = useBag();
  const [quick, setQuick] = useState(false);
  const wished = wishlist.includes(product.slug);
  const status = availability(product);
  const hover = secondaryImage(product);

  return (
    <article className="group relative">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-tile">
          <SmartImage
            src={primaryImage(product)}
            alt={product.name}
            eager={eager}
            className="absolute inset-0"
            imgClassName={cn("img-zoom transition-opacity duration-700", hover && "group-hover:opacity-0")}
          />
          {hover && (
            <SmartImage
              src={hover}
              alt=""
              className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}
          {(product.is_new || status !== "in_stock") && (
            <span className="absolute left-3 top-3 bg-background/90 px-2 py-1 text-[0.55rem] uppercase tracking-[0.2em]">
              {status === "sold_out" ? "Sold out" : status === "low_stock" ? "Few left" : "New"}
            </span>
          )}
        </div>
      </Link>
      <button
        onClick={() => toggleWish(product.slug)}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/80 transition-colors hover:bg-background"
      >
        <Heart className={cn("size-4", wished && "fill-burgundy text-burgundy")} strokeWidth={1.4} />
      </button>
      <button
        onClick={() => setQuick(true)}
        className="eyebrow absolute inset-x-3 bottom-[4.5rem] flex translate-y-2 items-center justify-center gap-2 bg-background/95 py-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden"
      >
        <Eye className="size-3.5" strokeWidth={1.4} /> Quick view
      </button>
      <Link to="/product/$slug" params={{ slug: product.slug }} className="mt-4 block">
        <h3 className="font-sans text-[0.7rem] font-medium uppercase tracking-[0.16em]">{product.name}</h3>
        <p className="mt-1 text-[0.8rem] font-medium">{formatINR(product.price)}</p>
      </Link>
      <QuickView product={product} open={quick} onOpenChange={setQuick} />
    </article>
  );
}

export function ProductGrid({ products, eagerFirst }: { products: Product[]; eagerFirst?: boolean | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={eagerFirst && i < 4} />
      ))}
    </div>
  );
}
