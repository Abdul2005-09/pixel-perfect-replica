import type { ReactNode } from "react";
export function InfoPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-20 md:py-28">
      <p className="eyebrow text-burgundy">{eyebrow}</p>
      <h1 className="font-display mt-4 text-5xl md:text-6xl">{title}</h1>
      <div className="mt-10 space-y-6 text-sm leading-relaxed text-foreground/75 [&_h2]:font-display [&_h2]:pt-4 [&_h2]:text-3xl [&_h2]:text-foreground">{children}</div>
    </section>
  );
}
export const meta = (title: string, description: string) => [
  { title }, { name: "description", content: description },
  { property: "og:title", content: title }, { property: "og:description", content: description },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
];
