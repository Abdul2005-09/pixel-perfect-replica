import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function CollectionCarousel({
  items,
}: {
  items: { slug: string; name: string; image?: string; count: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  };
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-24">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">Shop by Collection</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            aria-label="Previous collections"
            className="flex size-9 items-center justify-center border transition-colors hover:border-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={1.4} />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Next collections"
            className="flex size-9 items-center justify-center bg-foreground text-background transition-colors hover:bg-burgundy"
          >
            <ArrowRight className="size-4" strokeWidth={1.4} />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:-mx-10 md:px-10">
        {items.map((c) => (
          <Link
            key={c.slug}
            to="/shop"
            search={{ collection: c.slug }}
            className="group relative aspect-[3/4] w-[62vw] shrink-0 snap-start overflow-hidden bg-tile sm:w-[38vw] lg:w-[calc((100%-4rem)/5)]"
          >
            {c.image && (
              <img src={c.image} alt={c.name} loading="lazy" className="img-zoom absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-ink/0" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-center text-ivory">
              <p className="font-display text-2xl leading-tight text-shadow-soft md:text-[1.7rem]">{c.name}</p>
              <p className="eyebrow mt-2 text-[0.58rem] opacity-80">
                {c.count} {c.count === 1 ? "piece" : "pieces"} · Shop now
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
