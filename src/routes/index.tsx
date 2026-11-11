import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/site/ProductCard";
import { CollectionCarousel } from "@/components/site/CollectionCarousel";
import { Logo, StarGlyph } from "@/components/site/Logo";
import { collectionsWithProducts, primaryImage, productsQuery } from "@/lib/catalog";
import cover from "@/assets/catalog/campaign-paris-polo-cover.jpg.asset.json";
import parisModel from "@/assets/catalog/paris-polo-model.jpg.asset.json";
import henleyModel from "@/assets/catalog/classic-white-henley-model.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASTRA STYLIN — Polos & T-Shirts | Contemporary Fashion" },
      {
        name: "description",
        content: "Discover the ASTRA STYLIN T-shirt collection: zip polos, textured knits and graphic tees. Timeless styles for everyone.",
      },
      { property: "og:title", content: "ASTRA STYLIN — The T-Shirt Collection" },
      { property: "og:description", content: "Zip polos, textured knits and graphic tees. Timeless styles for everyone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Home,
});

function Home() {
  const { data: products } = useSuspenseQuery(productsQuery());
  const newArrivals = products.filter((p) => p.is_new).slice(0, 8);
  const more = products.filter((p) => !newArrivals.includes(p));
  const collections = collectionsWithProducts(products);
  const look1 = products.find((p) => p.slug === "navy-wave-stripe-zip-polo") ?? products[0];
  const look2 = products.find((p) => p.slug === "visca-barca-quarter-zip") ?? products[1];

  return (
    <>
      {/* HERO CAMPAIGN */}
      <section className="relative overflow-hidden bg-sand">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10">
          <div className="relative z-10 pt-12 text-center md:pt-16">
            <p className="eyebrow animate-fade-in text-burgundy">Contemporary Fashion · New Season</p>
            <h1 className="font-display animate-fade-up mt-4 text-[clamp(3.2rem,10.5vw,10rem)] uppercase leading-[0.86] tracking-[-0.01em] text-foreground mix-blend-multiply">
              T-Shirt Collection
            </h1>
          </div>
          <div className="relative -mt-[2.2vw] grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1.25fr_1fr] md:gap-5">
            <Link
              to="/product/$slug"
              params={{ slug: "paris-polo" }}
              className="group relative hidden aspect-[3/4] overflow-hidden md:block"
            >
              <img src={parisModel.url} alt="Model wearing the Paris Polo" className="img-zoom h-full w-full object-cover" />
            </Link>
            <div className="relative aspect-[3/4] overflow-hidden md:aspect-[3/4.3]">
              <img
                src={cover.url}
                alt="ASTRA STYLIN campaign — Paris Polo"
                className="animate-fade-in h-full w-full object-cover object-top"
                fetchPriority="high"
              />
            </div>
            <Link
              to="/product/$slug"
              params={{ slug: "classic-white-henley" }}
              className="group relative hidden aspect-[3/4] overflow-hidden md:block"
            >
              <img src={henleyModel.url} alt="Model wearing the Classic White henley" className="img-zoom h-full w-full object-cover" />
            </Link>
          </div>
          <div className="flex flex-col items-start justify-between gap-6 py-8 md:flex-row md:items-center md:py-10">
            <p className="max-w-sm text-sm leading-relaxed text-foreground/75">
              Zip polos, textured knits and graphic tees — cut clean, finished with care, priced for every day.
            </p>
            <div className="flex items-center gap-6">
              <p className="font-display hidden text-right text-xl italic leading-tight text-burgundy md:block">
                Timeless styles
                <br />
                for everyone
              </p>
              <Button asChild size="lg">
                <Link to="/shop">Shop Collection</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {collections.length > 0 && <CollectionCarousel items={collections} />}

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
          <div className="mb-10 flex items-end justify-between border-b pb-5">
            <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">New Arrivals</h2>
            <Link
              to="/shop"
              search={{ collection: "new-arrivals" }}
              className="eyebrow underline-offset-4 hover:text-burgundy hover:underline"
            >
              View all
            </Link>
          </div>
          <ProductGrid products={newArrivals} />
        </section>
      )}

      {/* EDITORIAL LOOKBOOK */}
      {look1 && look2 && (
        <section className="grid md:grid-cols-2">
          {[look1, look2].map((p, idx) => (
            <Link
              key={p.id}
              to="/product/$slug"
              params={{ slug: p.slug }}
              className="group relative block aspect-[4/5] overflow-hidden bg-ink md:aspect-auto md:h-[92vh]"
            >
              <img src={primaryImage(p)} alt={p.name} loading="lazy" className="img-zoom absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 text-ivory md:p-12">
                <p className="eyebrow opacity-80">{idx === 0 ? "The Lookbook · 01" : "The Lookbook · 02"}</p>
                <p className="font-display mt-3 text-4xl md:text-5xl">{p.name}</p>
                <span className="eyebrow mt-6 inline-flex h-11 items-center border border-ivory/70 px-7 transition-colors group-hover:bg-ivory group-hover:text-ink">
                  Shop the Look
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* MORE PRODUCTS */}
      {more.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-24 md:px-10">
          <div className="mb-10 flex items-end justify-between border-b pb-5">
            <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">Everyday Essentials</h2>
            <Link to="/shop" className="eyebrow underline-offset-4 hover:text-burgundy hover:underline">
              View all products
            </Link>
          </div>
          <ProductGrid products={more} />
          <div className="mt-14 flex justify-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/shop">View All Products</Link>
            </Button>
          </div>
        </section>
      )}

      {/* BRAND CAMPAIGN */}
      <section className="bg-cream">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-24 text-center md:py-32">
          <Logo variant="full" className="h-40 w-auto md:h-56" />
          <div className="my-10 flex items-center gap-4 text-burgundy">
            <span className="h-px w-16 bg-burgundy/40" />
            <StarGlyph className="size-3" />
            <span className="h-px w-16 bg-burgundy/40" />
          </div>
          <p className="font-display text-3xl leading-snug md:text-4xl">Timeless fashion for everyone.</p>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-foreground/70">
            ASTRA STYLIN makes contemporary polos and T-shirts with considered textures, clean details and an easy fit —
            pieces that move from weekday to weekend and stay in your wardrobe season after season.
          </p>
          <Button asChild variant="link" className="mt-8">
            <Link to="/about">Our story</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
