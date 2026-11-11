import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ProductGrid } from "@/components/site/ProductCard";
import { meta } from "@/components/site/InfoPage";
import { COLLECTIONS, NEW_ARRIVALS, collectionName, filterByCollection, productsQuery } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): { collection?: string | undefined } =>
    typeof s.collection === "string" ? { collection: s.collection } : {},
  head: () => ({ meta: meta("Shop All — ASTRA STYLIN", "Shop ASTRA STYLIN polos, zip polos, textured and graphic T-shirts.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Shop,
});

function Shop() {
  const { collection } = Route.useSearch();
  const { data } = useSuspenseQuery(productsQuery());
  const list = filterByCollection(data, collection);
  const tabs = [{ slug: undefined, name: "All" }, ...COLLECTIONS.filter((c) => data.some((p) => p.collection === c.slug)), NEW_ARRIVALS];
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-10">
      <h1 className="font-display text-center text-5xl uppercase md:text-7xl">{collectionName(collection)}</h1>
      <nav className="no-scrollbar mt-10 flex justify-start gap-6 overflow-x-auto border-b pb-4 md:justify-center">
        {tabs.map((t) => (
          <Link key={t.name} to="/shop" search={{ collection: t.slug }}
            className={cn("eyebrow whitespace-nowrap hover:text-burgundy", collection === t.slug && "text-burgundy")}>
            {t.name}
          </Link>
        ))}
      </nav>
      <p className="eyebrow my-8 text-muted-foreground">{list.length} pieces</p>
      {list.length ? <ProductGrid products={list} eagerFirst /> : <p className="py-20 text-center text-muted-foreground">No pieces in this collection yet.</p>}
    </section>
  );
}
