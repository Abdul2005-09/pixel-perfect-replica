import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const COLLECTIONS = [
  { slug: "polos", name: "Polo Collection" },
  { slug: "graphic-tees", name: "Graphic T-Shirts" },
  { slug: "textured-tees", name: "Textured T-Shirts" },
  { slug: "zip-polos", name: "Zip Polos" },
] as const;
export const NEW_ARRIVALS = { slug: "new-arrivals", name: "New Arrivals" } as const;

export function collectionName(slug: string | undefined) {
  if (!slug) return "All Products";
  if (slug === NEW_ARRIVALS.slug) return NEW_ARRIVALS.name;
  return COLLECTIONS.find((c) => c.slug === slug)?.name ?? "All Products";
}

export type ProductImage = { id: string; url: string; kind: string; sort_order: number };
export type ProductVariant = { id: string; colour_name: string; colour_hex: string; sort_order: number };
export type InventoryRow = { id: string; size: string; quantity: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  collection: string;
  is_featured: boolean;
  is_new: boolean;
  status: string;
  sort_order: number;
  created_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
  inventory: InventoryRow[];
};

const SELECT = "*, product_images(*), product_variants(*), inventory(*)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(row: any): Product {
  const { product_images, product_variants, inventory, ...rest } = row;
  return {
    ...rest,
    images: [...(product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    variants: [...(product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    inventory: inventory ?? [],
  };
}

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(SELECT)
        .eq("status", "active")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(SELECT)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? normalize(data) : null;
    },
  });

export const adminProductsQuery = () =>
  queryOptions({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(SELECT).order("sort_order");
      if (error) throw error;
      return (data ?? []).map(normalize);
    },
  });

export const adminProductQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? normalize(data) : null;
    },
  });

export type StoreSettings = {
  whatsapp_number: string;
  announcement: string;
  instagram_url: string | null;
  contact_email: string | null;
};

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["store-settings"],
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          whatsapp_number: "919361617869",
          announcement: "Order directly on WhatsApp · Sizes S to XXL",
          instagram_url: null,
          contact_email: null,
        }
      );
    },
  });

/** Primary display image: on-model shot first, then product shot. */
export function primaryImage(p: Product) {
  return (p.images.find((i) => i.kind === "model") ?? p.images[0])?.url;
}
export function secondaryImage(p: Product) {
  const first = primaryImage(p);
  return (p.images.find((i) => i.kind === "product" && i.url !== first) ?? p.images.find((i) => i.url !== first))?.url;
}
export function productShot(p: Product) {
  return (p.images.find((i) => i.kind === "product") ?? p.images[0])?.url;
}

export function stockFor(p: Product, size: string) {
  return p.inventory.find((r) => r.size === size)?.quantity ?? 0;
}
export function totalStock(p: Product) {
  return p.inventory.reduce((s, r) => s + r.quantity, 0);
}
export type Availability = "in_stock" | "low_stock" | "sold_out";
export function availability(p: Product): Availability {
  const t = totalStock(p);
  if (t <= 0) return "sold_out";
  if (t <= 5) return "low_stock";
  return "in_stock";
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Collections that currently contain at least one active product. */
export function collectionsWithProducts(products: Product[]) {
  const list: { slug: string; name: string; image?: string; count: number }[] = [];
  for (const c of COLLECTIONS) {
    const items = products.filter((p) => p.collection === c.slug);
    if (items.length) list.push({ slug: c.slug, name: c.name, image: primaryImage(items[0]), count: items.length });
  }
  const fresh = products.filter((p) => p.is_new);
  if (fresh.length)
    list.push({ slug: NEW_ARRIVALS.slug, name: NEW_ARRIVALS.name, image: primaryImage(fresh[fresh.length - 1]), count: fresh.length });
  return list;
}

export function filterByCollection(products: Product[], slug?: string) {
  if (!slug) return products;
  if (slug === NEW_ARRIVALS.slug) return products.filter((p) => p.is_new);
  return products.filter((p) => p.collection === slug);
}
