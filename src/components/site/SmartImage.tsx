import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Catalogue photos come in mixed orientations. Portrait shots fill the frame;
 * wide shots are shown whole on the tile background instead of being cropped.
 */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  eager,
}: {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [wide, setWide] = useState(false);
  if (!src) return <div className={cn("bg-tile", className)} />;
  return (
    <div className={cn("relative overflow-hidden bg-tile", className)}>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={(e) => {
          const el = e.currentTarget;
          setWide(el.naturalWidth > el.naturalHeight * 1.08);
        }}
        className={cn("absolute inset-0 h-full w-full", wide ? "object-contain" : "object-cover", imgClassName)}
      />
    </div>
  );
}
