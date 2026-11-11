import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/catalog";
import { StarGlyph } from "./Logo";

export function AnnouncementBar() {
  const { data } = useQuery(settingsQuery());
  const text = data?.announcement ?? "Order directly on WhatsApp · Sizes S to XXL";
  return (
    <div className="bg-burgundy text-ivory">
      <p className="mx-auto flex h-8 max-w-[1440px] items-center justify-center gap-3 px-4 text-center text-[0.62rem] uppercase tracking-[0.28em]">
        <StarGlyph className="size-2 text-champagne" />
        <span className="truncate">{text}</span>
        <StarGlyph className="size-2 text-champagne" />
      </p>
    </div>
  );
}
