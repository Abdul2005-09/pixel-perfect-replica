CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  colour text NOT NULL DEFAULT '',
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, colour, size)
);
CREATE INDEX cart_items_user_idx ON public.cart_items(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own cart select" ON public.cart_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own cart insert" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own cart update" ON public.cart_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own cart delete" ON public.cart_items FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER t_cart_touch BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX wishlists_user_idx ON public.wishlists(user_id);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own wishlist select" ON public.wishlists FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own wishlist insert" ON public.wishlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own wishlist delete" ON public.wishlists FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_adjust_stock(p_product_id uuid, p_size text, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare v_new integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  insert into public.inventory (product_id, size, quantity) values (p_product_id, p_size, 0)
  on conflict (product_id, size) do nothing;
  update public.inventory set quantity = quantity + p_delta
  where product_id = p_product_id and size = p_size and quantity + p_delta >= 0
  returning quantity into v_new;
  if v_new is null then raise exception 'Stock cannot go below zero'; end if;
  return v_new;
end; $$;
REVOKE ALL ON FUNCTION public.admin_adjust_stock(uuid, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(uuid, text, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images(product_id);