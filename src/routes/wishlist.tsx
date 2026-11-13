import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/site/ProductCard";
import { meta } from "@/components/site/InfoPage";
import { useBag } from "@/lib/cart";
import { productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: meta("Wishlist — ASTRA STYLIN", "The ASTRA STYLIN pieces you've saved for later.") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Wishlist,
});

function Wishlist() {
  const { wishlist } = useBag();
  const { data } = useSuspenseQuery(productsQuery());
  const list = data.filter((p) => wishlist.includes(p.id));
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-10">
      <h1 className="font-display text-center text-5xl uppercase md:text-7xl">Wishlist</h1>
      {list.length ? <div className="mt-12"><ProductGrid products={list} /></div> : (
        <div className="py-20 text-center"><p className="text-sm text-muted-foreground">Tap the heart on any piece to save it here.</p><Button asChild className="mt-6"><Link to="/shop">Discover the collection</Link></Button></div>
      )}
    </section>
  );
}
