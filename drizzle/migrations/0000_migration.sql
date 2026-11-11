-- ===== Types =====
create type public.app_role as enum ('admin', 'customer');
create type public.order_status as enum ('pending','confirmed','processing','shipped','delivered','cancelled');

-- ===== Profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ===== Roles =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email, new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;

create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(424242);
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end; $$;

revoke execute on function public.claim_first_admin() from anon, public;
grant execute on function public.claim_first_admin() to authenticated;
grant execute on function public.admin_exists() to authenticated;

-- ===== Products =====
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  description text,
  price integer not null check (price >= 0),
  collection text not null default 'polos',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Public reads active products" on public.products for select to anon, authenticated
  using (status = 'active' or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  kind text not null default 'gallery' check (kind in ('product','model','gallery')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.product_images(product_id);
grant select on public.product_images to anon;
grant select, insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "Public reads images" on public.product_images for select to anon, authenticated using (true);
create policy "Admins manage images" on public.product_images for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  colour_name text not null,
  colour_hex text not null default '#cccccc',
  sort_order integer not null default 0,
  unique (product_id, colour_name)
);
grant select on public.product_variants to anon;
grant select, insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;
create policy "Public reads variants" on public.product_variants for select to anon, authenticated using (true);
create policy "Admins manage variants" on public.product_variants for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (size in ('S','M','L','XL','XXL')),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (product_id, size)
);
grant select on public.inventory to anon;
grant select, insert, update, delete on public.inventory to authenticated;
grant all on public.inventory to service_role;
alter table public.inventory enable row level security;
create policy "Public reads inventory" on public.inventory for select to anon, authenticated using (true);
create policy "Admins manage inventory" on public.inventory for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== Addresses =====
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.addresses(user_id);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "Own addresses select" on public.addresses for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Own addresses insert" on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy "Own addresses update" on public.addresses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own addresses delete" on public.addresses for delete to authenticated using (user_id = auth.uid());

-- ===== Orders =====
create sequence public.order_number_seq start 1001;
grant usage on sequence public.order_number_seq to service_role;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('AST-' || nextval('public.order_number_seq')::text),
  user_id uuid not null,
  status public.order_status not null default 'pending',
  subtotal integer not null default 0,
  total integer not null default 0,
  shipping_name text not null,
  shipping_phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders(user_id);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Own orders select" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  colour text,
  size text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null,
  image_url text
);
create index on public.order_items(order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Own order items select" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin')))
);

-- ===== Store settings =====
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  whatsapp_number text not null default '919361617869',
  announcement text not null default 'Order directly on WhatsApp · Sizes S to XXL',
  instagram_url text,
  contact_email text,
  updated_at timestamptz not null default now()
);
grant select on public.store_settings to anon;
grant select, update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "Public reads settings" on public.store_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.store_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== updated_at trigger =====
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger t_products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger t_inventory_touch before update on public.inventory for each row execute function public.touch_updated_at();
create trigger t_orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger t_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_settings_touch before update on public.store_settings for each row execute function public.touch_updated_at();

-- ===== Place order (atomic stock reservation) =====
create or replace function public.place_order(p_items jsonb, p_address jsonb, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_size text;
  v_colour text;
  v_stock integer;
  v_subtotal integer := 0;
  v_order public.orders%rowtype;
  v_img text;
begin
  if v_uid is null then raise exception 'Please sign in to place an order'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty';
  end if;
  if coalesce(trim(p_address->>'full_name'),'') = '' or coalesce(trim(p_address->>'phone'),'') = ''
     or coalesce(trim(p_address->>'line1'),'') = '' or coalesce(trim(p_address->>'city'),'') = ''
     or coalesce(trim(p_address->>'state'),'') = '' or coalesce(trim(p_address->>'postal_code'),'') = '' then
    raise exception 'Please complete your delivery details';
  end if;

  insert into public.orders (user_id, shipping_name, shipping_phone, line1, line2, city, state, postal_code, notes)
  values (v_uid, trim(p_address->>'full_name'), trim(p_address->>'phone'), trim(p_address->>'line1'), nullif(trim(coalesce(p_address->>'line2','')),''),
          trim(p_address->>'city'), trim(p_address->>'state'), trim(p_address->>'postal_code'), nullif(trim(coalesce(p_notes,'')),''))
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    v_size := v_item->>'size';
    v_colour := nullif(v_item->>'colour','');
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'Invalid quantity'; end if;

    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and status = 'active';
    if not found then raise exception 'A product in your bag is no longer available'; end if;

    if v_colour is not null and exists (select 1 from public.product_variants where product_id = v_product.id)
       and not exists (select 1 from public.product_variants where product_id = v_product.id and colour_name = v_colour) then
      raise exception 'Colour % is not available for %', v_colour, v_product.name;
    end if;

    select quantity into v_stock from public.inventory where product_id = v_product.id and size = v_size for update;
    if v_stock is null or v_stock < v_qty then
      raise exception 'Only % left in size % for %', coalesce(v_stock,0), v_size, v_product.name;
    end if;
    update public.inventory set quantity = quantity - v_qty where product_id = v_product.id and size = v_size;

    select url into v_img from public.product_images where product_id = v_product.id order by (kind = 'product') desc, sort_order limit 1;

    insert into public.order_items (order_id, product_id, product_name, colour, size, quantity, unit_price, image_url)
    values (v_order.id, v_product.id, v_product.name, v_colour, v_size, v_qty, v_product.price, v_img);
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order.id;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'total', v_subtotal);
end; $$;
revoke execute on function public.place_order(jsonb, jsonb, text) from anon, public;
grant execute on function public.place_order(jsonb, jsonb, text) to authenticated;

-- ===== Admin: change order status (restock on cancel) =====
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_old public.order_status; r record; v_stock integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Not authorised'; end if;
  select status into v_old from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_old = p_status then return; end if;

  if p_status = 'cancelled' and v_old <> 'cancelled' then
    for r in select product_id, size, quantity from public.order_items where order_id = p_order_id and product_id is not null loop
      update public.inventory set quantity = quantity + r.quantity where product_id = r.product_id and size = r.size;
    end loop;
  elsif v_old = 'cancelled' and p_status <> 'cancelled' then
    for r in select product_id, size, quantity from public.order_items where order_id = p_order_id and product_id is not null loop
      select quantity into v_stock from public.inventory where product_id = r.product_id and size = r.size for update;
      if v_stock is null or v_stock < r.quantity then raise exception 'Not enough stock to reopen this order'; end if;
      update public.inventory set quantity = quantity - r.quantity where product_id = r.product_id and size = r.size;
    end loop;
  end if;

  update public.orders set status = p_status where id = p_order_id;
end; $$;
revoke execute on function public.admin_set_order_status(uuid, public.order_status) from anon, public;
grant execute on function public.admin_set_order_status(uuid, public.order_status) to authenticated;

-- Auto-create size rows for new products
create or replace function public.create_inventory_rows() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory (product_id, size, quantity)
  select new.id, s, 0 from unnest(array['S','M','L','XL','XXL']) as s
  on conflict (product_id, size) do nothing;
  return new;
end; $$;
create trigger t_products_inventory after insert on public.products for each row execute function public.create_inventory_rows();

-- ===== Storage policies for product images (private bucket, long-lived signed URLs) =====
create policy "Public read product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "Admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

-- ===== Seed: store settings =====
insert into public.store_settings (id) values (1) on conflict do nothing;

-- ===== Seed: catalogue products =====
insert into public.products (slug, name, subtitle, description, price, collection, is_featured, is_new, sort_order) values
('textured-zip-polo','Textured Zip Polo','Clean details · Elevated everyday style','A textured-knit polo with a sleek zip placket and a neat collar. Clean details make it an easy step up for everyday wear.',549,'zip-polos',true,true,1),
('premium-zip-polo','Premium Zip Polo','Textured finish · Elevated everyday style','A premium zip polo with a subtle textured finish, cut for a sharp, comfortable fit from day to evening.',549,'zip-polos',true,true,2),
('pepe-jeans-polo','Pepe Jeans Polo','Smart casual · Everyday essentials','A smart-casual buttoned polo with a fine textured weave and signature chest embroidery. An everyday essential in six colours.',549,'polos',true,false,3),
('paris-polo','Paris Polo','Minimal design · Premium everyday style','A minimal pique polo finished with tonal PARIS embroidery and tipped sleeves. Premium everyday style.',549,'polos',true,false,4),
('textured-knit-tshirt','Textured Knit T-Shirt','Everyday comfort · Multiple colour options','A soft textured-knit crew neck T-shirt made for everyday comfort, available in multiple colours.',249,'textured-tees',true,false,5),
('xoxo-graphic-tshirt','XOXO Graphic T-Shirt','Minimal streetwear · Black & White','A relaxed crew neck tee with a bold chest graphic. Minimal streetwear in black or white.',599,'graphic-tees',true,true,6),
('monogram-raglan-tshirt','Monogram Raglan T-Shirt','Casual collection · Multiple colours','A tonal monogram-jacquard raglan tee with contrast piping and ringer trims.',529,'graphic-tees',true,true,7),
('textured-polo','Textured Polo','Diamond pattern collection','A zip polo in an all-over diamond-pattern texture. Part of the Diamond Pattern Collection.',549,'polos',true,false,8),
('classic-white-henley','Classic White','Long-sleeve henley T-shirt','A clean white long-sleeve henley in a soft textured knit with a three-button placket.',729,'textured-tees',true,true,9),
('white-navy-half-zip-polo','White & Navy','Half-zip polo shirt','A white half-zip polo with navy raglan piping and a striped collar for a sporty, polished look.',599,'zip-polos',true,true,10),
('navy-wave-stripe-zip-polo','Navy Wave-Stripe','Zip polo shirt','A navy zip polo with a bold white wave stripe, contrast collar and chest monogram.',599,'zip-polos',true,true,11),
('visca-barca-quarter-zip','Visca Barça','Quarter-zip sweatshirt','A white quarter-zip sweatshirt with VISCA BARÇA lettering, crest detail and striped sleeves.',649,'graphic-tees',true,true,12);

insert into public.product_images (product_id, url, kind, sort_order)
select p.id, v.url, v.kind, v.ord from public.products p join (values
('textured-zip-polo','/__l5e/assets-v1/42d6d44e-828d-4d8e-b8dc-c7f2181cdea9/textured-zip-polo-product.jpg','product',0),
('textured-zip-polo','/__l5e/assets-v1/a59152e6-5bc5-4515-93a3-7e8cc385ac03/textured-zip-polo-model.jpg','model',1),
('premium-zip-polo','/__l5e/assets-v1/5c6018b8-3390-42ac-bb51-c04fea7ded04/premium-zip-polo-product.jpg','product',0),
('premium-zip-polo','/__l5e/assets-v1/68c8c7dc-37db-415e-ad41-140a8b48109e/premium-zip-polo-model.jpg','model',1),
('pepe-jeans-polo','/__l5e/assets-v1/a66afeb2-cc92-4170-99e5-023c63f0d8f5/pepe-jeans-polo-product.jpg','product',0),
('pepe-jeans-polo','/__l5e/assets-v1/f7bc67af-00e4-4233-b07d-fa6dac92ce37/pepe-jeans-polo-model.jpg','model',1),
('paris-polo','/__l5e/assets-v1/0bf6df3d-8482-46e8-9a86-9042234cb624/paris-polo-product.jpg','product',0),
('paris-polo','/__l5e/assets-v1/b54b711d-1c76-40e3-95e3-fb11aac5e313/paris-polo-model.jpg','model',1),
('textured-knit-tshirt','/__l5e/assets-v1/3b1e2874-ade2-47d8-a80d-a8dc03a2132f/textured-knit-tshirt-product.jpg','product',0),
('textured-knit-tshirt','/__l5e/assets-v1/b9c5f06a-2da0-437a-9b79-eb084a609c73/textured-knit-tshirt-model.jpg','model',1),
('xoxo-graphic-tshirt','/__l5e/assets-v1/73b8666d-e18e-4a55-8e83-aab45ef5f9b8/xoxo-graphic-tshirt-product.jpg','product',0),
('xoxo-graphic-tshirt','/__l5e/assets-v1/6f3461c3-9f77-45a1-a981-c767d637894e/xoxo-graphic-tshirt-model.jpg','model',1),
('monogram-raglan-tshirt','/__l5e/assets-v1/55b200f7-808e-40fd-ac18-aade9231b07c/monogram-raglan-tshirt-product.jpg','product',0),
('monogram-raglan-tshirt','/__l5e/assets-v1/2068358b-58cb-42a7-b6fe-86e42a4ffece/monogram-raglan-tshirt-model.jpg','model',1),
('textured-polo','/__l5e/assets-v1/a64a6719-bcaf-42da-87bd-bd81f9c8c9b9/textured-polo-product.jpg','product',0),
('textured-polo','/__l5e/assets-v1/2dc1d5a6-8c6a-4b21-82c9-16b588ebc835/textured-polo-model.jpg','model',1),
('classic-white-henley','/__l5e/assets-v1/934218cc-7d6a-4f10-88af-e5d1b3d23c57/classic-white-henley-product.jpg','product',0),
('classic-white-henley','/__l5e/assets-v1/c1e26572-6f28-40da-8e27-2bd3ff7b60b6/classic-white-henley-model.jpg','model',1),
('white-navy-half-zip-polo','/__l5e/assets-v1/a003f33a-a229-4259-914e-4b58de3e8f26/white-navy-half-zip-polo-product.jpg','product',0),
('white-navy-half-zip-polo','/__l5e/assets-v1/476e4c4e-a6e4-4076-a782-79372f98772d/white-navy-half-zip-polo-model.jpg','model',1),
('navy-wave-stripe-zip-polo','/__l5e/assets-v1/cb89ed6b-d20d-4700-9708-f39a9de336dd/navy-wave-stripe-zip-polo-product.jpg','product',0),
('navy-wave-stripe-zip-polo','/__l5e/assets-v1/393a537c-8a9e-40a5-9dd7-ca4a7eb58298/navy-wave-stripe-zip-polo-model.jpg','model',1),
('visca-barca-quarter-zip','/__l5e/assets-v1/cf566ded-ccbc-4251-937e-ccffe2a98302/visca-barca-quarter-zip-product.jpg','product',0),
('visca-barca-quarter-zip','/__l5e/assets-v1/20ca6af4-92ba-45ca-82d1-077c6e9fa483/visca-barca-quarter-zip-model.jpg','model',1)
) as v(slug, url, kind, ord) on v.slug = p.slug;

insert into public.product_variants (product_id, colour_name, colour_hex, sort_order)
select p.id, v.name, v.hex, v.ord from public.products p join (values
('textured-zip-polo','White','#F3F1EC',0),('textured-zip-polo','Black','#1B1B1B',1),
('premium-zip-polo','White','#F3F1EC',0),('premium-zip-polo','Black','#1B1B1B',1),('premium-zip-polo','Beige','#D8C7A8',2),
('pepe-jeans-polo','Grey','#A8A9A6',0),('pepe-jeans-polo','Beige','#D9CDB8',1),('pepe-jeans-polo','White','#F3F1EC',2),('pepe-jeans-polo','Sage','#A9BFA0',3),('pepe-jeans-polo','Sky Blue','#A9C3E0',4),('pepe-jeans-polo','Pink','#D9AEB1',5),
('paris-polo','Sky Blue','#9DB4C4',0),('paris-polo','Pink','#CFA9B8',1),('paris-polo','White','#F3F1EC',2),('paris-polo','Sage Green','#A8C2A0',3),
('textured-knit-tshirt','Maroon','#7A1E25',0),('textured-knit-tshirt','White','#F3F1EC',1),('textured-knit-tshirt','Black','#1B1B1B',2),('textured-knit-tshirt','Beige','#D8C6A8',3),('textured-knit-tshirt','Green','#7E9479',4),('textured-knit-tshirt','Navy','#1F2B47',5),('textured-knit-tshirt','Pink','#C99AA6',6),
('xoxo-graphic-tshirt','White','#F3F1EC',0),('xoxo-graphic-tshirt','Black','#1B1B1B',1),
('monogram-raglan-tshirt','Black','#1B1B1B',0),('monogram-raglan-tshirt','Green','#8BA583',1),('monogram-raglan-tshirt','White','#F3F1EC',2),('monogram-raglan-tshirt','Beige','#CDB394',3),('monogram-raglan-tshirt','Brown','#7A5240',4),
('textured-polo','White','#F3F1EC',0),('textured-polo','Black','#1B1B1B',1),('textured-polo','Beige','#D8C7A8',2),('textured-polo','Navy','#1F2B47',3),('textured-polo','Green','#A3B79A',4),
('classic-white-henley','White','#F3F1EC',0),
('white-navy-half-zip-polo','White & Navy','#F3F1EC',0),
('navy-wave-stripe-zip-polo','Navy & White','#1F2B47',0),
('visca-barca-quarter-zip','White','#F3F1EC',0)
) as v(slug, name, hex, ord) on v.slug = p.slug;
