import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart } from "lucide-react";
import { ProductPurchase } from "@/components/site/ProductPurchase";
import { ProductGrid } from "@/components/site/ProductCard";
import { SmartImage } from "@/components/site/SmartImage";
import { useBag } from "@/lib/cart";
import { collectionName, formatINR, productQuery, productsQuery } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!p) throw notFound();
    await context.queryClient.ensureQueryData(productsQuery());
    return { name: p.name, description: p.description ?? "" };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.name} — ASTRA STYLIN` : "Product — ASTRA STYLIN";
    const d = loaderData?.description || "Shop ASTRA STYLIN.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "product" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQuery(slug));
  const { data: all } = useSuspenseQuery(productsQuery());
  const { wishlist, toggleWish } = useBag();
  const [active, setActive] = useState(0);
  if (!product) return null;
  const images = [...product.images].sort((a, b) => (a.kind === "model" ? -1 : b.kind === "model" ? 1 : a.sort_order - b.sort_order));
  const related = all.filter((p) => p.id !== product.id && p.collection === product.collection).concat(all.filter((p) => p.id !== product.id && p.collection !== product.collection)).slice(0, 4);
  const wished = wishlist.includes(product.slug);
  return (
    <>
      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-10 md:grid-cols-[1.2fr_1fr] md:px-10 lg:gap-16">
        <div className="grid gap-3 md:grid-cols-[80px_1fr]">
          <div className="order-2 flex gap-3 md:order-1 md:flex-col">
            {images.map((img, i) => (
              <button key={img.id} onClick={() => setActive(i)} className={cn("w-20 border", i === active ? "border-foreground" : "border-transparent")}>
                <SmartImage src={img.url} alt="" className="aspect-[4/5]" />
              </button>
            ))}
          </div>
          <SmartImage src={images[active]?.url} alt={product.name} eager className="order-1 aspect-[4/5] md:order-2" />
        </div>
        <div className="md:sticky md:top-28 md:self-start">
          <Link to="/shop" search={{ collection: product.collection }} className="eyebrow text-muted-foreground hover:text-burgundy">{collectionName(product.collection)}</Link>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="font-display text-5xl leading-none">{product.name}</h1>
            <button onClick={() => toggleWish(product.slug)} aria-label="Wishlist"><Heart className={cn("size-5", wished && "fill-burgundy text-burgundy")} strokeWidth={1.4} /></button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{product.subtitle}</p>
          <p className="mt-5 text-xl">{formatINR(product.price)}</p>
          <div className="my-8 h-px bg-border" />
          <ProductPurchase product={product} />
          <div className="mt-10 border-t pt-6">
            <p className="eyebrow mb-3">Description</p>
            <p className="text-sm leading-relaxed text-foreground/75">{product.description}</p>
            <p className="mt-4 text-xs text-muted-foreground">Sizes S–XXL. Orders are confirmed with you on WhatsApp.</p>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-10">
          <h2 className="font-display mb-10 border-b pb-5 text-3xl uppercase md:text-4xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
