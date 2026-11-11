import logoMark from "@/assets/catalog/astra-logo-mark.png.asset.json";
import logoMarkLight from "@/assets/catalog/astra-logo-mark-light.png.asset.json";
import logoFull from "@/assets/catalog/astra-logo-full.png.asset.json";
import logoFullLight from "@/assets/catalog/astra-logo-full-light.png.asset.json";
import { cn } from "@/lib/utils";

export function Logo({
  variant = "mark",
  tone = "dark",
  className,
}: {
  variant?: "mark" | "full";
  tone?: "dark" | "light";
  className?: string;
}) {
  const src =
    variant === "full"
      ? tone === "light"
        ? logoFullLight.url
        : logoFull.url
      : tone === "light"
        ? logoMarkLight.url
        : logoMark.url;
  return <img src={src} alt="ASTRA STYLIN" className={cn("select-none", className)} draggable={false} />;
}

export function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("inline-block", className)} fill="currentColor">
      <path d="M12 0 L13.6 10.4 L24 12 L13.6 13.6 L12 24 L10.4 13.6 L0 12 L10.4 10.4 Z" />
    </svg>
  );
}
