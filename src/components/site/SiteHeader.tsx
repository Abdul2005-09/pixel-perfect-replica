import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useBag } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { COLLECTIONS, formatINR, primaryImage, productsQuery } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV = [
  { label: "Shop", to: "/shop" as const, search: { collection: undefined } },
  { label: "Polos", to: "/shop" as const, search: { collection: "polos" } },
  { label: "T-Shirts", to: "/shop" as const, search: { collection: "graphic-tees" } },
  { label: "New In", to: "/shop" as const, search: { collection: "new-arrivals" } },
];

export function SiteHeader() {
  const { count, setOpen } = useBag();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background/95 backdrop-blur transition-all duration-500",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-500 md:px-10",
          scrolled ? "h-16" : "h-20",
        )}
      >
        <nav className="flex items-center gap-7">
          <button
            className="text-foreground lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" strokeWidth={1.4} />
          </button>
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              search={n.search}
              className="eyebrow hidden text-foreground/80 transition-colors hover:text-burgundy lg:inline"
              activeOptions={{ includeSearch: true }}
              activeProps={{ className: "text-burgundy" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link to="/" aria-label="ASTRA STYLIN home" className="flex justify-center">
          <Logo className={cn("w-auto transition-all duration-500", scrolled ? "h-9" : "h-12")} />
        </Link>

        <div className="flex items-center justify-end gap-4 md:gap-5">
          <button aria-label="Search" onClick={() => setSearchOpen(true)} className="hover:text-burgundy">
            <Search className="size-[18px]" strokeWidth={1.4} />
          </button>
          <Link
            to="/account"
            aria-label={user ? "My account" : "Sign in"}
            className="hidden hover:text-burgundy sm:block"
          >
            <User className="size-[18px]" strokeWidth={1.4} />
          </Link>
          <Link to="/wishlist" aria-label="Wishlist" className="hidden hover:text-burgundy sm:block">
            <Heart className="size-[18px]" strokeWidth={1.4} />
          </Link>
          <button aria-label="Shopping bag" onClick={() => setOpen(true)} className="relative hover:text-burgundy">
            <ShoppingBag className="size-[18px]" strokeWidth={1.4} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-burgundy text-[0.55rem] text-ivory">
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="eyebrow hidden items-center gap-2 hover:text-burgundy lg:flex"
          >
            <Menu className="size-4" strokeWidth={1.4} /> Menu
          </button>
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <MenuSheet open={menuOpen} onOpenChange={setMenuOpen} signedIn={!!user} />
    </header>
  );
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: products = [] } = useQuery(productsQuery());
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products.slice(0, 6);
    return products.filter((p) => `${p.name} ${p.subtitle ?? ""} ${p.collection}`.toLowerCase().includes(t));
  }, [q, products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 rounded-none border-none bg-background p-0">
        <DialogTitle className="sr-only">Search products</DialogTitle>
        <div className="flex items-center gap-3 border-b px-6 py-5">
          <Search className="size-5 text-muted-foreground" strokeWidth={1.4} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search polos, T-shirts…"
            className="font-display flex-1 bg-transparent text-2xl outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {results.length === 0 && <p className="p-6 text-sm text-muted-foreground">No pieces match “{q}”.</p>}
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/product/$slug", params: { slug: p.slug } });
              }}
              className="flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-cream"
            >
              <img src={primaryImage(p)} alt="" className="h-16 w-12 object-cover" />
              <span className="flex-1">
                <span className="block text-sm uppercase tracking-wider">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.subtitle}</span>
              </span>
              <span className="text-sm">{formatINR(p.price)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenuSheet({
  open,
  onOpenChange,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  signedIn: boolean;
}) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-sm border-none bg-background p-0 [&>button]:hidden">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="flex h-20 items-center justify-between border-b px-6">
          <Logo className="h-10 w-auto" />
          <button onClick={close} aria-label="Close menu">
            <X className="size-5" strokeWidth={1.4} />
          </button>
        </div>
        <nav className="flex flex-col px-6 py-8">
          <p className="eyebrow mb-4 text-muted-foreground">Collections</p>
          <Link to="/shop" onClick={close} className="font-display py-2 text-3xl hover:text-burgundy">
            All Products
          </Link>
          {COLLECTIONS.map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ collection: c.slug }}
              onClick={close}
              className="font-display py-2 text-3xl hover:text-burgundy"
            >
              {c.name}
            </Link>
          ))}
          <Link
            to="/shop"
            search={{ collection: "new-arrivals" }}
            onClick={close}
            className="font-display py-2 text-3xl hover:text-burgundy"
          >
            New Arrivals
          </Link>
          <div className="my-8 h-px bg-border" />
          <div className="grid grid-cols-2 gap-y-3">
            <Link to="/about" onClick={close} className="eyebrow hover:text-burgundy">About Astra</Link>
            <Link to="/contact" onClick={close} className="eyebrow hover:text-burgundy">Contact</Link>
            <Link to="/help" onClick={close} className="eyebrow hover:text-burgundy">Help & Sizing</Link>
            <Link to="/wishlist" onClick={close} className="eyebrow hover:text-burgundy">Wishlist</Link>
            <Link
              to="/account"
              onClick={close}
              className="eyebrow hover:text-burgundy"
            >
              {signedIn ? "My Account" : "Sign In"}
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
