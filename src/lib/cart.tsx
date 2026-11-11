import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BagItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  colour: string | null;
  size: string;
  quantity: number;
};

type BagCtx = {
  items: BagItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<BagItem, "key">) => void;
  setQuantity: (key: string, q: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  wishlist: string[];
  toggleWish: (slug: string) => void;
};

const Ctx = createContext<BagCtx | null>(null);
const BAG_KEY = "astra-bag-v1";
const WISH_KEY = "astra-wishlist-v1";

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(BAG_KEY) ?? "[]"));
      setWishlist(JSON.parse(localStorage.getItem(WISH_KEY) ?? "[]"));
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(BAG_KEY, JSON.stringify(items));
  }, [items, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  const add = useCallback((item: Omit<BagItem, "key">) => {
    const key = `${item.productId}:${item.colour ?? ""}:${item.size}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, i.quantity + item.quantity) } : i));
      return [...prev, { ...item, key }];
    });
  }, []);
  const setQuantity = useCallback((key: string, q: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(20, q)) } : i)));
  }, []);
  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);
  const toggleWish = useCallback(
    (slug: string) => setWishlist((w) => (w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug])),
    [],
  );

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.quantity * i.price, 0),
      add,
      setQuantity,
      remove,
      clear,
      open,
      setOpen,
      wishlist,
      toggleWish,
    }),
    [items, add, setQuantity, remove, clear, open, wishlist, toggleWish],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBag() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBag must be used inside BagProvider");
  return c;
}
