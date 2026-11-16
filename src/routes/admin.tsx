import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireSession } from "@/lib/auth";
import {
  COLLECTIONS,
  SIZES,
  adminProductsQuery,
  formatINR,
  slugify,
  totalStock,
  type Product,
} from "@/lib/catalog";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const s = await requireSession(location.href);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin");
    if (!data?.length) throw redirect({ to: "/account" });
  },
  head: () => ({ meta: [{ title: "Store Admin — ASTRA STYLIN" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();
  const { data: products = [], isLoading: productsLoading } = useQuery(adminProductsQuery());
  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: salesItems = [] } = useQuery({
    queryKey: ["admin", "sales-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("product_id, product_name, quantity, order_id");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [showAdd, setShowAdd] = useState(false);
  const [customCollection, setCustomCollection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "archived" | "sold_out">("all");

  const salesByProduct = useMemo(() => {
    const totals = new Map<string, { name: string; units: number }>();
    for (const item of salesItems) {
      if (!item.product_id) continue;
      const current = totals.get(item.product_id) ?? { name: item.product_name, units: 0 };
      current.units += item.quantity;
      totals.set(item.product_id, current);
    }
    return [...totals.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.units - a.units).slice(0, 5);
  }, [salesItems]);

  const activeProducts = products.filter((p) => p.status === "active");
  const soldOutProducts = products.filter((p) => totalStock(p) <= 0 && p.status === "active");
  const lowStockProducts = products.filter((p) => totalStock(p) > 0 && totalStock(p) <= 5 && p.status === "active");
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total), 0);
  const visibleProducts = products.filter((p) => {
    if (filter === "active") return p.status === "active";
    if (filter === "archived") return p.status !== "active";
    if (filter === "sold_out") return totalStock(p) <= 0;
    return true;
  });

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["products"] }),
      qc.invalidateQueries({ queryKey: ["admin"] }),
    ]);
  }

  async function setStock(productId: string, size: string, value: string) {
    const quantity = Math.max(0, parseInt(value || "0", 10) || 0);
    const { error } = await supabase.from("inventory").upsert(
      { product_id: productId, size, quantity },
      { onConflict: "product_id,size" },
    );
    if (error) { toast.error(error.message); return; }
    toast.success("Stock saved");
    await refresh();
  }

  async function setStatus(id: string, status: (typeof STATUSES)[number]) {
    const { error } = await supabase.rpc("admin_set_order_status", { p_order_id: id, p_status: status });
    if (error) { toast.error(error.message); return; }
    toast.success("Order updated");
    await refresh();
  }

  async function updateProduct(id: string, changes: Partial<Pick<Product, "is_new" | "is_featured" | "status">>) {
    const { error } = await supabase.from("products").update(changes).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product updated");
    await refresh();
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const price = Number(data.get("price"));
    const slug = slugify(name);
    const selectedCollection = String(data.get("collection") ?? "polos");
    const customCollectionName = String(data.get("customCollection") ?? "").trim();
    const collection = selectedCollection === "__custom__" ? slugify(customCollectionName) : selectedCollection;
    const modelImage = data.get("modelImage");
    const productImage = data.get("productImage");
    if (!name || !slug || !Number.isFinite(price) || price <= 0) {
      toast.error("Enter a product name and a valid price.");
      return;
    }
    if (!collection || (selectedCollection === "__custom__" && !customCollectionName)) {
      toast.error("Choose a collection or enter a custom collection name.");
      return;
    }
    if (!(modelImage instanceof File) || !modelImage.size || !(productImage instanceof File) || !productImage.size) {
      toast.error("Please select both a model photo and a product photo.");
      return;
    }

    setSaving(true);
    try {
      const { data: created, error: createError } = await supabase.from("products").insert({
        name,
        slug,
        price,
        subtitle: String(data.get("subtitle") ?? "").trim() || null,
        description: String(data.get("description") ?? "").trim() || null,
        collection,
        status: "active",
        is_new: data.get("is_new") === "on",
        is_featured: data.get("is_featured") === "on",
        sort_order: products.length + 1,
      }).select("id").single();
      if (createError) throw createError;

      const productId = created.id;
      const files = [
        { file: modelImage, kind: "model" },
        { file: productImage, kind: "product" },
      ];
      const imageRows: { product_id: string; url: string; kind: string; sort_order: number }[] = [];
      for (const [index, item] of files.entries()) {
        const safeName = item.file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
        const storagePath = `products/${productId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, item.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: item.file.type || undefined,
        });
        if (uploadError) throw uploadError;
        imageRows.push({ product_id: productId, url: `storage:${storagePath}`, kind: item.kind, sort_order: index });
      }
      const { error: imagesError } = await supabase.from("product_images").insert(imageRows);
      if (imagesError) throw imagesError;

      const inventoryRows = SIZES.map((size) => ({
        product_id: productId,
        size,
        quantity: Math.max(0, Number(data.get(`stock-${size}`) ?? 0) || 0),
      }));
      const { error: stockError } = await supabase.from("inventory").upsert(inventoryRows, { onConflict: "product_id,size" });
      if (stockError) throw stockError;

      toast.success("Product added and images uploaded to Supabase.");
      form.reset();
      setCustomCollection(false);
      setShowAdd(false);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add this product.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f4] text-[#171513]">
      <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-burgundy">ASTRA STYLIN · CONTROL CENTRE</p>
            <h1 className="font-display mt-2 text-4xl md:text-5xl">Store dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage your catalogue, stock, orders and new arrivals.</p>
          </div>
          <Link to="/" className="eyebrow border border-[#d9d1c7] px-5 py-3 hover:bg-white">View store →</Link>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total orders" value={String(orders.length)} detail="All orders received" />
          <Metric label="Revenue" value={formatINR(revenue)} detail="Excludes cancelled orders" />
          <Metric label="Active products" value={String(activeProducts.length)} detail="Visible in the storefront" />
          <Metric label="Stock alerts" value={String(soldOutProducts.length + lowStockProducts.length)} detail={`${soldOutProducts.length} sold out · ${lowStockProducts.length} low stock`} />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="border border-[#ded8cf] bg-white p-5 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div><p className="eyebrow text-muted-foreground">SALES PERFORMANCE</p><h2 className="font-display mt-1 text-2xl">Trending products</h2></div>
              <span className="text-xs text-muted-foreground">By units ordered</span>
            </div>
            {salesByProduct.length ? (
              <div className="mt-6 space-y-4">
                {salesByProduct.map((item, index) => {
                  const max = Math.max(...salesByProduct.map((x) => x.units), 1);
                  return <div key={item.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm"><span>{index + 1}. {item.name}</span><span className="font-medium">{item.units} sold</span></div>
                    <div className="h-2 bg-[#eee9e1]"><div className="h-2 bg-[#711e27]" style={{ width: `${(item.units / max) * 100}%` }} /></div>
                  </div>;
                })}
              </div>
            ) : <p className="mt-6 text-sm text-muted-foreground">No sales yet. Product rankings will appear after customers place orders.</p>}
          </div>
          <div className="border border-[#ded8cf] bg-white p-5 md:p-7">
            <p className="eyebrow text-muted-foreground">NEEDS ATTENTION</p>
            <h2 className="font-display mt-1 text-2xl">Stock alerts</h2>
            <div className="mt-5 space-y-3">
              {soldOutProducts.slice(0, 4).map((p) => <AlertRow key={p.id} product={p} label="Sold out" />)}
              {lowStockProducts.slice(0, 4).map((p) => <AlertRow key={p.id} product={p} label={`${totalStock(p)} left`} />)}
              {!soldOutProducts.length && !lowStockProducts.length && <p className="text-sm text-muted-foreground">All active products have more than 5 units in stock.</p>}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow text-muted-foreground">CATALOGUE MANAGEMENT</p><h2 className="font-display mt-1 text-3xl">Products</h2></div>
            <button onClick={() => setShowAdd((v) => !v)} className="eyebrow bg-[#171513] px-5 py-3 text-white hover:bg-burgundy">{showAdd ? "Close form" : "+ Add new product"}</button>
          </div>

          {showAdd && <form onSubmit={addProduct} className="mt-5 border border-[#ded8cf] bg-white p-5 md:p-7">
            <h3 className="font-display text-2xl">Add / upload product</h3>
            <p className="mt-1 text-xs text-muted-foreground">Product details and photos are saved to your Supabase database and private product-images storage.</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Field label="Product name"><input name="name" required placeholder="e.g. Astra Graphic Tee" className={fieldClass} /></Field>
                <Field label="Short subtitle"><input name="subtitle" placeholder="Premium unisex fit" className={fieldClass} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price (₹)"><input name="price" required type="number" min="1" step="1" placeholder="849" className={fieldClass} /></Field>
                  <Field label="Collection">
                    <select name="collection" defaultValue="polos" onChange={(e) => setCustomCollection(e.target.value === "__custom__")} className={fieldClass}>
                      {COLLECTIONS.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      <option value="__custom__">＋ Add a custom collection…</option>
                    </select>
                    {customCollection && <input name="customCollection" required placeholder="e.g. Minimalist Essentials" className={fieldClass + " mt-2"} />}
                  </Field>
                </div>
                <Field label="Description"><textarea name="description" rows={3} placeholder="Describe the fabric, fit and details..." className={fieldClass} /></Field>
                <div className="flex flex-wrap gap-5 text-sm">
                  <label className="flex items-center gap-2"><input name="is_new" type="checkbox" defaultChecked /> Mark as new arrival</label>
                  <label className="flex items-center gap-2"><input name="is_featured" type="checkbox" /> Feature on store</label>
                </div>
              </div>
              <div>
                <p className="eyebrow mb-3">UPLOAD PRODUCT IMAGES</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Model photo"><input name="modelImage" required type="file" accept="image/png,image/jpeg,image/webp" className={fileClass} /></Field>
                  <Field label="Product / hanger photo"><input name="productImage" required type="file" accept="image/png,image/jpeg,image/webp" className={fileClass} /></Field>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">PNG, JPG or WebP. Both image types are uploaded to Supabase Storage.</p>
                <p className="eyebrow mb-3 mt-7">INITIAL STOCK BY SIZE</p>
                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((size) => <label key={size} className="text-center"><span className="eyebrow mb-2 block">{size}</span><input name={`stock-${size}`} type="number" min="0" defaultValue="0" className="h-10 w-full border border-[#ded8cf] text-center" /></label>)}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end"><button disabled={saving} className="eyebrow bg-burgundy px-7 py-3 text-white disabled:opacity-50">{saving ? "Saving product..." : "Add product"}</button></div>
          </form>}

          <div className="mt-5 flex flex-wrap gap-2">
            {(["all", "active", "sold_out", "archived"] as const).map((v) => <button key={v} onClick={() => setFilter(v)} className={`eyebrow border px-4 py-2 ${filter === v ? "border-[#171513] bg-[#171513] text-white" : "border-[#ded8cf] hover:bg-white"}`}>{v.replace("_", " ")}</button>)}
          </div>
          <div className="mt-4 overflow-x-auto border border-[#ded8cf] bg-white">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-[#f1ede6]"><tr><th className="eyebrow p-3 text-left">Product</th><th className="eyebrow p-3 text-left">Price</th><th className="eyebrow p-3">Total stock</th><th className="eyebrow p-3">Store label</th><th className="eyebrow p-3">Visibility</th><th className="eyebrow p-3">Manage</th></tr></thead>
              <tbody>
                {productsLoading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading products...</td></tr> : visibleProducts.map((p) => <ProductRow key={p.id} product={p} onUpdate={updateProduct} onStock={setStock} />)}
                {!productsLoading && !visibleProducts.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No products in this view.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Use the labels to mark new arrivals, feature popular pieces, or archive outdated products. Stock changes are saved to Supabase when you leave a size field.</p>
        </section>

        <section className="mt-12">
          <p className="eyebrow text-muted-foreground">FULFILMENT</p><h2 className="font-display mt-1 text-3xl">Recent orders</h2>
          {orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p> : <div className="mt-4 divide-y border border-[#ded8cf] bg-white">
            {orders.map((o) => <div key={o.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_2fr_auto_auto] md:items-center">
              <div><p className="font-medium">{o.order_number}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p></div>
              <div><p>{o.shipping_name} · {o.shipping_phone}</p><p className="text-xs text-muted-foreground">{o.order_items.map((i) => `${i.product_name} (${i.size}) ×${i.quantity}`).join(", ")}</p><p className="text-xs text-muted-foreground">{[o.line1, o.line2, o.city, o.state, o.postal_code].filter(Boolean).join(", ")}</p></div>
              <span>{formatINR(o.total)}</span>
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as (typeof STATUSES)[number])} className="h-9 border border-[#ded8cf] bg-white px-2 text-xs uppercase tracking-widest">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>)}
          </div>}
        </section>
      </div>
    </main>
  );
}

const fieldClass = "h-11 w-full border border-[#ded8cf] bg-[#fffdfa] px-3 text-sm outline-none focus:border-burgundy";
const fileClass = "block w-full text-xs file:mr-2 file:border-0 file:bg-[#f1ede6] file:px-3 file:py-2 file:text-xs";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="eyebrow mb-2 block text-muted-foreground">{label}</span>{children}</label>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border border-[#ded8cf] bg-white p-5"><p className="eyebrow text-muted-foreground">{label}</p><p className="font-display mt-3 text-3xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}
function AlertRow({ product, label }: { product: Product; label: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[#eee9e1] pb-3 text-sm"><span>{product.name}</span><span className="text-xs font-medium text-burgundy">{label}</span></div>;
}
function ProductRow({ product, onUpdate, onStock }: { product: Product; onUpdate: (id: string, changes: Partial<Pick<Product, "is_new" | "is_featured" | "status">>) => void; onStock: (id: string, size: string, value: string) => void }) {
  const stock = totalStock(product);
  const label = stock <= 0 ? "Sold out" : stock <= 5 ? "Low stock" : product.is_new ? "New arrival" : product.is_featured ? "Featured" : "Regular";
  return <>
    <tr className="border-t border-[#eee9e1]">
      <td className="p-3"><div className="flex items-center gap-3"><div className="size-12 shrink-0 overflow-hidden bg-[#f1ede6]">{product.images[0]?.url && <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />}</div><div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.collection}</p></div></div></td>
      <td className="p-3">{formatINR(product.price)}</td>
      <td className="p-3 text-center"><span className={stock <= 5 ? "font-semibold text-burgundy" : ""}>{stock}</span></td>
      <td className="p-3 text-center">{label}</td>
      <td className="p-3 text-center"><select value={product.status} onChange={(e) => onUpdate(product.id, { status: e.target.value })} className="h-9 border border-[#ded8cf] bg-white px-2 text-xs"><option value="active">Active</option><option value="archived">Archived</option></select></td>
      <td className="p-3"><div className="flex flex-col gap-1 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={product.is_new} onChange={(e) => onUpdate(product.id, { is_new: e.target.checked })} /> New arrival</label><label className="flex items-center gap-2"><input type="checkbox" checked={product.is_featured} onChange={(e) => onUpdate(product.id, { is_featured: e.target.checked })} /> Featured</label></div></td>
    </tr>
    <tr className="border-t border-[#eee9e1] bg-[#fcfaf7]"><td colSpan={6} className="px-4 py-3"><div className="flex flex-wrap items-center gap-3"><span className="eyebrow text-muted-foreground">EDIT SIZE STOCK</span>{SIZES.map((size) => { const quantity = product.inventory.find((i) => i.size === size)?.quantity ?? 0; return <label key={size} className="flex items-center gap-2 text-xs"><span className="font-medium">{size}</span><input type="number" min="0" defaultValue={quantity} onBlur={(e) => { if (e.target.value !== String(quantity)) onStock(product.id, size, e.target.value); }} className="h-8 w-16 border border-[#ded8cf] bg-white text-center" aria-label={`${product.name} size ${size} stock`} /></label>; })}</div></td></tr>
  </>;
}
