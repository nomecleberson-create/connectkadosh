-- Connect Kadosh — esquema inicial (fase 1)
-- Cole no Supabase: SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create type order_status as enum (
  'recebido','pagamento_pendente','pagamento_aprovado','em_preparacao',
  'pronto_envio','saiu_entrega','entregue','cancelado'
);
create type payment_status as enum ('pendente','aprovado','recusado','cancelado','expirado','reembolsado');

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  stock integer check (stock >= 0),            -- null = estoque ilimitado
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shipping_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  sort integer not null default 0
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  zip text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state text not null,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),            -- identificador interno
  public_id text unique not null,                           -- identificador público aleatório (acompanhamento)
  order_number bigint generated always as identity unique,  -- número amigável (NÃO é usado para autorização)
  customer_id uuid not null references customers(id),
  address_id uuid references addresses(id),
  shipping_option_id uuid references shipping_options(id),
  shipping_name text,
  status order_status not null default 'recebido',
  subtotal_cents integer not null,
  shipping_cents integer not null,
  total_cents integer not null,
  notes text,
  estimated_delivery date,
  delivery_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  unit_cents integer not null,
  quantity integer not null check (quantity > 0),
  total_cents integer not null
);

create table customizations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid unique not null references order_items(id) on delete cascade,
  data jsonb not null default '{}'
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method text not null check (method in ('pix','checkout_pro')),
  status payment_status not null default 'pendente',
  amount_cents integer not null,
  mp_payment_id text unique,
  mp_preference_id text,
  mp_status text,
  mp_status_detail text,
  idempotency_key text unique,
  pix_qr_code text,
  pix_qr_base64 text,
  pix_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  actor text not null default 'sistema',
  created_at timestamptz not null default now()
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references orders(id) on delete cascade,
  eta timestamptz,
  started_at timestamptz,
  finished_at timestamptz
);

create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create index on orders (status, created_at desc);
create index on payments (order_id);
create index on order_status_history (order_id, created_at);

-- Segurança: RLS ligado em tudo. Sem política = ninguém (anon) lê ou grava.
-- O site acessa o banco só pelo servidor (service role). Clientes nunca consultam tabelas direto.
do $$
declare t text;
begin
  foreach t in array array['products','shipping_options','customers','addresses','orders','order_items',
    'customizations','payments','order_status_history','deliveries','admin_users']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- Administradores autenticados (usados no painel, fase 2) têm acesso total.
do $$
declare t text;
begin
  foreach t in array array['products','shipping_options','customers','addresses','orders','order_items',
    'customizations','payments','order_status_history','deliveries']
  loop
    execute format('create policy "admin total" on %I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Catálogo público: somente leitura de produtos e fretes ativos.
create policy "catalogo publico" on products for select using (active);
create policy "frete publico" on shipping_options for select using (active);

-- Atualizações em tempo real do painel (fase 2).
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table payments;

-- Dados iniciais. Ajuste preços e fretes depois pelo Table Editor (ou pelo painel, fase 3).
insert into products (slug, name, description, price_cents)
values ('tag-nfc-qr', 'Tag NFC + QR Code plastificada',
        'Aproxime o celular ou escaneie o QR Code e abra o link que você escolher.', 1500);

insert into shipping_options (name, description, price_cents, sort) values
  ('Retirada / combinar pelo WhatsApp', 'Sem custo. Combinamos a retirada com você.', 0, 1),
  ('Entrega local', 'Valor de exemplo: ajuste conforme sua região.', 1000, 2);
