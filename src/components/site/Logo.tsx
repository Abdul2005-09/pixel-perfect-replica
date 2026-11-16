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
        ? "/catalog/astra-logo-full-light.png"
        : "/catalog/astra-logo-full.png"
      : tone === "light"
        ? "/catalog/astra-logo-mark-light.png"
        : "/catalog/astra-logo-mark.png";
  return <img src={src} alt="ASTRA STYLIN" className={cn("select-none", className)} draggable={false} />;
}

export function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("inline-block", className)} fill="currentColor">
      <path d="M12 0 L13.6 10.4 L24 12 L13.6 13.6 L12 24 L10.4 13.6 L0 12 L10.4 10.4 Z" />
    </svg>
  );
}
