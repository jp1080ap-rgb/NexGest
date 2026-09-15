-- NexGest V3.1a - supabase-schema.sql
-- Estrutura base - RLS será adicionada na V3.1b
-- Não executar automático, apenas preparação

-- Extensões
create extension if not exists "uuid-ossp";

-- profiles - vinculado ao auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  store_name text,
  phone text,
  plan text default 'basico', -- basico, profissional, premium
  subscription_status text default 'trial',
  trial_ends_at timestamptz,
  created_at timestamptz default now()
);

-- stores - conta/loja do usuário (opcional, para multi-loja futuro)
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  owner_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz default now()
);

-- inventory / products - estoque (bateria só Apple)
create table if not exists inventory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  store_id uuid references stores(id) on delete set null,
  legacy_store_id text, -- compatibilidade V3.0 store_001
  brand text not null,
  model text not null,
  storage text,
  color text,
  condition text, -- Novo, Seminovo, Usado
  battery int, -- IMPORTANTE: somente para Apple/iPhone, null para Samsung/Xiaomi
  imei text,
  serial text,
  cost numeric,
  price numeric,
  status text default 'Disponível', -- Disponível, Reservado, Vendido, Arquivado
  photo_url text,
  entry_date timestamptz default now(),
  notes text,
  has_warranty boolean default false,
  warranty_duration int,
  warranty_unit text, -- dias, meses
  warranty_start_date date,
  warranty_end_date date,
  warranty_note text,
  history jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_inventory_user on inventory(user_id);
create index if not exists idx_inventory_imei on inventory(user_id, imei);
create index if not exists idx_inventory_status on inventory(status);

-- customers
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  store_id uuid references stores(id) on delete set null,
  legacy_store_id text,
  name text not null,
  phone text not null,
  whatsapp text,
  cpf text,
  email text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_customers_user on customers(user_id);

-- sales
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  store_id uuid references stores(id) on delete set null,
  legacy_store_id text,
  device_id uuid references inventory(id) on delete set null,
  device_snapshot jsonb,
  sale_price numeric not null,
  cost numeric,
  profit numeric,
  discount numeric default 0,
  payment_method text,
  fees numeric default 0,
  installments int,
  observations text,
  client_id uuid references customers(id) on delete set null,
  client_name_snapshot text,
  sale_date timestamptz default now(),
  is_canceled boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_sales_user on sales(user_id);
create index if not exists idx_sales_date on sales(sale_date);

-- expenses / financeiro
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  store_id uuid references stores(id) on delete set null,
  legacy_store_id text,
  description text not null,
  category text,
  amount numeric not null,
  date timestamptz default now(),
  notes text,
  related_sale_id uuid references sales(id) on delete set null,
  type text default 'expense', -- expense, sale, reversal
  created_at timestamptz default now()
);
create index if not exists idx_expenses_user on expenses(user_id);

-- subscriptions - para Mercado Pago futuro
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text default 'basico',
  status text default 'trial',
  price numeric,
  max_devices int,
  mp_preapproval_id text,
  mp_status text,
  next_billing_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===============================
-- V3.1c.1 - RLS REAL - INVENTORY
-- ===============================
-- Profiles
alter table profiles enable row level security;
drop policy if exists "users own profile" on profiles;
create policy "users own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Stores
alter table stores enable row level security;
drop policy if exists "isolamento stores" on stores;
create policy "isolamento stores" on stores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Inventory - RLS REAL V3.1c.1
alter table inventory enable row level security;

drop policy if exists "users can view own inventory" on inventory;
create policy "users can view own inventory" on inventory for select using (auth.uid() = user_id);

drop policy if exists "users can insert own inventory" on inventory;
create policy "users can insert own inventory" on inventory for insert with check (auth.uid() = user_id);

drop policy if exists "users can update own inventory" on inventory;
create policy "users can update own inventory" on inventory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users can delete own inventory" on inventory;
create policy "users can delete own inventory" on inventory for delete using (auth.uid() = user_id);

-- Customers - preparada (ainda localStorage nesta etapa)
alter table customers enable row level security;
drop policy if exists "iso customers" on customers;
create policy "iso customers" on customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sales - preparada
alter table sales enable row level security;
drop policy if exists "iso sales" on sales;
create policy "iso sales" on sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expenses - preparada
alter table expenses enable row level security;
drop policy if exists "iso expenses" on expenses;
create policy "iso expenses" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Subscriptions - preparada
alter table subscriptions enable row level security;
drop policy if exists "iso subscriptions" on subscriptions;
create policy "iso subscriptions" on subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
