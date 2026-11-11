import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Instagram, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/catalog";
import { Logo } from "./Logo";

function formatPhone(n: string) {
  const d = n.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return `+${d}`;
}

export function SiteFooter() {
  const { data: settings } = useQuery(settingsQuery());
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const wa = settings?.whatsapp_number ?? "919361617869";

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: value });
    setBusy(false);
    if (error && error.code !== "23505") {
      toast.error("Could not subscribe right now. Please try again.");
      return;
    }
    setEmail("");
    toast.success("You're on the list. Welcome to ASTRA STYLIN.");
  }

  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-20 md:px-10">
        <form onSubmit={subscribe} className="grid gap-8 border-b border-ink-border pb-14 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h2 className="font-sans text-6xl font-light uppercase tracking-tight md:text-8xl">Email</h2>
            <p className="mt-4 max-w-md text-xs text-ink-muted">
              New drops, restocks and private previews. By submitting your email address you accept our terms & conditions and privacy policy.
            </p>
          </div>
          <div className="flex w-full items-center gap-3 md:w-[440px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              aria-label="Email address"
              className="h-12 flex-1 border-b border-ink-border bg-transparent text-sm outline-none placeholder:text-ink-muted focus:border-champagne"
            />
            <button
              type="submit"
              disabled={busy}
              className="eyebrow flex h-12 items-center gap-2 bg-champagne px-6 text-ink transition-colors hover:bg-ivory disabled:opacity-50"
            >
              Submit <ArrowRight className="size-3.5" />
            </button>
          </div>
        </form>

        <div className="grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-8">
            <div>
              <p className="eyebrow mb-3 text-ink-muted">◦ Contact</p>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-lg hover:text-champagne">
                WhatsApp {formatPhone(wa)}
              </a>
              {settings?.contact_email && (
                <a href={`mailto:${settings.contact_email}`} className="mt-1 block text-lg hover:text-champagne">
                  {settings.contact_email}
                </a>
              )}
            </div>
            <div>
              <p className="eyebrow mb-3 text-ink-muted">◦ Social</p>
              <div className="flex gap-4">
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="hover:text-champagne">
                  <MessageCircle className="size-5" strokeWidth={1.4} />
                </a>
                {settings?.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-champagne">
                    <Instagram className="size-5" strokeWidth={1.4} />
                  </a>
                )}
              </div>
            </div>
          </div>
          <FooterCol title="Shop">
            <Link to="/shop">All Products</Link>
            <Link to="/shop" search={{ collection: "polos" }}>Polo Collection</Link>
            <Link to="/shop" search={{ collection: "zip-polos" }}>Zip Polos</Link>
            <Link to="/shop" search={{ collection: "graphic-tees" }}>Graphic T-Shirts</Link>
            <Link to="/shop" search={{ collection: "textured-tees" }}>Textured T-Shirts</Link>
            <Link to="/shop" search={{ collection: "new-arrivals" }}>New Arrivals</Link>
          </FooterCol>
          <FooterCol title="Customer Service">
            <Link to="/help">Help & FAQ</Link>
            <Link to="/help" hash="sizing">Size Guide</Link>
            <Link to="/help" hash="ordering">How to Order</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/account">My Account</Link>
          </FooterCol>
          <FooterCol title="About Astra">
            <Link to="/about">Our Story</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
          </FooterCol>
        </div>

        <div className="flex flex-col gap-8 border-t border-ink-border pt-10 md:flex-row md:items-end md:justify-between">
          <Logo variant="full" tone="light" className="h-24 w-auto md:h-32" />
          <div className="space-y-2 text-xs text-ink-muted md:text-right">
            <div className="flex gap-5 md:justify-end">
              <Link to="/privacy" className="hover:text-ink-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-ink-foreground">Terms</Link>
            </div>
            <p>© {new Date().getFullYear()} ASTRA STYLIN. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-5 text-ink-muted">{title}</p>
      <div className="flex flex-col gap-2.5 text-[0.7rem] uppercase tracking-[0.14em] [&_a:hover]:text-champagne">{children}</div>
    </div>
  );
}
