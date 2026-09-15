import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, Package, Plus, Receipt, Wallet, Settings, LogOut,
  Search, Filter, X, Check, AlertTriangle, Battery, Smartphone,
  DollarSign, TrendingUp, Boxes, ArrowUpRight, ArrowDownRight,
  Copy, Eye, Edit3, Trash2, ChevronRight, Calendar, Tag,
  Zap, Shield, ShieldOff, ShieldCheck, ShieldAlert, Layers, BarChart3, CreditCard, Store, User,
  Menu, Clock, AlertCircle, CheckCircle2, Info, Sparkles,
  MousePointerClick, FileText, Lock, Instagram, Mail, Phone,
  Pencil, UserPlus, Users, Printer, Share2, FileCheck,
  Database, Upload, Download, FileSpreadsheet, DatabaseBackup, HardDrive, FileDown, FileUp,
  HelpCircle, ChevronDown, BookOpen, LifeBuoy
} from 'lucide-react';

// === V3.1c.1 Conectado Supabase Real - Hardcoded user ===
// URL + ANON REAL DO USUÁRIO - override via localStorage se existir
const SUPABASE_CONFIG = {
  url: 'https://phqyoanhulrffjleased.supabase.co',
  anonKey: 'sb_publishable_HtR7dtjBe78bfNmwIAMluQ_R1IhgADO',
  get isConfigured() {
    try {
      const u = (typeof localStorage !== 'undefined' ? localStorage.getItem('nexgest_supabase_url') : null) || this.url;
      const k = (typeof localStorage !== 'undefined' ? localStorage.getItem('nexgest_supabase_anon_key') : null) || this.anonKey;
      return !!(u && k);
    } catch { return !!(this.url && this.anonKey); }
  },
  get effectiveUrl() {
    try {
      const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('nexgest_supabase_url') : null;
      return ls || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || this.url;
    } catch { return this.url; }
  },
  get effectiveAnon() {
    try {
      const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('nexgest_supabase_anon_key') : null;
      return ls || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || this.anonKey;
    } catch { return this.anonKey; }
  },
};

function getSupabase(): any {
  try {
    if (typeof window !== 'undefined') {
      // 1) client já inicializado via CDN
      // @ts-ignore
      if ((window as any).supabaseClient) return (window as any).supabaseClient;
      // 2) cria a partir do supabase global carregado via CDN usando credenciais reais
      // @ts-ignore
      const globalSb = (window as any).supabase;
      if (globalSb && typeof globalSb.createClient === 'function') {
        const url = SUPABASE_CONFIG.effectiveUrl;
        const anon = SUPABASE_CONFIG.effectiveAnon;
        if (url && anon) {
          // @ts-ignore
          const client = globalSb.createClient(url, anon);
          // @ts-ignore
          (window as any).supabaseClient = client;
          return client;
        }
      }
    }
  } catch {}
  return null;
}
function isSupabaseConfigured(): boolean {
  try {
    const url = SUPABASE_CONFIG.effectiveUrl;
    const anon = SUPABASE_CONFIG.effectiveAnon;
    return !!(url && anon);
  } catch { return SUPABASE_CONFIG.isConfigured; }
}
// legado compat
function getSupabaseClient(): any { return getSupabase(); }

function friendlyAuthError(err: any): string {
  const raw = (err?.message || err || '').toString();
  const m = raw.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user already registered') || m.includes('already in use')) return 'Email já cadastrado';
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid email or password')) return 'Email ou senha inválida';
  if (m.includes('email not confirmed') || m.includes('not confirmed')) return 'Confirme seu email antes de entrar';
  if (m.includes('password should be at least') || m.includes('weak password')) return 'Senha muito fraca - mínimo 6 caracteres';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('email rate limit')) return 'Muitas tentativas, aguarde um minuto';
  if (m.includes('invalid email')) return 'Email inválido';
  return raw || 'Erro inesperado';
}

const SUPABASE_SCHEMA_SQL = `-- NexGest V3.1c.1 Audit RLS Fix - supabase-schema.sql COM RLS REAL
-- Execute em Supabase > SQL Editor (pode rodar novamente - IF NOT EXISTS + DROP POLICY)
-- NUNCA colocar service_role no frontend - apenas anon key

-- Extensões
create extension if not exists "uuid-ossp";

-- PROFILES (ligado a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  store_name text,
  phone text,
  plan text default 'basico' check (plan in ('basico','profissional','premium')),
  subscription_status text default 'trial' check (subscription_status in ('none','trial','active','expired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- STORES
create table if not exists public.stores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz default now()
);

-- INVENTORY / PRODUCTS (devices)
create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  brand text not null,
  model text not null,
  storage text,
  color text,
  condition text check (condition in ('Novo','Seminovo','Usado')),
  battery int check (battery is null or (battery >= 0 and battery <= 100)),
  imei text,
  serial text,
  cost numeric default 0,
  price numeric default 0,
  status text default 'Disponível' check (status in ('Disponível','Reservado','Vendido','Arquivado')),
  photo_url text,
  notes text,
  has_warranty boolean default false,
  warranty_duration int,
  warranty_unit text check (warranty_unit in ('dias','meses')),
  warranty_start_date date,
  warranty_end_date date,
  warranty_note text,
  entry_date timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists idx_inventory_user_id on public.inventory(user_id);
create index if not exists idx_inventory_imei on public.inventory(imei);

-- CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  name text not null,
  phone text not null,
  cpf text,
  email text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_customers_user_id on public.customers(user_id);

-- SALES
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  device_id uuid references public.inventory(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name_snapshot text,
  device_snapshot jsonb,
  sale_price numeric not null,
  original_price numeric,
  discount numeric default 0,
  payment_method text,
  installments int,
  fees numeric default 0,
  profit numeric,
  is_canceled boolean default false,
  observations text,
  sale_date timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists idx_sales_user_id on public.sales(user_id);

-- EXPENSES
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  description text not null,
  amount numeric not null,
  category text,
  type text default 'expense' check (type in ('sale','expense','reversal')),
  related_sale_id uuid references public.sales(id) on delete set null,
  expense_date timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists idx_expenses_user_id on public.expenses(user_id);

-- === V3.1c.1 RLS - Habilita isolamento REAL por user_id ===
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.inventory enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
-- Compatibilidade caso tabela criada sem schema
alter table inventory enable row level security;

-- Policies PROFILES: usuário vê e edita apenas seu próprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Policies STORES / CUSTOMERS / SALES / EXPENSES - isolamento por user_id
drop policy if exists "stores_user_all" on public.stores;
create policy "stores_user_all" on public.stores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "customers_user_all" on public.customers;
create policy "customers_user_all" on public.customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sales_user_all" on public.sales;
create policy "sales_user_all" on public.sales for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "expenses_user_all" on public.expenses;
create policy "expenses_user_all" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- === INVENTORY RLS REAL - 4 POLITICAS SEPARADAS V3.1c.1 ===
-- SELECT
drop policy if exists "users can view own inventory" on public.inventory;
drop policy if exists "users can view own inventory" on inventory;
create policy "users can view own inventory" on public.inventory for select using (auth.uid() = user_id);
-- INSERT - impede user_id de outra conta
drop policy if exists "users can insert own inventory" on public.inventory;
drop policy if exists "users can insert own inventory" on inventory;
create policy "users can insert own inventory" on public.inventory for insert with check (auth.uid() = user_id);
-- UPDATE - impede alterar de outro usuário
drop policy if exists "users can update own inventory" on public.inventory;
drop policy if exists "users can update own inventory" on inventory;
create policy "users can update own inventory" on public.inventory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- DELETE - impede excluir de outro usuário
drop policy if exists "users can delete own inventory" on public.inventory;
drop policy if exists "users can delete own inventory" on inventory;
create policy "users can delete own inventory" on public.inventory for delete using (auth.uid() = user_id);

-- Limpeza legado policy antiga
drop policy if exists "inventory_user_all" on public.inventory;
drop policy if exists "inventory_user_all" on inventory;

-- NOTA V3.1c.1: Estoque agora em Supabase com RLS REAL por user_id, vendas/clientes/financeiro ainda localStorage
`;

const SUPABASE_SETUP_MD = `# NexGest V3.1c.1 Audit RLS Fix - Auth + Estoque Supabase

Objetivo V3.1c.1: auditoria RLS inventory, isolamento por usuário, limites e bateria.

## RLS INVENTORY REAL (4 políticas)
O SQL V3.1c.1 agora habilita RLS REAL:
alter table public.inventory enable row level security;
create policy "users can view own inventory" for select using (auth.uid() = user_id);
create policy "users can insert own inventory" for insert with check (auth.uid() = user_id);
create policy "users can update own inventory" for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own inventory" for delete using (auth.uid() = user_id);

Isso garante:
1. RLS habilitado (não comentado)
2. SELECT/INSERT/UPDATE/DELETE separados
3. Limite por auth.uid() = user_id
4. INSERT impede gravar user_id de outra conta (with check)
5. UPDATE/DELETE não permitem alterar de outro usuário

## Verificar no painel Supabase
Supabase Dashboard > Table Editor > inventory > Policies - deve mostrar 4 políticas listadas acima
Ou SQL Editor > execute:
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
from pg_policies where tablename='inventory';
Deve retornar 4 linhas: select/insert/update/delete com qual = "(auth.uid() = user_id)"
Verifique também:
select relname, relrowsecurity from pg_class where relname='inventory'; -- relrowsecurity = true significa RLS habilitado

## Código - defesa dupla
- Todos inserts usam payload.user_id = session.user.id (nunca form.user_id)
- Todos update/delete usam .eq('user_id', session.user.id) além da policy RLS
- battery = brand==='Apple' ? battery : null forçado em insert e update
- Limite Básico 10 e Profissional 50 verificado via supabase count antes de insert individual e import
- loadInventory substitui estado (não concat) para evitar duplicação
- Migração evita duplicação IMEI e não apaga localStorage antes de confirmar, cria backup migration_backup

## Próximos passos mantidos
- Vendas/clientes/financeiro ainda localStorage (não alterado nesta auditoria)
- Storage fotos, Edge Function pix etc continuam TODO
`;

// === TYPES V1.1 PRESERVADOS ===
type DeviceStatus = 'Disponível' | 'Reservado' | 'Vendido' | 'Arquivado';
type DeviceCondition = 'Novo' | 'Seminovo' | 'Usado';

type HistoryEntry = {
  id: string;
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  description: string;
};

interface Device {
  id: string;
  storeId: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  condition: DeviceCondition;
  battery: number | null;
  imei: string | null;
  serial?: string | null;
  cost: number;
  price: number;
  status: DeviceStatus;
  photoUrl: string | null;
  entryDate: string;
  notes?: string;
  // === GARANTIA + HISTÓRICO V2.0 (opcionais para compatibilidade) ===
  hasWarranty?: boolean;
  warrantyDuration?: number;
  warrantyUnit?: 'dias' | 'meses';
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyNote?: string;
  history?: HistoryEntry[];
}

interface Client {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  cpf?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

interface Sale {
  id: string;
  storeId: string;
  deviceId: string;
  deviceSnapshot: Device;
  salePrice: number;
  saleDate: string;
  paymentMethod: string;
  fees: number;
  isCanceled: boolean;
  profit: number;
  clientId?: string;
  clientNameSnapshot?: string;
  // V2.3 campos opcionais para comprovante compatível com antigas
  originalPrice?: number;
  discount?: number;
  installments?: number;
  observations?: string;
}

interface Transaction {
  id: string;
  storeId: string;
  type: 'sale' | 'expense' | 'reversal';
  amount: number;
  date: string;
  description: string;
  relatedSaleId?: string;
}

interface Subscription {
  status: 'none' | 'trial' | 'active' | 'expired';
  verified: boolean; // false no modo DEMO, true só com webhook real TODO BACKEND
  plan: 'basico' | 'profissional' | 'premium' | 'pro' | 'start';
  price: number;
  maxDevices?: number;
  trialEndsAt?: string;
  startedAt?: string;
}

// === V2.4.2 LÓGICA REAL DE LIMITES POR PLANO ===
const PLAN_LIMITS: Record<string, number> = {
  basico: 10,
  profissional: 50,
  premium: Infinity,
  pro: Infinity,
  start: 50,
};
const PLAN_PRICES: Record<string, number> = {
  basico: 9.99,
  profissional: 29.90,
  premium: 59.90,
  pro: 59.90,
  start: 19.90,
};
const PLAN_LABELS: Record<string, string> = {
  basico: 'Básico',
  profissional: 'Pro',
  premium: 'Premium',
  pro: 'Premium',
  start: 'Start',
};

// === V2.4.3 PLANOS ATUALIZADOS — Básico 9,99 | Pro 29,90 | Premium 59,90 ===
type PlanId = 'basico' | 'profissional' | 'premium';
interface PlanDef {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  shortDesc: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}
const PLANS: PlanDef[] = [
  {
    id: 'basico',
    name: 'Básico',
    price: 9.99,
    priceLabel: 'R$ 9,99',
    shortDesc: 'Ideal para começar',
    description: 'Um plano de entrada, muito básico, para quem está começando.',
    features: [
      'Cadastro de até 10 celulares',
      'Controle básico de estoque',
      'Registro de preço de compra e venda',
      'Visualização de lucro',
      'Controle de aparelhos vendidos',
    ],
    cta: 'Começar com Básico',
  },
  {
    id: 'profissional',
    name: 'Pro',
    price: 29.90,
    priceLabel: 'R$ 29,90',
    shortDesc: 'Para lojas que querem crescer',
    description: 'Para lojistas que já trabalham com um estoque maior.',
    features: [
      'Cadastro de até 50 celulares',
      'Todos os recursos do Básico',
      'Controle de estoque mais completo',
      'Histórico de vendas',
      'Relatórios de lucro e movimentação',
      'Organização dos aparelhos por status',
    ],
    popular: true,
    cta: 'Começar com Pro',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 59.90,
    priceLabel: 'R$ 59,90',
    shortDesc: 'Sem limites',
    description: 'Para quem quer trabalhar com estoque maior, sem ficar limitado.',
    features: [
      'Estoque ilimitado',
      'Todos os recursos do Pro',
      'Relatórios completos',
      'Mais liberdade para cadastrar aparelhos',
      'Acesso aos recursos avançados que forem adicionados ao sistema',
    ],
    cta: 'Começar com Premium',
  },
];

interface StoreInfo {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone?: string;
  address?: string;
}

// === MOCK SEED REALISTA ===
const SEED_STORE: StoreInfo = { id: 'store_001', name: 'Cell Prime', owner: 'Rafael Silva', email: 'rafael@cellprime.com' };

const SEED_DEVICES: Device[] = [
  { id: 'd1', storeId: 'store_001', brand: 'Apple', model: 'iPhone 13', storage: '128GB', color: 'Preto', condition: 'Seminovo', battery: 92, imei: '356789123456789', cost: 2800, price: 3599, status: 'Disponível', photoUrl: null, entryDate: new Date(Date.now() - 5*86400000).toISOString() },
  { id: 'd2', storeId: 'store_001', brand: 'Apple', model: 'iPhone 12', storage: '64GB', color: 'Azul', condition: 'Usado', battery: 78, imei: '356789123456780', cost: 1900, price: 2599, status: 'Disponível', photoUrl: null, entryDate: new Date(Date.now() - 32*86400000).toISOString() },
  { id: 'd3', storeId: 'store_001', brand: 'Samsung', model: 'Galaxy S22', storage: '128GB', color: 'Branco', condition: 'Seminovo', battery: 87, imei: null, cost: 2100, price: 2899, status: 'Disponível', photoUrl: null, entryDate: new Date(Date.now() - 2*86400000).toISOString() },
  { id: 'd4', storeId: 'store_001', brand: 'Xiaomi', model: 'Redmi Note 12', storage: '128GB', color: 'Grafite', condition: 'Novo', battery: 100, imei: '356789123456781', cost: 850, price: 1299, status: 'Disponível', photoUrl: null, entryDate: new Date(Date.now() - 12*86400000).toISOString() },
  { id: 'd5', storeId: 'store_001', brand: 'Apple', model: 'iPhone 13', storage: '256GB', color: 'Rosa', condition: 'Seminovo', battery: 58, imei: '356789123456782', cost: 3000, price: 3899, status: 'Disponível', photoUrl: null, entryDate: new Date(Date.now() - 45*86400000).toISOString() },
  { id: 'd6', storeId: 'store_001', brand: 'Samsung', model: 'Galaxy A54', storage: '128GB', color: 'Preto', condition: 'Novo', battery: null, imei: null, cost: 1100, price: 1599, status: 'Reservado', photoUrl: null, entryDate: new Date(Date.now() - 1*86400000).toISOString() },
];

const SEED_SALES: Sale[] = [
  { id: 's1', storeId: 'store_001', deviceId: 'dx1', deviceSnapshot: { ...SEED_DEVICES[0], id: 'dx1', brand: 'Apple', model: 'iPhone 11', storage: '64GB' } as Device, salePrice: 2299, saleDate: new Date(Date.now() - 2*86400000).toISOString(), paymentMethod: 'Pix', fees: 0, isCanceled: false, profit: 500 },
  { id: 's2', storeId: 'store_001', deviceId: 'dx2', deviceSnapshot: { ...SEED_DEVICES[0], id: 'dx2', brand: 'Samsung', model: 'Galaxy S21', storage: '128GB' } as Device, salePrice: 1899, saleDate: new Date(Date.now() - 5*86400000).toISOString(), paymentMethod: 'Cartão', fees: 80, isCanceled: false, profit: 420 },
  { id: 's3', storeId: 'store_001', deviceId: 'dx3', deviceSnapshot: { ...SEED_DEVICES[0], id: 'dx3', brand: 'Apple', model: 'iPhone 13', storage: '128GB' } as Device, salePrice: 3599, saleDate: new Date(Date.now() - 1*86400000).toISOString(), paymentMethod: 'Pix', fees: 0, isCanceled: false, profit: 799 },
];

const SEED_CLIENTS: Client[] = [
  { id: 'c1', storeId: 'store_001', name: 'João Pedro Oliveira', phone: '(11) 98888-1234', cpf: '123.456.789-00', email: 'joao@email.com', notes: 'Cliente fiel', createdAt: new Date(Date.now() - 10*86400000).toISOString() },
  { id: 'c2', storeId: 'store_001', name: 'Maria Santos', phone: '(11) 97777-5678', notes: '', createdAt: new Date(Date.now() - 3*86400000).toISOString() },
];

// === V2.4.2 FAQ ESTÁTICO SEM CUSTO ===
type FAQItem = { q: string; a: string };
type FAQSection = { id: string; title: string; icon: any; items: FAQItem[] };
const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'comecando',
    title: 'Começando',
    icon: BookOpen,
    items: [
      { q: 'Como cadastrar meu primeiro aparelho?', a: 'Vá em + Adicionar aparelho (botão central no mobile ou Novo no desktop), preencha marca, modelo, armazenamento, cor, condição, custo de compra, preço de venda, IMEI opcional, bateria opcional, garantia opcional, observações e salve. O aparelho entra como Disponível no estoque isolado por loja.' },
      { q: 'Como registrar uma venda?', a: 'Estoque > toque no aparelho > botão Vender > escolha cliente opcional (busca por nome/telefone ou Cadastrar novo rápido) > informe desconto, taxa, pagamento, parcelas se houver > Confirmar venda. Estoque atualiza para Vendido automaticamente, histórico preservado e comprovante aparece em modal para Ver e Compartilhar.' },
    ]
  },
  {
    id: 'estoque',
    title: 'Estoque e Garantia',
    icon: Package,
    items: [
      { q: 'Como funciona IMEI duplicado?', a: 'Sistema bloqueia IMEI já existente na mesma loja (storeId). Se tentar cadastrar IMEI já usado em aparelho Disponível ou Reservado, mostra alerta com modelo existente. Vendidos e Arquivados são ignorados na validação.' },
      { q: 'O que significam as cores da bateria?', a: 'Verde 90%+ = Excelente, boa saúde. Amarela 80-89% = Bom estado, atenção leve. Vermelha 60-79% = Atenção, desgastada. Vermelha 0-59% = Recomendar troca. Badge mostra % + texto e alerta no Dashboard quando <80%.' },
      { q: 'Como controlar garantia?', a: 'Ao cadastrar ou editar, marque Possui garantia = Sim, informe prazo (ex: 90) e unidade dias/meses. Sistema calcula vencimento automático a partir da data início. Nos detalhes mostra badge Ativa/Vencida + Restam X dias e resumo com início/vencimento e observação.' },
    ]
  },
  {
    id: 'clientes',
    title: 'Clientes e Comprovantes',
    icon: Users,
    items: [
      { q: 'Como vincular cliente na venda?', a: 'Na tela Registrar venda existe campo Cliente (opcional). Busque por nome ou telefone, selecione da lista de até 8 clientes da loja, ou use Cadastrar novo rápido sem sair do fluxo. Se não vincular, venda fica como avulsa.' },
      { q: 'Onde vejo comprovantes?', a: 'Vendas > aba Comprovantes > busca por nº da venda (ex: #S1A2), cliente, modelo ou IMEI. Filtros de período Hoje/7d/30d/Mês/Todas e status Concluídas/Canceladas. Cada card tem Ver comprovante e Compartilhar/Copiar texto.' },
      { q: 'Cliente foi removido e agora aparece Cliente removido?', a: 'Normal. Ao remover cliente, vendas vinculadas são mantidas com snapshot do nome. Onde tinha cliente vinculado mostra Cliente removido (Nome) para preservar histórico financeiro e de compras, sem perder dados.' },
    ]
  },
  {
    id: 'backup',
    title: 'Backup e Excel',
    icon: FileCheck,
    items: [
      { q: 'Como fazer backup?', a: 'Configurações > Backup e dados > Exportar backup completo .json. Baixa arquivo backup-nexgest-AAAA-MM-DD.json só da sua loja (devices, vendas, clientes, transações), isolado por storeId. Recomendado exportar semanalmente.' },
      { q: 'Como restaurar backup?', a: 'No mesmo local Configurações > Backup e dados > Importar/restaurar backup, selecione JSON válido. Sistema mostra prévia com loja de origem, data, quantidades e avisa se for de outra loja. Ao confirmar, cria backup automático antes de substituir dados atuais.' },
      { q: 'Como exportar Excel?', a: 'Estoque > botão Exportar Excel e também em Config > Exportar Estoque/Vendas/Clientes/Financeiro .xlsx. Cada arquivo tem colunas organizadas (marca, modelo, IMEI, bateria, custos, valores, cliente etc) e cai como .xlsx se biblioteca SheetJS carregada, senão .csv.' },
      { q: 'Como importar Excel?', a: 'Estoque > Importar Excel > Baixar modelo Excel. Preencha marca e modelo obrigatórios, bateria 0-100, custo/preço, IMEI opcional, quantidade etc. Faça upload, sistema valida IMEI duplicado dentro da planilha e já existente no estoque, mostra prévia válidas/inválidas e erros por linha, importa só confirmadas sem apagar estoque atual.' },
      { q: 'Perdi dados, e agora?', a: 'Se fez backup .json, restaure em Configurações > Backup e dados. Se não fez, dados ficam só no aparelho navegador em localStorage por storeId. Troca de navegador/aparelho ou limpeza de dados apaga tudo. Por isso exporte backup regularmente.' },
    ]
  },
];

// === HELPERS BATERIA PRESERVADOS ===
function getBatteryInfo(p: number | null) {
  if (p === null || p === undefined) return null;
  if (p <= 59) return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Recomendar troca', text: `${p}% • Trocar`, dot: 'bg-[#EF4444]' };
  if (p <= 79) return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Atenção • Desgastada', text: `${p}% • Atenção`, dot: 'bg-[#EF4444]' };
  if (p <= 89) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Bom estado', text: `${p}% • Bom`, dot: 'bg-[#F59E0B]' };
  return { color: '#16A34A', bg: 'rgba(22,163,74,0.15)', label: 'Excelente', text: `${p}% • Excelente`, dot: 'bg-[#16A34A]' };
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtCompact = (v: number) => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : fmtBRL(v);

// === V2.4 HELPERS EXCEL + BACKUP ===
function getXLSX(): any {
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).XLSX) return (window as any).XLSX;
  } catch {}
  return null;
}
function getDateFileStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function getDateTimeFileStr(d: Date = new Date()): string {
  const base = getDateFileStr(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${base}-${hh}${mm}`;
}
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function toCSV(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(',')];
  rows.forEach(r => {
    lines.push(headers.map(h => esc((r as any)[h])).join(','));
  });
  return lines.join('\n');
}

// === HELPER CIRÚRGICO — CORREÇÃO CUSTO/PREÇO V2.0 ===
// Preserva visual, corrige 0550→550, 01100→1100, 0→0, 0,50→0,50
function normalizeMoneyInput(raw: string): string {
  let r = raw.replace(/[^0-9,\.]/g, '');
  if (r === '') return '';
  const lastComma = r.lastIndexOf(',');
  const lastDot = r.lastIndexOf('.');
  const lastIdx = Math.max(lastComma, lastDot);
  let sep = '';
  let integerPart = '';
  let decimalPart = '';
  if (lastIdx !== -1) {
    sep = r[lastIdx];
    integerPart = r.slice(0, lastIdx);
    decimalPart = r.slice(lastIdx + 1);
  } else {
    integerPart = r;
    decimalPart = '';
    sep = '';
  }
  // remove any remaining separators from integer part
  integerPart = integerPart.replace(/[,\.]/g, '');
  // remove leading zeros before digit — correção imediata 0+dígito
  integerPart = integerPart.replace(/^0+(?=\d)/g, '');
  if (integerPart === '' || /^0+$/.test(integerPart)) {
    if (integerPart === '') {
      // vazio será tratado abaixo se houver separador
    } else {
      // colapsa múltiplos zeros para um único 0
      integerPart = '0';
    }
  }
  if (integerPart === '' && sep) {
    integerPart = '0';
  }
  if (integerPart === '') {
    // usuário apagou tudo
    return sep ? '0' + sep + decimalPart.replace(/[^0-9]/g, '') : '';
  }
  // decimal apenas dígitos
  decimalPart = decimalPart.replace(/[^0-9]/g, '');
  return sep ? integerPart + sep + decimalPart : integerPart;
}

// === GARANTIA + HISTÓRICO V2.0 — HELPERS CIRÚRGICOS ===
function calcWarrantyEnd(startDate: string, duration: number, unit: 'dias' | 'meses'): string {
  if (!startDate || !duration || duration <= 0) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  const nd = new Date(d);
  if (unit === 'dias') {
    nd.setDate(nd.getDate() + duration);
  } else {
    nd.setMonth(nd.getMonth() + duration);
  }
  if (isNaN(nd.getTime())) return '';
  return nd.toISOString().split('T')[0];
}
function fmtDateBR(iso: string | undefined): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, day] = parts;
    return `${day}/${m}/${y}`;
  }
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch { return iso; }
}
function fmtDateTimeBR(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function createHistoryEntry(field: string, oldValue: any, newValue: any, description?: string): HistoryEntry {
  const oldStr = oldValue === null || oldValue === undefined || oldValue === '' ? '-' : String(oldValue);
  const newStr = newValue === null || newValue === undefined || newValue === '' ? '-' : String(newValue);
  return {
    id: 'h_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    field,
    oldValue: oldStr,
    newValue: newStr,
    description: description || `${field} alterado de ${oldStr} para ${newStr}`,
  };
}
function buildWarrantySummary(hasWarranty?: boolean, duration?: number, unit?: 'dias'|'meses', start?: string, end?: string): string {
  if (!hasWarranty) return 'Sem garantia';
  const dur = duration ? `${duration} ${unit||'dias'}` : '';
  const endFmt = end ? fmtDateBR(end) : '—';
  const startFmt = start ? fmtDateBR(start) : '—';
  return `Com garantia ${dur} | Início ${startFmt} | Venc ${endFmt}`.trim();
}

// === IDENTIDADE VISUAL ORIGINAL ===
function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: 11, background: 'linear-gradient(135deg,#2F6BFF 0%,#1D4ED8 100%)' }}
      className="relative flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(47,107,255,0.35)]"
    >
      <span className="text-white font-black tracking-[-1px] select-none" style={{ fontSize: size * 0.55, marginLeft: -2 }}>N</span>
      <div className="absolute flex items-end gap-[2.5px] right-[7px] bottom-[7px]">
        <div className="w-[3px] rounded-full bg-white/50" style={{ height: 4 }} />
        <div className="w-[3px] rounded-full bg-white/60" style={{ height: 7 }} />
        <div className="w-[3px] rounded-full bg-white/80" style={{ height: 10 }} />
      </div>
    </div>
  );
}
function LogoFull({ dark = true, size = 36 }: { dark?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={size} />
      <span className="font-extrabold tracking-[-0.5px] text-[18px] lowercase">
        <span className={dark ? "text-[#F1F5F9]" : "text-[#0F172A]"}>nex</span>
        <span className="text-[#64748B]">gest</span>
      </span>
    </div>
  );
}

// === COMPONENTS ===
function BatteryIndicator({ value, small }: { value: number | null; small?: boolean }) {
  const info = getBatteryInfo(value);
  if (!info) return <span className="text-[11px] text-[#8B9BB4]">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${small ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
      style={{ background: info.bg, color: info.color, border: `1px solid ${info.color}22` }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot} animate-pulse`} />
      {small ? `${value}%` : info.text}
    </span>
  );
}

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return val;
}

function ChartBar({ data, color = '#2F6BFF' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 80); return () => clearTimeout(t); }, []);
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-full bg-[#1E2D4A] flex items-center justify-center"><BarChart3 className="w-6 h-6 text-[#8B9BB4]" /></div>
        <p className="text-[13px] text-[#8B9BB4]">Sem vendas neste período</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="group">
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[#8B9BB4] tracking-wide">{d.label}</span>
            <span className="text-[12px] font-bold text-[#F1F5F9]">{fmtBRL(d.value)}</span>
          </div>
          <div className="h-2.5 w-full bg-[#1A2744] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: animate ? `${(d.value / max) * 100}%` : '0%', background: color, transitionDelay: `${i * 60}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend, accent }: { icon: any; label: string; value: string; sub?: string; trend?: 'up' | 'down'; accent?: string }) {
  return (
    <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4 md:p-5 hover:bg-[#14213A] transition-colors duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-[12px] bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-[#8B9BB4] group-hover:text-[#F1F5F9] transition-colors" />
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-[#16A34A14] text-[#16A34A] border border-[#16A34A22]' : 'bg-[#EF444414] text-[#EF4444] border border-[#EF444422]'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {sub}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-1">{label}</p>
      <p className="text-[22px] font-bold tracking-[-0.5px] text-[#F1F5F9] leading-none">{value}</p>
      {!trend && sub && <p className="text-[12px] text-[#64748B] mt-1.5">{sub}</p>}
      {accent && <div className="mt-3 h-1 w-10 rounded-full" style={{ background: accent }} />}
    </div>
  );
}

// === MAIN APP ===
export default function App() {
  // Views
  const [view, setView] = useState<'landing' | 'login' | 'cadastro' | 'checkout' | 'onboarding' | 'dashboard' | 'estoque' | 'add' | 'edit' | 'details' | 'vendas' | 'registrarVenda' | 'financeiro' | 'config' | 'planos' | 'termos' | 'privacidade' | 'politica-assinatura' | 'assinatura' | 'clientes' | 'clienteDetalhe' | 'clienteForm' | 'ajuda'>('landing');
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const [store, setStore] = useState<StoreInfo>(SEED_STORE);
  // V2.4.2 FIX: inicial basico para demo bloqueio - preserva quem já tem dados via localStorage migration
  const [subscription, setSubscription] = useState<Subscription>({ status: 'trial', verified: false, plan: 'basico', price: 9.99, maxDevices: PLAN_LIMITS['basico'], startedAt: new Date().toISOString(), trialEndsAt: new Date(Date.now() + 7*86400000).toISOString() });
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('basico');
  const [isLoadingPlan, setIsLoadingPlan] = useState<PlanId | null>(null);
  const [devices, setDevices] = useState<Device[]>(SEED_DEVICES);
  const [sales, setSales] = useState<Sale[]>(SEED_SALES);
  const [clients, setClients] = useState<Client[]>(SEED_CLIENTS);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 't1', storeId: 'store_001', type: 'expense', amount: 450, date: new Date().toISOString(), description: 'Aluguel vitrine' },
  ]);
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | '7d' | 'mes' | '90d' | 'todas'>('mes');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterBrand, setFilterBrand] = useState<string>('Todas');
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'Todos'>('Todos');
  const [filterBattery, setFilterBattery] = useState<string>('Todas');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showPlusSheet, setShowPlusSheet] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [salePriceInput, setSalePriceInput] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  // === V2.4.2 LIMITES POR PLANO - MODAL UPGRADE REAL ===
  const [showLimitModal, setShowLimitModal] = useState<{ show: boolean; limit?: number; current?: number; plan?: string; attemptedCount?: number; isImport?: boolean }>({ show: false });
  // add form
  const [addForm, setAddForm] = useState<Partial<Device> & { serial?: string | null; notes?: string }>({ brand: 'Apple', model: '', storage: '128GB', color: '', condition: 'Seminovo', battery: null, imei: '', serial: '', cost: 0, price: 0, status: 'Disponível', notes: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imeiError, setImeiError] = useState<string | null>(null);
  const [cadastroForm, setCadastroForm] = useState({ loja: '', nome: '', email: '', senha: '', termos: false });

  // === ESTADOS CIRÚRGICOS CUSTO/PREÇO — string para exibição, number para cálculo ===
  const [costStr, setCostStr] = useState<string>('');
  const [priceStr, setPriceStr] = useState<string>('');
  const costNum = useMemo(() => {
    if (!costStr) return 0;
    const n = parseFloat(costStr.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }, [costStr]);
  const priceNum = useMemo(() => {
    if (!priceStr) return 0;
    const n = parseFloat(priceStr.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }, [priceStr]);

  // === GARANTIA V2.0 — ESTADOS DISCRETOS ===
  const [hasWarranty, setHasWarranty] = useState<boolean>(false);
  const [warrantyDuration, setWarrantyDuration] = useState<number>(90);
  const [warrantyUnit, setWarrantyUnit] = useState<'dias' | 'meses'>('dias');
  const [warrantyStartDate, setWarrantyStartDate] = useState<string>('');
  const [warrantyEndDate, setWarrantyEndDate] = useState<string>('');
  const [warrantyNote, setWarrantyNote] = useState<string>('');

  // === V2.2 CLIENTES ESTADOS + V2.3.1 COMPROVANTES ===
  const [salesSubTab, setSalesSubTab] = useState<'vendas' | 'clientes' | 'comprovantes'>('vendas');
  // activeSalesTab alias para compatibilidade com spec
  const activeSalesTab = salesSubTab;
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', cpf: '', email: '', notes: '' });
  const [showDeleteClientModal, setShowDeleteClientModal] = useState<Client | null>(null);
  const [saleClientQuery, setSaleClientQuery] = useState('');
  const [selectedSaleClient, setSelectedSaleClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showInlineClientForm, setShowInlineClientForm] = useState(false);
  const [inlineClientForm, setInlineClientForm] = useState({ name: '', phone: '' });

  // === V2.3 COMPROVANTE ESTADOS ===
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [showSaleSuccessModal, setShowSaleSuccessModal] = useState<Sale | null>(null);
  // === V2.3.1 COMPROVANTES ABA ESTADOS ===
  const [comprovanteSearch, setComprovanteSearch] = useState('');
  const [comprovantePeriod, setComprovantePeriod] = useState<'hoje' | '7d' | 'mes' | '90d' | 'todas'>('todas');
  const [comprovanteStatus, setComprovanteStatus] = useState<'todas' | 'concluidas' | 'canceladas'>('todas');

  // === V2.4 BACKUP & EXCEL ESTADOS ===
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const excelImportInputRef = useRef<HTMLInputElement | null>(null);
  const estoqueExcelInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBackup, setPendingBackup] = useState<any | null>(null);
  const [showBackupPreview, setShowBackupPreview] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreForceOtherStore, setRestoreForceOtherStore] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [importExcelFileName, setImportExcelFileName] = useState<string>('');
  const [importPreview, setImportPreview] = useState<{ valid: any[]; invalid: any[]; duplicateInSheet: number; duplicateInStock: number; errorsByRow: { row: number; errors: string[] }[] } | null>(null);
  const [importSummary, setImportSummary] = useState<{ imported: number; ignored: number; errors: number } | null>(null);

  // === V3.1b - ESTADOS CONFIG TÉCNICA + AUTH REAL ===
  const [showTechConfig, setShowTechConfig] = useState(false);
  const [sbUrlInput, setSbUrlInput] = useState(() => {
    try { return localStorage.getItem('nexgest_supabase_url') || SUPABASE_CONFIG.effectiveUrl || SUPABASE_CONFIG.url || ''; } catch { return SUPABASE_CONFIG.url || ''; }
  });
  const [sbAnonInput, setSbAnonInput] = useState(() => {
    try { return localStorage.getItem('nexgest_supabase_anon_key') || SUPABASE_CONFIG.effectiveAnon || SUPABASE_CONFIG.anonKey || ''; } catch { return SUPABASE_CONFIG.anonKey || ''; }
  });
  const [showSupabaseGuide, setShowSupabaseGuide] = useState(false);
  const [supabaseConfiguredLive, setSupabaseConfiguredLive] = useState(() => {
    try { 
      const u = localStorage.getItem('nexgest_supabase_url') || SUPABASE_CONFIG.url;
      const k = localStorage.getItem('nexgest_supabase_anon_key') || SUPABASE_CONFIG.anonKey;
      return !!(u && k);
    } catch { return !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey); }
  });
  // Auth real V3.1b
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [supabaseProfile, setSupabaseProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('rafael@cellprime.com');
  const [loginPass, setLoginPass] = useState('123456');
  const [authMode, setAuthMode] = useState<'login'|'recovery'>('login');
  const [showRecoverySent, setShowRecoverySent] = useState(false);

  // === V3.1c.1 - INVENTORY SUPABASE ONLY ===
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [isMigratingLocal, setIsMigratingLocal] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ current:0, total:0 });
  const [inventoryError, setInventoryError] = useState<string|null>(null);

  // recalcula vencimento quando duração/unidade/início mudam
  useEffect(() => {
    if (!hasWarranty) { setWarrantyEndDate(''); return; }
    if (!warrantyStartDate || !warrantyDuration) { setWarrantyEndDate(''); return; }
    const calc = calcWarrantyEnd(warrantyStartDate, warrantyDuration, warrantyUnit);
    setWarrantyEndDate(calc);
  }, [hasWarranty, warrantyDuration, warrantyUnit, warrantyStartDate]);

  // V2.4 FIX: injetar SheetJS se não existir
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).XLSX) {
      const existing = document.querySelector('script[data-xlsx]');
      if (existing) return;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.setAttribute('data-xlsx', 'true');
      script.async = true;
      script.onload = () => {
        // XLSX carregado
      };
      document.head.appendChild(script);
    }
  }, []);

  // === V3.1c.1 HELPERS INVENTORY SUPABASE ===
  function mapSupabaseToDevice(row: any): Device {
    try {
      return {
        id: row.id,
        storeId: row.store_id || store.id,
        brand: row.brand,
        model: row.model,
        storage: row.storage || '128GB',
        color: row.color || 'Preto',
        condition: (row.condition as DeviceCondition) || 'Seminovo',
        battery: row.battery ?? null,
        imei: row.imei || null,
        serial: row.serial || null,
        cost: Number(row.cost) || 0,
        price: Number(row.price) || 0,
        status: (row.status as DeviceStatus) || 'Disponível',
        photoUrl: row.photo_url || null,
        entryDate: row.entry_date || row.created_at || new Date().toISOString(),
        notes: row.notes || '',
        hasWarranty: !!row.has_warranty,
        warrantyDuration: row.warranty_duration || undefined,
        warrantyUnit: row.warranty_unit || undefined,
        warrantyStartDate: row.warranty_start_date || undefined,
        warrantyEndDate: row.warranty_end_date || undefined,
        warrantyNote: row.warranty_note || undefined,
        history: Array.isArray(row.history) ? row.history : (row.history ? (()=>{ try{ return JSON.parse(row.history); }catch{ return []; } })() : []),
      } as Device;
    } catch {
      // fallback minimal
      return {
        id: row.id,
        storeId: row.store_id || store.id,
        brand: row.brand || 'Apple',
        model: row.model || '',
        storage: row.storage || '128GB',
        color: row.color || 'Preto',
        condition: 'Seminovo',
        battery: row.battery ?? null,
        imei: row.imei || null,
        cost: Number(row.cost)||0,
        price: Number(row.price)||0,
        status: 'Disponível',
        photoUrl: row.photo_url || null,
        entryDate: row.entry_date || new Date().toISOString(),
      } as Device;
    }
  }

  async function loadInventorySupabase() {
    const sb = getSupabase();
    const sess = supabaseSession;
    if (!sb || !sess?.user?.id || !isSupabaseConfigured()) {
      return;
    }
    setIsInventoryLoading(true);
    setInventoryError(null);
    try {
      // Defesa dupla: filtra por user_id no client + RLS no banco
      const { data, error } = await sb.from('inventory').select('*').eq('user_id', sess.user.id).order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped = (data as any[]).map(mapSupabaseToDevice);
        // Substitui corretamente sem duplicar: remove todos da loja atual e insere mapeados
        // Evita duplicação por ID usando Map
        const dedup = new Map<string, Device>();
        mapped.forEach(d => {
          const withStore = { ...d, storeId: store.id } as Device;
          if (!dedup.has(withStore.id)) dedup.set(withStore.id, withStore);
        });
        const withStoreUnique = Array.from(dedup.values());
        setDevices(prev => {
          const others = prev.filter(d => d.storeId !== store.id);
          return [...withStoreUnique, ...others];
        });
      }
    } catch (e: any) {
      console.warn('loadInventorySupabase', e);
      setInventoryError(e?.message || 'Falha ao carregar');
      showToast('Erro ao carregar estoque: ' + (e?.message || 'falha de conexão'));
    } finally {
      setIsInventoryLoading(false);
    }
  }

  async function getSupabaseActiveCount(): Promise<number> {
    const sb = getSupabase();
    const sess = supabaseSession;
    if (!sb || !sess?.user?.id) return currentDeviceCount;
    try {
      // Conta apenas ativos Disponível+Reservado por user_id - defesa dupla com RLS
      const { count, error } = await sb.from('inventory').select('id', { count: 'exact', head: true }).eq('user_id', sess.user.id).in('status', ['Disponível', 'Reservado']);
      if (error) throw error;
      return typeof count === 'number' ? count : currentDeviceCount;
    } catch {
      return currentDeviceCount;
    }
  }

  async function migrateLocalToSupabase() {
    const sb = getSupabase();
    const sess = supabaseSession;
    if (!sb || !sess?.user?.id) { showToast('Configure Supabase e faça login'); return; }
    if (!isSupabaseConfigured()) { showToast('Supabase não configurado'); return; }
    let raw: string | null = null;
    try { raw = localStorage.getItem('nexgest_devices'); } catch {}
    if (!raw) { showToast('Nenhum estoque local encontrado'); return; }
    let localList: Device[] = [];
    try { localList = JSON.parse(raw); } catch { showToast('Erro ao ler localStorage'); return; }
    const own = localList.filter(d => d.storeId === store.id || !d.storeId);
    if (!own.length) { showToast('Nenhum aparelho local desta loja'); return; }
    // Backup antes de confirmar - não apaga antes
    try {
      const backupKey = `nexgest_devices_migration_backup_${Date.now()}`;
      localStorage.setItem(backupKey, raw);
      localStorage.setItem('nexgest_devices_migration_backup_last', backupKey);
      // também guarda snapshot simples
      localStorage.setItem('nexgest_devices_migration_backup', raw);
    } catch {}
    setIsMigratingLocal(true);
    setMigrationProgress({ current: 0, total: own.length });
    let ok = 0;
    let skippedImei = 0;
    let failed = 0;
    for (let i = 0; i < own.length; i++) {
      const d = own[i];
      setMigrationProgress({ current: i + 1, total: own.length });
      const payload: any = {
        user_id: sess.user.id, // sempre do session, nunca do form
        store_id: null,
        brand: d.brand,
        model: d.model,
        storage: d.storage,
        color: d.color,
        condition: d.condition,
        battery: d.brand === 'Apple' ? d.battery : null, // Samsung/Xiaomi sempre null
        imei: d.imei || null,
        serial: (d as any).serial || null,
        cost: d.cost,
        price: d.price,
        status: d.status,
        photo_url: d.photoUrl,
        notes: d.notes || '',
        has_warranty: !!d.hasWarranty,
        warranty_duration: d.warrantyDuration || null,
        warranty_unit: d.warrantyUnit || null,
        warranty_start_date: d.warrantyStartDate || null,
        warranty_end_date: d.warrantyEndDate || null,
        warranty_note: d.warrantyNote || null,
        entry_date: d.entryDate,
        history: d.history || [],
      };
      try {
        // Evita duplicação por IMEI: verifica se já existe mesmo IMEI para este user_id
        if (payload.imei) {
          const { data: ex, error: exErr } = await sb.from('inventory').select('id').eq('user_id', sess.user.id).eq('imei', payload.imei).neq('status', 'Arquivado').limit(1);
          if (!exErr && ex && ex.length > 0) { skippedImei++; continue; }
        }
        const { error } = await sb.from('inventory').insert([payload]);
        if (!error) ok++;
        else failed++;
      } catch (e) { console.warn('migrate insert fail', e); failed++; }
      await new Promise(r => setTimeout(r, 60));
    }
    setIsMigratingLocal(false);
    showToast(`Migração concluída: ${ok} migrados, ${skippedImei} IMEI duplicado pulado, ${failed} falha - backup preservado`);
    await loadInventorySupabase();
  }

  // === V3.1c.1 Conectado Supabase Real Loader - hardcoded user keys ===
  useEffect(() => {
    if (typeof window === 'undefined') { setIsAuthChecking(false); return; }
    const url = SUPABASE_CONFIG.effectiveUrl || SUPABASE_CONFIG.url;
    const anon = SUPABASE_CONFIG.effectiveAnon || SUPABASE_CONFIG.anonKey;
    if (!url || !anon) { setIsAuthChecking(false); setSupabaseReady(false); return; }
    // already ready - garante client real com keys atuais
    if ((window as any).supabaseClient) { 
      // se client já existe, tenta atualizar? mantém
      setSupabaseReady(true); 
      return; 
    }
    const checkExisting = document.querySelector('script[data-supabase]');
    if (checkExisting) {
      let tries = 0;
      const interval = setInterval(()=>{
        tries++;
        const globalSupabase = (window as any).supabase;
        if (globalSupabase && !(window as any).supabaseClient) {
          try { 
            (window as any).supabaseClient = globalSupabase.createClient(url, anon); 
            setSupabaseReady(true); 
            clearInterval(interval); 
          } catch {}
        } else if ((window as any).supabaseClient) { setSupabaseReady(true); clearInterval(interval); }
        if (tries > 20) { clearInterval(interval); setIsAuthChecking(false); }
      }, 300);
      return ()=>clearInterval(interval);
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/supabase.min.js';
    script.setAttribute('data-supabase','true');
    script.async = true;
    script.onload = () => {
      try {
        const globalSupabase = (window as any).supabase;
        if (globalSupabase) {
          (window as any).supabaseClient = globalSupabase.createClient(url, anon);
          setSupabaseReady(true);
        } else {
          setIsAuthChecking(false);
        }
      } catch (e) { console.warn('supabase load error', e); setIsAuthChecking(false); }
    };
    script.onerror = () => { setIsAuthChecking(false); setSupabaseReady(false); };
    document.head.appendChild(script);
  }, []);

  // === V3.1b AUTH SESSION REAL ===
  useEffect(() => {
    if (!supabaseReady) return;
    const client = getSupabase();
    if (!client) { setIsAuthChecking(false); return; }
    let mounted = true;
    (async () => {
      try {
        const { data } = await client.auth.getSession();
        if (!mounted) return;
        const session = data?.session || null;
        setSupabaseSession(session);
        setAuthUser(session?.user || null);
        if (session?.user) {
          try {
            const { data: prof } = await client.from('profiles').select('*').eq('id', session.user.id).single();
            if (prof) {
              setSupabaseProfile(prof);
              setStore((s:any)=>({ ...s, name: prof.store_name || s.name, owner: prof.full_name || s.owner, email: prof.email || s.email }));
            } else {
              const meta = session.user.user_metadata || {};
              const newProf = { id: session.user.id, email: session.user.email, full_name: meta.full_name || '', store_name: meta.store_name || s.name, plan: 'basico', subscription_status: 'trial' };
              try { const { data: ins } = await client.from('profiles').insert(newProf).select().single(); if (ins) setSupabaseProfile(ins); } catch {}
            }
            try { localStorage.setItem('nexgest_supabase_user_id', session.user.id); localStorage.setItem('nexgest_logged', 'true'); } catch {}
          } catch {}
          setIsLogged(true);
          // if on landing/login/cadastro, go dashboard
          setView((prev:any)=>{ const landing = ['landing','login','cadastro','checkout','onboarding','planos','termos','privacidade','politica-assinatura']; return landing.includes(prev) ? 'dashboard' : prev; });
        }
      } catch (e) { console.warn('getSession error', e); }
      if (mounted) setIsAuthChecking(false);
    })();
    let listener: any = null;
    try {
      const res = client.auth.onAuthStateChange(async (event:any, session:any)=>{
        if (!mounted) return;
        setSupabaseSession(session);
        setAuthUser(session?.user || null);
        if (event === 'SIGNED_IN' && session?.user) {
          setIsLogged(true);
          try {
            const { data: prof } = await client.from('profiles').select('*').eq('id', session.user.id).single();
            if (prof) {
              setSupabaseProfile(prof);
              setStore((s:any)=>({ ...s, name: prof.store_name || s.name, owner: prof.full_name || s.owner, email: prof.email || s.email }));
            } else {
              const meta = session.user.user_metadata || {};
              const newProf = { id: session.user.id, email: session.user.email, full_name: meta.full_name || '', store_name: meta.store_name || '', plan: 'basico', subscription_status: 'trial' };
              try { await client.from('profiles').insert(newProf); } catch {}
            }
            localStorage.setItem('nexgest_supabase_user_id', session.user.id);
          } catch {}
          setView('dashboard');
        }
        if (event === 'SIGNED_OUT') {
          setIsLogged(false);
          setSupabaseProfile(null);
          setAuthUser(null);
          setSupabaseSession(null);
          try { localStorage.removeItem('nexgest_supabase_user_id'); localStorage.removeItem('nexgest_logged'); } catch {}
          setView('login');
        }
      });
      listener = res?.data;
    } catch {}
    return ()=>{ mounted = false; try { listener?.subscription?.unsubscribe(); } catch {} };
  }, [supabaseReady]);

  // Proteção: se Supabase configurado e sem sessão, forçar login quando tentar acessar appViews
  useEffect(()=>{
    if (isLoadingApp) return;
    if (isAuthChecking) return;
    if (!isSupabaseConfigured()) return;
    if (!supabaseReady) return;
    if (supabaseSession) return;
    const appViews = ['dashboard','estoque','add','edit','details','vendas','registrarVenda','financeiro','config','assinatura','clientes','clienteDetalhe','clienteForm','ajuda'];
    if (appViews.includes(view)) {
      setIsLogged(false);
      setView('login');
    }
  }, [view, isLoadingApp, isAuthChecking, supabaseReady, supabaseSession]);

  // V3.1c.1 - CARREGAR ESTOQUE DO SUPABASE QUANDO SESSÃO PRONTA
  useEffect(()=>{
    if (isLoadingApp) return;
    if (isAuthChecking) return;
    if (!supabaseReady) return;
    if (!supabaseSession?.user?.id) return;
    if (!isSupabaseConfigured()) return;
    // só carrega se logado
    if (!isLogged) return;
    loadInventorySupabase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseReady, supabaseSession, isLogged, isLoadingApp, isAuthChecking]);

  // Load from localStorage (DEMO persistence) - FIX V2.2 tela escura + V2.4.2 limites reais por plano
  useEffect(() => {
    let parsedClients: Client[] = SEED_CLIENTS;
    try {
      // === SUBSCRIPTION POR STOREID COM MIGRAÇÃO ===
      const perStoreKey = `nexgest_subscription_${store.id}`;
      const legacyKey = 'nexgest_subscriptions';
      let loadedSub: any = null;
      const perStoreRaw = localStorage.getItem(perStoreKey);
      if (perStoreRaw) {
        try { loadedSub = JSON.parse(perStoreRaw); } catch {}
      } else {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) { try { loadedSub = JSON.parse(legacyRaw); } catch {} }
      }
      if (loadedSub && typeof loadedSub === 'object') {
        // migrar pro -> premium
        if (loadedSub.plan === 'pro') {
          loadedSub.plan = 'premium';
        }
        // garantir maxDevices coerente
        const limit = PLAN_LIMITS[loadedSub.plan] ?? PLAN_LIMITS['profissional'];
        loadedSub.maxDevices = limit;
        if (!loadedSub.price) loadedSub.price = PLAN_PRICES[loadedSub.plan] ?? 29.90;
        if (!loadedSub.status) loadedSub.status = 'active';
        setSubscription(loadedSub);
      }
      const d = localStorage.getItem('nexgest_devices');
      if (d) { try { const pv = JSON.parse(d); if (Array.isArray(pv)) setDevices(pv); } catch {} }
      const sa = localStorage.getItem('nexgest_sales');
      if (sa) { try { const pv = JSON.parse(sa); if (Array.isArray(pv)) setSales(pv); } catch {} }
      // clients: tenta key per storeId e fallback
      const clPerStore = localStorage.getItem(`nexgest_clients_${store.id}`) || localStorage.getItem('nexgest_clients_store_001') || localStorage.getItem('nexgest_clients');
      if (clPerStore) {
        try { const pv = JSON.parse(clPerStore); if (Array.isArray(pv)) { parsedClients = pv; setClients(pv); } } catch { /* keep seed */ }
      } else {
        setClients(parsedClients);
      }
      const logged = localStorage.getItem('nexgest_logged');
      if (logged === 'true') {
        setIsLogged(true);
        setView('dashboard');
      }
    } catch (e) {
      console.warn('load error', e);
      setClients(parsedClients);
    } finally {
      setIsLoadingApp(false);
    }
  }, []);
  useEffect(() => {
    try {
      // salvar por storeId + legado para compatibilidade
      const perStoreKey = `nexgest_subscription_${store.id}`;
      localStorage.setItem(perStoreKey, JSON.stringify(subscription));
      localStorage.setItem('nexgest_subscriptions', JSON.stringify(subscription));
      localStorage.setItem('nexgest_devices', JSON.stringify(devices));
      localStorage.setItem('nexgest_sales', JSON.stringify(sales));
      localStorage.setItem('nexgest_clients', JSON.stringify(clients));
      localStorage.setItem(`nexgest_clients_${store.id}`, JSON.stringify(clients));
      localStorage.setItem('nexgest_logged', isLogged ? 'true' : 'false');
    } catch {}
  }, [subscription, devices, sales, clients, isLogged, store.id]);

  // GARANTIR que logado nunca fica em tela escura - se view é landing/login etc, força dashboard
  useEffect(() => {
    if (isLogged && !isLoadingApp) {
      const appViews = ['dashboard','estoque','add','edit','details','vendas','registrarVenda','financeiro','config','assinatura','clientes','clienteDetalhe','clienteForm'];
      if (!appViews.includes(view)) {
        setView('dashboard');
      }
    }
  }, [isLogged, isLoadingApp, view]);

  // derived
  const storeDevices = useMemo(() => devices.filter(d => d.storeId === store.id), [devices, store.id]);
  const storeClients = useMemo(() => clients.filter(c => c.storeId === store.id), [clients, store.id]);
  const storeSales = useMemo(() => sales.filter(s => s.storeId === store.id), [sales, store.id]);
  // === V2.4.2 LIMITES REAIS HELPERS — IMPLEMENTAÇÃO REAL PRESERVANDO VISUAL ===
  const getPlanLimit = (plan: string) => {
    if (!plan) return 10;
    const key = plan.toLowerCase();
    const v = PLAN_LIMITS[key] ?? PLAN_LIMITS[plan];
    if (v === undefined) return 10;
    return v;
  };
  const getPlanName = (plan: string) => {
    if (!plan) return 'Básico';
    const key = plan.toLowerCase();
    return PLAN_LABELS[key] ?? PLAN_LABELS[plan] ?? 'Básico';
  };
  const getCurrentPlan = (): string => {
    const p = subscription?.plan || 'basico';
    // legado pro => premium para não bloquear quem já usa
    if (p === 'pro') return 'premium';
    return p;
  };
  const currentPlanLimit = useMemo(() => getPlanLimit(subscription.plan), [subscription.plan]);
  const currentDeviceCount = useMemo(() => {
    // limite conta apenas estoque ativo (Disponível + Reservado) — vendidos/arquivados não contam
    return storeDevices.filter(d => d.status !== 'Vendido' && d.status !== 'Arquivado').length;
  }, [storeDevices]);
  const canAddDevice = useMemo(() => {
    if (!isFinite(currentPlanLimit)) return true;
    return currentDeviceCount < currentPlanLimit;
  }, [currentDeviceCount, currentPlanLimit]);
  const getRemainingSlots = () => {
    if (!isFinite(currentPlanLimit)) return Infinity;
    return Math.max(0, currentPlanLimit - currentDeviceCount);
  };
  const getPlanProgress = () => {
    if (!isFinite(currentPlanLimit) || currentPlanLimit === 0) return 0;
    return Math.min(100, (currentDeviceCount / currentPlanLimit) * 100);
  };
  function handleSelectPlan(planId: PlanId) {
    const limit = PLAN_LIMITS[planId] ?? Infinity;
    const price = PLAN_PRICES[planId] ?? 0;
    const newSub: Subscription = {
      status: 'active',
      verified: false,
      plan: planId as any,
      price,
      maxDevices: limit,
      startedAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 7*86400000).toISOString(),
    };
    setSubscription(newSub);
    setSelectedPlan(planId);
    try {
      localStorage.setItem(`nexgest_subscription_${store.id}`, JSON.stringify(newSub));
    } catch {}
    const label = PLAN_LABELS[planId] || planId;
    const limitLabel = isFinite(limit) ? `limite ${limit} aparelhos` : 'ilimitado';
    showToast(`Plano alterado para ${label} (${limitLabel})`);
  }
  const filteredDevices = useMemo(() => {
    return storeDevices.filter(d => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${d.brand} ${d.model} ${d.storage} ${d.color} ${d.imei || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterBrand !== 'Todas' && d.brand !== filterBrand) return false;
      if (filterStatus !== 'Todos' && d.status !== filterStatus) return false;
      if (filterBattery !== 'Todas') {
        if (filterBattery === '<80' && (d.battery === null || d.battery >= 80)) return false;
        if (filterBattery === '80-89' && (d.battery === null || d.battery < 80 || d.battery > 89)) return false;
        if (filterBattery === '90+' && (d.battery === null || d.battery < 90)) return false;
      }
      return true;
    });
  }, [storeDevices, search, filterBrand, filterStatus, filterBattery]);

  const totalCost = storeDevices.filter(d => d.status === 'Disponível' || d.status === 'Reservado').reduce((a, b) => a + b.cost, 0);
  const totalSale = storeDevices.filter(d => d.status === 'Disponível' || d.status === 'Reservado').reduce((a, b) => a + b.price, 0);
  const potentialProfit = totalSale - totalCost;
  const qtdDisp = storeDevices.filter(d => d.status === 'Disponível').length;
  const qtdVendido = storeSales.filter(s => !s.isCanceled).length;

  // period filter for sales - FIX V2.4.3: 30d removido (duplicado com mes), add 90d + todas distintos
  const filteredSales = useMemo(() => {
    const now = new Date();
    return storeSales.filter(s => !s.isCanceled).filter(s => {
      const sd = new Date(s.saleDate);
      if (filterPeriod === 'hoje') return sd.toDateString() === now.toDateString();
      if (filterPeriod === '7d') return (now.getTime() - sd.getTime()) <= 7*86400000;
      if (filterPeriod === 'mes') return sd.getMonth() === now.getMonth() && sd.getFullYear() === now.getFullYear();
      if (filterPeriod === '90d') return (now.getTime() - sd.getTime()) <= 90*86400000;
      // todas = sem filtro
      return true;
    });
  }, [storeSales, filterPeriod]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return storeClients;
    const q = clientSearch.toLowerCase();
    return storeClients.filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.cpf && c.cpf.toLowerCase().includes(q)) || (c.email && c.email.toLowerCase().includes(q)));
  }, [storeClients, clientSearch]);

  const filteredSaleClients = useMemo(() => {
    if (!saleClientQuery) return storeClients.slice(0, 8);
    const q = saleClientQuery.toLowerCase();
    return storeClients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8);
  }, [storeClients, saleClientQuery]);

  const clientStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number; completed: number }>();
    storeSales.forEach(s => {
      if (!s.clientId) return;
      const cur = map.get(s.clientId) || { count: 0, total: 0, completed: 0 };
      if (!s.isCanceled) { cur.total += s.salePrice; cur.completed += 1; }
      cur.count += 1;
      map.set(s.clientId, cur);
    });
    return map;
  }, [storeSales]);

  const selectedClientSales = useMemo(() => {
    if (!selectedClient) return [];
    return storeSales.filter(s => s.clientId === selectedClient.id).sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [storeSales, selectedClient]);

  // === V2.3.1 FILTRAGEM COMPROVANTES - FIX V2.4.3 períodos distintos: Hoje / 7d / Este mês (calendário) / 90d / Todas ===
  const filteredComprovantes = useMemo(() => {
    const now = new Date();
    let list = [...storeSales];
    // busca por nº venda, cliente, modelo ou IMEI
    if (comprovanteSearch.trim()) {
      const q = comprovanteSearch.toLowerCase();
      list = list.filter(s => {
        const idMatch = s.id.toLowerCase().includes(q);
        const clientMatch = (s.clientNameSnapshot || '').toLowerCase().includes(q);
        const brandModel = `${s.deviceSnapshot.brand} ${s.deviceSnapshot.model}`.toLowerCase();
        const brandModelMatch = brandModel.includes(q);
        const imeiMatch = (s.deviceSnapshot.imei || '').toLowerCase().includes(q);
        return idMatch || clientMatch || brandModelMatch || imeiMatch;
      });
    }
    // período - 30d removido (igual a mês), novo 90d para rolling longo, mes = calendário atual
    if (comprovantePeriod !== 'todas') {
      list = list.filter(s => {
        const sd = new Date(s.saleDate);
        if (comprovantePeriod === 'hoje') return sd.toDateString() === now.toDateString();
        if (comprovantePeriod === '7d') return (now.getTime() - sd.getTime()) <= 7*86400000;
        if (comprovantePeriod === 'mes') return sd.getMonth() === now.getMonth() && sd.getFullYear() === now.getFullYear();
        if (comprovantePeriod === '90d') return (now.getTime() - sd.getTime()) <= 90*86400000;
        return true;
      });
    }
    // status
    if (comprovanteStatus !== 'todas') {
      if (comprovanteStatus === 'concluidas') list = list.filter(s => !s.isCanceled);
      if (comprovanteStatus === 'canceladas') list = list.filter(s => s.isCanceled);
    }
    return list.sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [storeSales, comprovanteSearch, comprovantePeriod, comprovanteStatus]);

  const faturamento = filteredSales.reduce((a, b) => a + b.salePrice, 0);
  const lucroBruto = filteredSales.reduce((a, b) => a + b.profit, 0);
  const despesas = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const lucroLiquido = lucroBruto - despesas;

  // Charts real data
  const faturamentoPorDia = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => {
      const k = new Date(s.saleDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      map.set(k, (map.get(k) || 0) + s.salePrice);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).slice(-6);
  }, [filteredSales]);

  const lucroPorDia = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => {
      const k = new Date(s.saleDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      map.set(k, (map.get(k) || 0) + s.profit);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).slice(-6);
  }, [filteredSales]);

  const estoquePorMarca = useMemo(() => {
    const map = new Map<string, number>();
    storeDevices.filter(d => d.status !== 'Vendido' && d.status !== 'Arquivado').forEach(d => map.set(d.brand, (map.get(d.brand) || 0) + 1));
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(map.entries()).map(([label, value]) => ({ label, value, pct: Math.round(value / total * 100) }));
  }, [storeDevices]);

  const vendasPorMarca = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => map.set(s.deviceSnapshot.brand, (map.get(s.deviceSnapshot.brand) || 0) + s.salePrice));
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [filteredSales]);

  const topProdutos = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    storeSales.filter(s => !s.isCanceled).forEach(s => {
      const k = `${s.deviceSnapshot.brand} ${s.deviceSnapshot.model} ${s.deviceSnapshot.storage}`;
      const cur = map.get(k) || { count: 0, total: 0 };
      map.set(k, { count: cur.count + 1, total: cur.total + s.salePrice });
    });
    return Array.from(map.entries()).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [storeSales]);

  const estoqueParado = useMemo(() => storeDevices.filter(d => d.status === 'Disponível' && (Date.now() - new Date(d.entryDate).getTime()) > 30*86400000), [storeDevices]);
  const bateriasAtencao = useMemo(() => storeDevices.filter(d => d.battery !== null && d.battery < 80 && d.status === 'Disponível'), [storeDevices]);

  // actions
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  async function handleLogin() {
    setAuthError(null);
    const client = getSupabase();
    if (client && isSupabaseConfigured() && supabaseReady) {
      if (!loginEmail || !loginPass) { setAuthError('Informe email e senha'); showToast('Preencha email e senha'); return; }
      setIsAuthLoading(true);
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPass });
        if (error) throw error;
        if (data?.session) {
          setSupabaseSession(data.session);
          setAuthUser(data.user);
          setIsLogged(true);
          setView('dashboard');
          setSalesSubTab('vendas');
          showToast('Login realizado');
        }
      } catch (e:any) {
        const msg = friendlyAuthError(e);
        setAuthError(msg);
        showToast(msg);
      } finally { setIsAuthLoading(false); }
      return;
    }
    // fallback demo
    setIsLogged(true);
    setView('dashboard');
    setSalesSubTab('vendas');
    showToast('Bem-vindo de volta! (DEMO local)');
  }

  async function handleLoginReal(email: string, senha: string) {
    setLoginEmail(email);
    setLoginPass(senha);
    await handleLogin();
  }

  async function handleLogout() {
    const client = getSupabase();
    if (client && isSupabaseConfigured() && supabaseReady) {
      setIsAuthLoading(true);
      try { await client.auth.signOut(); } catch {}
      setIsAuthLoading(false);
      setIsLogged(false);
      setSupabaseProfile(null);
      setAuthUser(null);
      setSupabaseSession(null);
      setView('landing');
      showToast('Sessão encerrada');
      return;
    }
    setIsLogged(false);
    setView('landing');
    try { localStorage.removeItem('nexgest_logged'); } catch {}
    showToast('Saiu da conta (DEMO)');
  }

  async function handleLogoutReal() { await handleLogout(); }

  async function handleSignUpReal() {
    setAuthError(null);
    if (!cadastroForm.loja || !cadastroForm.nome || !cadastroForm.email || !cadastroForm.senha) { setAuthError('Preencha todos os campos'); showToast('Preencha todos os campos'); return; }
    if (!cadastroForm.termos) { setAuthError('Aceite os termos'); showToast('Aceite os termos'); return; }
    const client = getSupabase();
    if (client && isSupabaseConfigured() && supabaseReady) {
      setIsAuthLoading(true);
      try {
        const { data, error } = await client.auth.signUp({
          email: cadastroForm.email.trim(),
          password: cadastroForm.senha,
          options: { data: { full_name: cadastroForm.nome.trim(), store_name: cadastroForm.loja.trim() } }
        });
        if (error) throw error;
        // cria profile se user retornou
        const user = data?.user;
        const session = data?.session;
        if (user) {
          try {
            const profilePayload = { id: user.id, email: user.email, full_name: cadastroForm.nome.trim(), store_name: cadastroForm.loja.trim(), plan: selectedPlan || 'basico', subscription_status: 'trial' };
            const { error: insertErr } = await client.from('profiles').insert(profilePayload);
            if (insertErr && !String(insertErr.message).toLowerCase().includes('duplicate')) { console.warn('profile insert', insertErr); }
          } catch (e) { console.warn(e); }
        }
        if (session) {
          setSupabaseSession(session);
          setAuthUser(user);
          setStore({ ...store, name: cadastroForm.loja, owner: cadastroForm.nome, email: cadastroForm.email });
          setIsLogged(true);
          setView('dashboard');
          showToast('Conta criada - login realizado');
        } else {
          // email confirmation required
          showToast('Conta criada - confirme seu email para entrar');
          setView('login');
          setLoginEmail(cadastroForm.email.trim());
          setAuthError('Verifique seu email para confirmar a conta');
        }
      } catch (e:any) {
        const msg = friendlyAuthError(e);
        setAuthError(msg);
        showToast(msg);
      } finally { setIsAuthLoading(false); }
      return;
    }
    // fallback demo -> checkout
    setStore({ ...store, name: cadastroForm.loja, owner: cadastroForm.nome, email: cadastroForm.email });
    setView('checkout');
  }

 function handleCadastro() {
    // V3.1b: se Supabase configurado, usa signUp real, senão mantém fluxo checkout demo
    if (isSupabaseConfigured() && supabaseReady && getSupabase()) {
      handleSignUpReal();
      return;
    }
    if (!cadastroForm.loja || !cadastroForm.nome || !cadastroForm.email || !cadastroForm.senha) { showToast('Preencha todos os campos'); return; }
    if (!cadastroForm.termos) { showToast('Aceite os termos'); return; }
    setStore({ ...store, name: cadastroForm.loja, owner: cadastroForm.nome, email: cadastroForm.email });
    setView('checkout');
  }

  async function handleRecoveryReal(email: string) {
    const client = getSupabase();
    if (!client || !isSupabaseConfigured() || !supabaseReady) { showToast('Recuperação só com Supabase configurado'); return; }
    if (!email) { setAuthError('Informe email'); return; }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setShowRecoverySent(true);
      showToast('Email de recuperação enviado');
    } catch (e:any) {
      const msg = friendlyAuthError(e);
      setAuthError(msg);
      showToast(msg);
    } finally { setIsAuthLoading(false); }
  }

 function handleSimularPix() {
   // DEMO: cria subscription active mas verified false - usa plano selecionado
   const planDef = PLANS.find(p=>p.id===selectedPlan) || PLANS[1];
   setSubscription({
     status: 'active',
     verified: false, // TODO BACKEND: só true via webhook /api/webhooks/pix
     plan: planDef.id as any,
      price: planDef.price,
     startedAt: new Date().toISOString(),
     trialEndsAt: new Date(Date.now() + 7*86400000).toISOString(),
   });
   setView('onboarding');
   showToast(`Pagamento simulado ${planDef.name} ${planDef.priceLabel} (DEMO) — acesso liberado localmente`);
 }

  function checkImeiDuplicate(imei: string | null, excludeId?: string) {
    if (!imei) return null;
    const dup = storeDevices.find(d => d.imei === imei && d.status !== 'Vendido' && d.status !== 'Arquivado' && d.id !== excludeId);
    return dup || null;
  }

  function openEditDevice(device: Device) {
    setEditingDevice(device);
    setAddForm({
      brand: device.brand,
      model: device.model,
      storage: device.storage,
      color: device.color,
      condition: device.condition,
      battery: device.battery,
      imei: device.imei || '',
      serial: device.serial || '',
      cost: device.cost,
      price: device.price,
      status: device.status,
      notes: device.notes || '',
    } as any);
    setCostStr(String(device.cost));
    setPriceStr(String(device.price));
    setPhotoPreview(device.photoUrl);
    // garantia
    setHasWarranty(!!device.hasWarranty);
    setWarrantyDuration(device.warrantyDuration || 90);
    setWarrantyUnit(device.warrantyUnit || 'dias');
    setWarrantyStartDate(device.warrantyStartDate || '');
    setWarrantyEndDate(device.warrantyEndDate || '');
    setWarrantyNote(device.warrantyNote || '');
    setImeiError(null);
    setView('edit');
  }

  function resetAddForm() {
    setAddForm({ brand: 'Apple', model: '', storage: '128GB', color: '', condition: 'Seminovo', battery: null, imei: '', serial: '', cost: 0, price: 0, status: 'Disponível', notes: '' } as any);
    setPhotoPreview(null);
    setCostStr('');
    setPriceStr('');
    setHasWarranty(false);
    setWarrantyDuration(90);
    setWarrantyUnit('dias');
    setWarrantyStartDate('');
    setWarrantyEndDate('');
    setWarrantyNote('');
    setImeiError(null);
    setEditingDevice(null);
  }

  // === CLIENTES CRUD ===
  function openClientForm(client?: Client) {
    if (client) {
      setEditingClient(client);
      setClientForm({ name: client.name, phone: client.phone, cpf: client.cpf || '', email: client.email || '', notes: client.notes || '' });
    } else {
      setEditingClient(null);
      setClientForm({ name: '', phone: '', cpf: '', email: '', notes: '' });
    }
    setView('clienteForm');
  }
  function resetClientForm() {
    setClientForm({ name: '', phone: '', cpf: '', email: '', notes: '' });
    setEditingClient(null);
  }
  function handleSaveClient() {
    if (!clientForm.name.trim() || !clientForm.phone.trim()) { showToast('Nome e telefone obrigatórios'); return; }
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, name: clientForm.name.trim(), phone: clientForm.phone.trim(), cpf: clientForm.cpf.trim() || undefined, email: clientForm.email.trim() || undefined, notes: clientForm.notes.trim() || undefined } : c));
      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient({ ...selectedClient, name: clientForm.name.trim(), phone: clientForm.phone.trim(), cpf: clientForm.cpf.trim() || undefined, email: clientForm.email.trim() || undefined, notes: clientForm.notes.trim() || undefined });
      }
      showToast('Cliente atualizado');
    } else {
      const nc: Client = { id: 'c_' + Math.random().toString(36).slice(2, 8), storeId: store.id, name: clientForm.name.trim(), phone: clientForm.phone.trim(), cpf: clientForm.cpf.trim() || undefined, email: clientForm.email.trim() || undefined, notes: clientForm.notes.trim() || undefined, createdAt: new Date().toISOString() };
      setClients([nc, ...clients]);
      showToast('Cliente cadastrado');
    }
    setView('clientes');
    setSalesSubTab('clientes');
    resetClientForm();
  }
  function handleDeleteClient(client: Client) {
    setSales(prev => prev.map(s => {
      if (s.clientId === client.id && !s.clientNameSnapshot) {
        return { ...s, clientNameSnapshot: client.name };
      }
      return s;
    }));
    setClients(prev => prev.filter(c => c.id !== client.id));
    if (selectedClient && selectedClient.id === client.id) {
      setSelectedClient(null);
      setView('clientes');
    }
    setShowDeleteClientModal(null);
    showToast('Cliente removido • histórico preservado');
  }
  function handleInlineCreateClient() {
    if (!inlineClientForm.name.trim() || !inlineClientForm.phone.trim()) { showToast('Informe nome e telefone'); return; }
    const nc: Client = { id: 'c_' + Math.random().toString(36).slice(2, 8), storeId: store.id, name: inlineClientForm.name.trim(), phone: inlineClientForm.phone.trim(), createdAt: new Date().toISOString() };
    setClients([nc, ...clients]);
    setSelectedSaleClient(nc);
    setSaleClientQuery('');
    setShowClientDropdown(false);
    setShowInlineClientForm(false);
    setInlineClientForm({ name: '', phone: '' });
    showToast('Cliente criado e vinculado');
  }

  async function handleAddDevice() {
    if (!addForm.model || !addForm.brand) { showToast('Informe marca e modelo'); return; }
    const sb = getSupabase();
    const sess = supabaseSession;
    const isSupabaseMode = !!(sb && sess?.user?.id && isSupabaseConfigured());
    const finalEndDate = hasWarranty ? (warrantyEndDate || calcWarrantyEnd(warrantyStartDate, warrantyDuration, warrantyUnit)) : '';
    // === LIMITE PLANO - SUPABASE COUNT ===
    const isNewDevice = !editingDevice;
    if (isNewDevice) {
      let activeCount = currentDeviceCount;
      if (isSupabaseMode) {
        try {
          const { count } = await sb.from('inventory').select('id', { count: 'exact', head: true }).eq('user_id', sess.user.id).in('status', ['Disponível','Reservado']);
          if (typeof count === 'number') activeCount = count;
        } catch {}
      }
      const limit = currentPlanLimit;
      if (isFinite(limit) && activeCount >= limit) {
        setShowLimitModal({ show: true, limit, current: activeCount, plan: subscription.plan, attemptedCount: 1 });
        return;
      }
    }
    // valida IMEI duplicado local (sempre) + supabase se modo
    if (editingDevice) {
      const imeiToCheck = (addForm.imei as string) || null;
      if (imeiToCheck) {
        const dup = checkImeiDuplicate(imeiToCheck, editingDevice.id);
        if (dup) { setImeiError(`IMEI já cadastrado em ${dup.brand} ${dup.model}`); return; }
      }
      // histórico
      let newHistory: HistoryEntry[] = [...(editingDevice.history || [])];
      const pushIfChanged = (field: string, oldV: any, newV: any, desc?: string) => {
        const oldS = oldV === null || oldV === undefined || oldV === '' ? '-' : String(oldV);
        const newS = newV === null || newV === undefined || newV === '' ? '-' : String(newV);
        if (oldS !== newS) newHistory.push(createHistoryEntry(field, oldS, newS, desc));
      };
      pushIfChanged('Marca', editingDevice.brand, addForm.brand);
      pushIfChanged('Modelo', editingDevice.model, addForm.model);
      pushIfChanged('Armazenamento', editingDevice.storage, addForm.storage);
      pushIfChanged('Cor', editingDevice.color, addForm.color);
      pushIfChanged('Condição', editingDevice.condition, addForm.condition);
      pushIfChanged('Bateria', editingDevice.battery !== null ? `${editingDevice.battery}%` : '-', addForm.battery !== null && addForm.battery !== undefined ? `${addForm.battery}%` : '-', `Bateria alterada de ${editingDevice.battery ?? '-'}% para ${addForm.battery ?? '-'}%`);
      pushIfChanged('Custo', editingDevice.cost ? fmtBRL(editingDevice.cost) : '-', costNum ? fmtBRL(costNum) : '-', `Custo alterado de ${fmtBRL(editingDevice.cost)} para ${fmtBRL(costNum)}`);
      pushIfChanged('Preço venda', editingDevice.price ? fmtBRL(editingDevice.price) : '-', priceNum ? fmtBRL(priceNum) : '-', `Preço alterado de ${fmtBRL(editingDevice.price)} para ${fmtBRL(priceNum)}`);
      pushIfChanged('Status', editingDevice.status, addForm.status || editingDevice.status);
      const oldWarrantySummary = buildWarrantySummary(editingDevice.hasWarranty, editingDevice.warrantyDuration, editingDevice.warrantyUnit, editingDevice.warrantyStartDate, editingDevice.warrantyEndDate);
      const newWarrantySummary = buildWarrantySummary(hasWarranty, warrantyDuration, warrantyUnit, warrantyStartDate, finalEndDate);
      if (oldWarrantySummary !== newWarrantySummary) {
        pushIfChanged('Garantia', oldWarrantySummary, newWarrantySummary, hasWarranty ? `Garantia alterada para ${newWarrantySummary}` : 'Garantia removida');
      } else if ((editingDevice.warrantyNote || '') !== (warrantyNote || '')) {
        pushIfChanged('Obs garantia', editingDevice.warrantyNote || '-', warrantyNote || '-', `Observação da garantia alterada`);
      }
      // SUPABASE UPDATE
      if (isSupabaseMode) {
        setIsSavingInventory(true);
        try {
          const payload: any = {
            brand: addForm.brand,
            model: addForm.model,
            storage: addForm.storage || '128GB',
            color: addForm.color || 'Preto',
            condition: addForm.condition || 'Seminovo',
            battery: addForm.brand === 'Apple' ? (addForm.battery ?? null) : null,
            imei: (addForm.imei as string) || null,
            serial: (addForm as any).serial || null,
            cost: costNum,
            price: priceNum,
            status: (addForm as any).status || editingDevice.status,
            photo_url: photoPreview,
            notes: (addForm as any).notes || '',
            has_warranty: hasWarranty,
            warranty_duration: hasWarranty ? warrantyDuration : null,
            warranty_unit: hasWarranty ? warrantyUnit : null,
            warranty_start_date: hasWarranty ? (warrantyStartDate || null) : null,
            warranty_end_date: hasWarranty ? (finalEndDate || null) : null,
            warranty_note: hasWarranty ? (warrantyNote || null) : null,
            history: newHistory,
          };
          const { data, error } = await sb.from('inventory').update(payload).eq('id', editingDevice.id).eq('user_id', sess.user.id).select();
          if (error) throw error;
          if (data && data[0]) {
            const updated = mapSupabaseToDevice(data[0]);
            const finalDev = { ...updated, storeId: store.id, history: newHistory } as Device;
            setDevices(prev => prev.map(d => d.id === editingDevice.id ? finalDev : d));
            if (selectedDevice && selectedDevice.id === editingDevice.id) setSelectedDevice(finalDev);
            setView('estoque');
            showToast('Aparelho atualizado • nuvem');
            resetAddForm();
          }
        } catch (e: any) {
          console.warn('edit supabase fail', e);
          showToast('Falha de conexão ao salvar aparelho');
        } finally {
          setIsSavingInventory(false);
        }
        return;
      }
      // FALLBACK LOCAL
      setDevices(prev => prev.map(d => {
        if (d.id !== editingDevice.id) return d;
        return {
          ...d,
          brand: addForm.brand!,
          model: addForm.model!,
          storage: addForm.storage || '128GB',
          color: addForm.color || 'Preto',
          condition: (addForm.condition as DeviceCondition) || 'Seminovo',
          battery: addForm.brand === 'Apple' ? (addForm.battery ?? null) : null,
          imei: (addForm.imei as string) || null,
          serial: (addForm as any).serial || null,
          cost: costNum,
          price: priceNum,
          photoUrl: photoPreview,
          notes: (addForm as any).notes || '',
          hasWarranty,
          warrantyDuration: hasWarranty ? warrantyDuration : undefined,
          warrantyUnit: hasWarranty ? warrantyUnit : undefined,
          warrantyStartDate: hasWarranty ? warrantyStartDate : undefined,
          warrantyEndDate: hasWarranty ? finalEndDate : undefined,
          warrantyNote: hasWarranty ? warrantyNote : undefined,
          history: newHistory,
        };
      }));
      if (selectedDevice && selectedDevice.id === editingDevice.id) {
        setSelectedDevice(prev => prev ? ({
          ...prev,
          brand: addForm.brand!,
          model: addForm.model!,
          storage: addForm.storage || '128GB',
          color: addForm.color || 'Preto',
          condition: (addForm.condition as DeviceCondition) || 'Seminovo',
          battery: addForm.brand === 'Apple' ? (addForm.battery ?? null) : null,
          imei: (addForm.imei as string) || null,
          serial: (addForm as any).serial || null,
          cost: costNum,
          price: priceNum,
          photoUrl: photoPreview,
          notes: (addForm as any).notes || '',
          hasWarranty,
          warrantyDuration: hasWarranty ? warrantyDuration : undefined,
          warrantyUnit: hasWarranty ? warrantyUnit : undefined,
          warrantyStartDate: hasWarranty ? warrantyStartDate : undefined,
          warrantyEndDate: hasWarranty ? finalEndDate : undefined,
          warrantyNote: hasWarranty ? warrantyNote : undefined,
          history: newHistory,
        }) : prev);
      }
      setView('estoque');
      showToast('Aparelho atualizado');
      resetAddForm();
      return;
    }
    // NOVO
    if (addForm.imei) {
      const dup = checkImeiDuplicate(addForm.imei as string);
      if (dup) { setImeiError(`IMEI já cadastrado em ${dup.brand} ${dup.model}`); return; }
    }
    if (isSupabaseMode) {
      setIsSavingInventory(true);
      try {
        const historyEntry = hasWarranty ? [createHistoryEntry('Cadastro', '-', `${addForm.brand} ${addForm.model}`, `Aparelho cadastrado com garantia ${warrantyDuration} ${warrantyUnit}`)] : [createHistoryEntry('Cadastro', '-', `${addForm.brand} ${addForm.model}`, `Aparelho cadastrado`)];
        const payload: any = {
          user_id: sess.user.id,
          store_id: null,
          brand: addForm.brand,
          model: addForm.model,
          storage: addForm.storage || '128GB',
          color: addForm.color || 'Preto',
          condition: addForm.condition || 'Seminovo',
          battery: addForm.brand === 'Apple' ? (addForm.battery ?? null) : null,
          imei: (addForm.imei as string) || null,
          serial: (addForm as any).serial || null,
          cost: costNum,
          price: priceNum,
          status: 'Disponível',
          photo_url: photoPreview,
          notes: (addForm as any).notes || '',
          has_warranty: hasWarranty,
          warranty_duration: hasWarranty ? warrantyDuration : null,
          warranty_unit: hasWarranty ? warrantyUnit : null,
          warranty_start_date: hasWarranty ? (warrantyStartDate || null) : null,
          warranty_end_date: hasWarranty ? (finalEndDate || null) : null,
          warranty_note: hasWarranty ? (warrantyNote || null) : null,
          entry_date: new Date().toISOString(),
          history: historyEntry,
        };
        const { data, error } = await sb.from('inventory').insert([payload]).select();
        if (error) throw error;
        if (data && data[0]) {
          const mapped = mapSupabaseToDevice(data[0]);
          const finalDev = { ...mapped, storeId: store.id } as Device;
          setDevices(prev => [finalDev, ...prev]);
          setView('estoque');
          showToast('Aparelho adicionado • nuvem');
          resetAddForm();
        }
      } catch (e: any) {
        console.warn('add supabase fail', e);
        showToast('Falha de conexão ao salvar aparelho: ' + (e?.message || 'erro'));
      } finally {
        setIsSavingInventory(false);
      }
      return;
    }
    // LOCAL FALLBACK
    const nd: Device = {
      id: 'd_' + Math.random().toString(36).slice(2, 8),
      storeId: store.id,
      brand: addForm.brand!,
      model: addForm.model!,
      storage: addForm.storage || '128GB',
      color: addForm.color || 'Preto',
      condition: (addForm.condition as DeviceCondition) || 'Seminovo',
      battery: addForm.brand === 'Apple' ? (addForm.battery ?? null) : null,
      imei: (addForm.imei as string) || null,
      serial: (addForm as any).serial || null,
      cost: costNum,
      price: priceNum,
      status: 'Disponível',
      photoUrl: photoPreview,
      entryDate: new Date().toISOString(),
      notes: (addForm as any).notes || '',
      hasWarranty,
      warrantyDuration: hasWarranty ? warrantyDuration : undefined,
      warrantyUnit: hasWarranty ? warrantyUnit : undefined,
      warrantyStartDate: hasWarranty ? warrantyStartDate : undefined,
      warrantyEndDate: hasWarranty ? finalEndDate : undefined,
      warrantyNote: hasWarranty ? warrantyNote : undefined,
      history: hasWarranty ? [createHistoryEntry('Cadastro', '-', `${addForm.brand} ${addForm.model}`, `Aparelho cadastrado com garantia ${warrantyDuration} ${warrantyUnit}`)] : [createHistoryEntry('Cadastro', '-', `${addForm.brand} ${addForm.model}`, `Aparelho cadastrado`)],
    };
    setDevices([nd, ...devices]);
    setView('estoque');
    showToast('Aparelho adicionado');
    resetAddForm();
  }

  async function handleSaleAtomic() {
    if (!selectedDevice) return;
    const parsedSale = (() => {
      const cleaned = normalizeMoneyInput(salePriceInput);
      const n = parseFloat(cleaned.replace(',', '.'));
      return isNaN(n) ? 0 : n;
    })();
    const price = parsedSale || selectedDevice.price;
    if (selectedDevice.status !== 'Disponível' && selectedDevice.status !== 'Reservado') {
      showToast('Aparelho não disponível para venda');
      return;
    }
    const saleDateStr = new Date().toLocaleDateString('pt-BR');
    const historyEntry = createHistoryEntry('Status', selectedDevice.status, 'Vendido', `Vendido em ${saleDateStr} por ${fmtBRL(price)}${selectedSaleClient ? ` para ${selectedSaleClient.name}` : ''}`);
    const updated = { ...selectedDevice, status: 'Vendido' as DeviceStatus, history: [...(selectedDevice.history || []), historyEntry] };
    const sb = getSupabase();
    const sess = supabaseSession;
    const isSupabaseMode = !!(sb && sess?.user?.id && isSupabaseConfigured());
    if (isSupabaseMode) {
      try {
        const { error } = await sb.from('inventory').update({ status: 'Vendido', history: updated.history }).eq('id', selectedDevice.id).eq('user_id', sess.user.id);
        if (error) throw error;
        setDevices(devices.map(d => d.id === selectedDevice.id ? updated as Device : d));
      } catch (e: any) {
        console.warn('sale supabase update fail', e);
        showToast('Falha ao atualizar estoque na nuvem, vendendo local');
        setDevices(devices.map(d => d.id === selectedDevice.id ? updated as Device : d));
      }
    } else {
      setDevices(devices.map(d => d.id === selectedDevice.id ? updated as Device : d));
    }
    const profit = price - selectedDevice.cost;
    const originalPrice = selectedDevice.price;
    const discount = originalPrice > price ? originalPrice - price : 0;
    const sale: Sale = {
      id: 's_' + Math.random().toString(36).slice(2, 8),
      storeId: store.id,
      deviceId: selectedDevice.id,
      deviceSnapshot: selectedDevice,
      salePrice: price,
      saleDate: new Date().toISOString(),
      paymentMethod: 'Pix',
      fees: 0,
      isCanceled: false,
      profit,
      clientId: selectedSaleClient?.id,
      clientNameSnapshot: selectedSaleClient?.name,
      originalPrice,
      discount,
    };
    setSales([sale, ...sales]);
    setTransactions([{ id: 't_' + Math.random().toString(36).slice(2, 6), storeId: store.id, type: 'sale', amount: price, date: new Date().toISOString(), description: `Venda ${selectedDevice.brand} ${selectedDevice.model}${selectedSaleClient ? ` • ${selectedSaleClient.name}` : ''}`, relatedSaleId: sale.id }, ...transactions]);
    setSelectedSaleClient(null);
    setSaleClientQuery('');
    setShowClientDropdown(false);
    setShowInlineClientForm(false);
    setLastSaleId(sale.id);
    setShowSaleSuccessModal(sale);
    showToast(selectedSaleClient ? `Venda confirmada para ${selectedSaleClient.name}` : 'Venda confirmada');
  }

  async function handleCancelSale(saleId: string) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    setSales(sales.map(s => s.id === saleId ? { ...s, isCanceled: true } : s));
    const cancelDateStr = new Date().toLocaleDateString('pt-BR');
    const entry = createHistoryEntry('Status', 'Vendido', 'Disponível', `Venda cancelada em ${cancelDateStr} - estoque restaurado`);
    const sb = getSupabase();
    const sess = supabaseSession;
    const isSupabaseMode = !!(sb && sess?.user?.id && isSupabaseConfigured());
    if (isSupabaseMode) {
      try {
        // busca device atual para pegar history
        const dev = devices.find(d=> d.id === sale.deviceId);
        const newHist = dev ? [...(dev.history||[]), entry] : [entry];
        const { error } = await sb.from('inventory').update({ status: 'Disponível', history: newHist }).eq('id', sale.deviceId).eq('user_id', sess.user.id);
        if (error) throw error;
      } catch (e) { console.warn('cancel sale supabase fail', e); }
    }
    setDevices(devices.map(d => {
      if (d.id !== sale.deviceId) return d;
      return { ...d, status: 'Disponível' as DeviceStatus, history: [...(d.history || []), entry] };
    }));
    if (selectedDevice && selectedDevice.id === sale.deviceId) {
      const e2 = createHistoryEntry('Status', 'Vendido', 'Disponível', `Venda cancelada em ${cancelDateStr} - estoque restaurado`);
      setSelectedDevice(prev => prev ? { ...prev, status: 'Disponível' as DeviceStatus, history: [...(prev.history || []), e2] } as Device : prev);
    }
    setTransactions([...transactions, { id: 't_' + Math.random().toString(36).slice(2, 6), storeId: store.id, type: 'reversal', amount: -sale.salePrice, date: new Date().toISOString(), description: `Estorno venda ${sale.deviceSnapshot.model}`, relatedSaleId: sale.id }]);
    showToast('Venda cancelada — aparelho voltou ao estoque');
  }

  // === V2.3 RECEIPT HELPERS ===
  function openReceipt(sale: Sale) {
    setReceiptSale(sale);
  }
  function getClientPhoneForSale(sale: Sale): string | null {
    if (sale.clientId) {
      const c = clients.find(cl => cl.id === sale.clientId);
      if (c) return c.phone;
    }
    return null;
  }
  function formatReceiptDateTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }
  function buildReceiptText(sale: Sale): string {
    const dev = sale.deviceSnapshot;
    const clientPhone = getClientPhoneForSale(sale);
    const shortId = '#' + sale.id.slice(-4).toUpperCase();
    const clientLabel = sale.clientId ? (clients.find(c=>c.id===sale.clientId)?.name || sale.clientNameSnapshot || 'Cliente removido') : (sale.clientNameSnapshot || 'Venda avulsa / Não informado');
    const lines = [
      `COMPROVANTE DE VENDA - ${store.name}`,
      store.phone ? `Tel: ${store.phone}` : '',
      store.address ? `End: ${store.address}` : '',
      `------------------------------`,
      sale.isCanceled ? `*** VENDA CANCELADA ***` : `Venda ${shortId}`,
      `Data: ${formatReceiptDateTime(sale.saleDate)}`,
      `Cliente: ${clientLabel}`,
      clientPhone ? `Telefone: ${clientPhone}` : '',
      `------------------------------`,
      `Aparelho: ${dev.brand} ${dev.model}`,
      `Armazenamento: ${dev.storage || 'Não informado'}`,
      `Cor: ${dev.color || 'Não informado'}`,
      `Condição: ${dev.condition || 'Não informado'}`,
      `IMEI: ${dev.imei || 'Não informado'}`,
      `------------------------------`,
      `Valor original: ${sale.originalPrice ? fmtBRL(sale.originalPrice) : fmtBRL(dev.price || sale.salePrice)}`,
      sale.discount && sale.discount > 0 ? `Desconto: ${fmtBRL(sale.discount)}` : '',
      `Valor final: ${fmtBRL(sale.salePrice)}`,
      `Pagamento: ${sale.paymentMethod || 'Não informado'}${sale.installments ? ` em ${sale.installments}x` : ''}`,
      sale.fees ? `Taxas: ${fmtBRL(sale.fees)}` : '',
      dev.hasWarranty ? `Garantia: ${dev.warrantyDuration || ''} ${dev.warrantyUnit || ''} | Venc ${dev.warrantyEndDate ? fmtDateBR(dev.warrantyEndDate) : '—'}${dev.warrantyNote ? ` | ${dev.warrantyNote}` : ''}` : '',
      sale.observations ? `Obs: ${sale.observations}` : (dev.notes ? `Obs aparelho: ${dev.notes}` : ''),
      `------------------------------`,
      `Loja: ${store.name}`,
      `Impresso em: ${new Date().toLocaleString('pt-BR')}`,
      sale.isCanceled ? `*** ESTA VENDA FOI CANCELADA ***` : '',
    ].filter(Boolean);
    return lines.join('\n');
  }
  async function handleShareReceipt(sale: Sale) {
    const text = buildReceiptText(sale);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Comprovante ${store.name} - Venda #${sale.id.slice(-4).toUpperCase()}`, text });
        showToast('Compartilhado');
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      showToast('Comprovante copiado para área de transferência');
    } catch {
      showToast('Não foi possível copiar — selecione o texto manualmente');
    }
  }

  // === V2.4 BACKUP JSON REAL ===
  function buildBackupObject(isAuto = false) {
    return {
      version: '2.4',
      app: 'nexgest',
      storeId: store.id,
      storeName: store.name,
      exportedAt: new Date().toISOString(),
      isAuto,
      data: {
        store,
        devices: devices.filter(d => d.storeId === store.id),
        sales: sales.filter(s => s.storeId === store.id),
        clients: clients.filter(c => c.storeId === store.id),
        transactions: transactions.filter(t => t.storeId === store.id),
        subscription,
      }
    };
  }
  function exportBackup(isAuto = false) {
    try {
      const backup = buildBackupObject(isAuto);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const fileName = isAuto ? `backup-auto-antes-restauracao-${getDateTimeFileStr()}.json` : `backup-nexgest-${getDateFileStr()}.json`;
      downloadBlob(blob, fileName);
      if (!isAuto) showToast(`Backup exportado • ${backup.data.devices.length} aparelhos, ${backup.data.sales.length} vendas`);
      return backup;
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar backup');
      return null;
    }
  }
  function handleBackupFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        // validação básica
        if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
        const hasData = parsed.data && (parsed.data.devices || parsed.storeId || parsed.version);
        const looksLikeNexgest = parsed.app === 'nexgest' || parsed.version || (parsed.data && parsed.data.devices) || parsed.storeId;
        if (!hasData && !looksLikeNexgest) throw new Error('invalid');
        // normalizar estrutura legada
        let data = parsed.data ? parsed.data : parsed;
        if (!parsed.data && parsed.devices) data = parsed; // backup direto sem wrapper
        const backupStoreId = parsed.storeId || data.storeId || data.store?.id || '';
        const backupToUse = {
          ...parsed,
          storeId: backupStoreId,
          data: {
            store: data.store || parsed.store || { id: backupStoreId, name: parsed.storeName || 'Loja backup' },
            devices: data.devices || [],
            sales: data.sales || [],
            clients: data.clients || [],
            transactions: data.transactions || [],
            subscription: data.subscription || parsed.subscription,
          },
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          storeName: parsed.storeName || data.store?.name || backupStoreId || 'Desconhecida',
        };
        if (!Array.isArray(backupToUse.data.devices) && !Array.isArray(backupToUse.data.sales) && !Array.isArray(backupToUse.data.clients)) {
          throw new Error('invalid structure');
        }
        setPendingBackup(backupToUse);
        setRestoreForceOtherStore(false);
        setShowBackupPreview(true);
      } catch (err) {
        console.warn(err);
        showToast('Arquivo inválido ou corrompido');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  }
  // alias para compatibilidade com view que chama handleImportBackupFile
  const handleImportBackupFile = handleBackupFileSelected;
  function confirmRestore() {
    if (!pendingBackup) return;
    const isOtherStore = pendingBackup.storeId && pendingBackup.storeId !== store.id;
    if (isOtherStore && !restoreForceOtherStore) {
      showToast('Confirme que deseja restaurar backup de outra loja');
      return;
    }
    try {
      // backup auto antes
      exportBackup(true);
      const d = pendingBackup.data;
      const currentStoreId = store.id;
      // devices
      setDevices(prev => {
        const other = prev.filter(x => x.storeId !== currentStoreId);
        const imported = (d.devices as Device[]).map(dev => ({ ...dev, storeId: currentStoreId }));
        return [...other, ...imported];
      });
      setSales(prev => {
        const other = prev.filter(x => x.storeId !== currentStoreId);
        const imported = (d.sales as Sale[]).map(s => ({ ...s, storeId: currentStoreId }));
        return [...other, ...imported];
      });
      setClients(prev => {
        const other = prev.filter(x => x.storeId !== currentStoreId);
        const imported = (d.clients as Client[]).map(c => ({ ...c, storeId: currentStoreId }));
        return [...other, ...imported];
      });
      setTransactions(prev => {
        const other = prev.filter(x => x.storeId !== currentStoreId);
        const imported = (d.transactions as Transaction[]).map(t => ({ ...t, storeId: currentStoreId }));
        return [...other, ...imported];
      });
      if (d.store && pendingBackup.storeId === currentStoreId) {
        setStore((s: any) => ({ ...s, ...d.store, id: currentStoreId }));
      }
      if (d.subscription) setSubscription(d.subscription);
      setShowBackupPreview(false);
      setShowRestoreConfirm(false);
      setPendingBackup(null);
      showToast(`Backup restaurado • ${d.devices.length} aparelhos, ${d.sales.length} vendas`);
    } catch (e) {
      console.error(e);
      showToast('Erro ao restaurar backup');
    }
  }

  // === V2.4 EXCEL EXPORT REAL ===
  function exportExcelFromRows(rows: any[], baseName: string) {
    const xlsx = getXLSX();
    const dateStr = getDateFileStr();
    if (xlsx) {
      try {
        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Dados');
        xlsx.writeFile(wb, `${baseName}-${dateStr}.xlsx`);
        showToast(`Excel exportado • ${rows.length} linhas`);
        return;
      } catch (e) {
        console.warn('xlsx fail', e);
      }
    }
    // fallback CSV
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${baseName}-${dateStr}.csv`);
    showToast(`CSV exportado • ${rows.length} linhas (XLSX indisponível)`);
  }
  function exportEstoqueExcel() {
    const rows = storeDevices.map(d => ({
      Marca: d.brand,
      Modelo: d.model,
      Armazenamento: d.storage,
      Cor: d.color,
      Condição: d.condition,
      Bateria: d.battery ?? '',
      IMEI: d.imei ?? '',
      Serial: d.serial ?? '',
      Custo: d.cost,
      'Preço venda': d.price,
      Status: d.status,
      Fornecedor: (d as any).supplier || '',
      'Data entrada': d.entryDate ? new Date(d.entryDate).toLocaleDateString('pt-BR') : '',
      Garantia: d.hasWarranty ? `${d.warrantyDuration||''} ${d.warrantyUnit||''} • Venc ${fmtDateBR(d.warrantyEndDate)} ${d.warrantyNote||''}`.trim() : 'Sem garantia',
      Observações: d.notes || '',
    }));
    exportExcelFromRows(rows, 'estoque-nexgest');
  }
  function exportVendasExcel() {
    const rows = storeSales.map(s => ({
      'Número/código': s.id,
      Data: new Date(s.saleDate).toLocaleDateString('pt-BR'),
      Cliente: s.clientId ? (clients.find(c=>c.id===s.clientId)?.name || s.clientNameSnapshot || 'Cliente removido') : (s.clientNameSnapshot || 'Avulsa'),
      Aparelho: `${s.deviceSnapshot.brand} ${s.deviceSnapshot.model} ${s.deviceSnapshot.storage||''}`.trim(),
      IMEI: s.deviceSnapshot.imei || '',
      'Valor original': s.originalPrice ?? s.deviceSnapshot.price ?? s.salePrice,
      Desconto: s.discount ?? (s.originalPrice ? s.originalPrice - s.salePrice : 0),
      'Valor final': s.salePrice,
      'Forma pagamento': s.paymentMethod || '',
      Parcelas: s.installments || '',
      Taxas: s.fees || 0,
      Lucro: s.profit,
      Status: s.isCanceled ? 'Cancelada' : 'Concluída',
      Observações: s.observations || '',
    }));
    exportExcelFromRows(rows, 'vendas-nexgest');
  }
  function exportClientesExcel() {
    const rows = storeClients.map(c => {
      const st = clientStats.get(c.id);
      return {
        Nome: c.name,
        Telefone: c.phone,
        CPF: c.cpf || '',
        'E-mail': c.email || '',
        Observações: c.notes || '',
        'Data cadastro': new Date(c.createdAt).toLocaleDateString('pt-BR'),
        'Qtd compras': st?.completed || 0,
      };
    });
    exportExcelFromRows(rows, 'clientes-nexgest');
  }
  function exportFinanceiroExcel() {
    const rows = transactions.filter(t=>t.storeId===store.id).map(t => ({
      Data: new Date(t.date).toLocaleDateString('pt-BR'),
      Tipo: t.type,
      Descrição: t.description,
      Categoria: t.type === 'expense' ? 'Despesa' : t.type === 'sale' ? 'Venda' : 'Estorno',
      Valor: t.amount,
      'Forma pagamento': '',
      'Referência venda': t.relatedSaleId || '',
      Status: t.type === 'reversal' ? 'Estorno' : 'Concluída',
    }));
    exportExcelFromRows(rows, 'financeiro-nexgest');
  }
  function downloadModeloExcel() {
    const rows = [
      { Marca: 'Apple', Modelo: 'iPhone 13', Armazenamento: '128GB', Cor: 'Preto', Condição: 'Seminovo', Quantidade: 1, Custo: 2800, 'Preço venda': 3599, IMEI: '356789123456789', Serial: 'C39X123', Bateria: 92, Fornecedor: 'Fornecedor A', 'Data entrada': new Date().toLocaleDateString('pt-BR'), Garantia: '90 dias', Observações: 'Com caixa' },
      { Marca: 'Samsung', Modelo: 'Galaxy S22', Armazenamento: '128GB', Cor: 'Branco', Condição: 'Novo', Quantidade: 2, Custo: 2100, 'Preço venda': 2899, IMEI: '', Serial: '', Bateria: 100, Fornecedor: 'Distribuidor', 'Data entrada': new Date().toLocaleDateString('pt-BR'), Garantia: '', Observações: 'Lote sem IMEI' },
    ];
    exportExcelFromRows(rows, 'modelo-importacao-estoque-nexgest');
  }
  function handleEstoqueExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportExcelFileName(file.name);
    const xlsx = getXLSX();
    if (!xlsx) { showToast('Biblioteca Excel não carregada, tente novamente'); if (e.target) e.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = reader.result as ArrayBuffer;
        const wb = xlsx.read(data, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const json: any[] = xlsx.utils.sheet_to_json(ws, { defval: '' });
        if (!json.length) { showToast('Planilha vazia'); return; }
        // validação
        const valid: any[] = [];
        const invalid: any[] = [];
        const errorsByRow: { row: number; errors: string[] }[] = [];
        const imeiSet = new Set<string>();
        let duplicateInSheet = 0;
        let duplicateInStock = 0;
        const existingImeis = new Set(storeDevices.map(d => (d.imei||'').trim()).filter(Boolean));
        json.forEach((row, idx) => {
          const rowNum = idx + 2;
          const errors: string[] = [];
          const marca = String(row['Marca'] || row['marca'] || '').trim();
          const modelo = String(row['Modelo'] || row['modelo'] || '').trim();
          if (!marca) errors.push('Marca obrigatória');
          if (!modelo) errors.push('Modelo obrigatório');
          const condRaw = String(row['Condição'] || row['Condicao'] || row['condição'] || row['condicao'] || '').trim();
          const validConds = ['Novo','Seminovo','Usado'];
          let cond = condRaw;
          if (condRaw && !validConds.includes(condRaw)) {
            const low = condRaw.toLowerCase();
            if (low.includes('novo')) cond = 'Novo';
            else if (low.includes('semi')) cond = 'Seminovo';
            else if (low.includes('usado')) cond = 'Usado';
            else errors.push(`Condição inválida: ${condRaw}`);
          }
          const bateriaRaw = row['Bateria'] ?? row['bateria'] ?? '';
          if (bateriaRaw !== '' && bateriaRaw !== null) {
            const b = Number(bateriaRaw);
            if (isNaN(b) || b < 0 || b > 100) errors.push('Bateria deve ser 0-100');
          }
          const custoRaw = row['Custo'] ?? row['custo'] ?? row['Custo compra'] ?? '';
          const precoRaw = row['Preço venda'] ?? row['Preco venda'] ?? row['preço venda'] ?? row['Preço'] ?? '';
          if (custoRaw !== '' && (isNaN(Number(custoRaw)) || Number(custoRaw) < 0)) errors.push('Custo inválido');
          if (precoRaw !== '' && (isNaN(Number(precoRaw)) || Number(precoRaw) < 0)) errors.push('Preço inválido');
          const imeiRaw = String(row['IMEI'] || row['imei'] || '').trim();
          if (imeiRaw) {
            if (imeiSet.has(imeiRaw)) { errors.push('IMEI duplicado na planilha'); duplicateInSheet++; }
            else imeiSet.add(imeiRaw);
            if (existingImeis.has(imeiRaw)) { errors.push('IMEI já existe no estoque'); duplicateInStock++; }
          }
          if (errors.length) {
            invalid.push({ ...row, __row: rowNum, __errors: errors });
            errorsByRow.push({ row: rowNum, errors });
          } else {
            valid.push({ ...row, __row: rowNum, __parsed: { marca, modelo, cond: cond || 'Seminovo' } });
          }
        });
        setImportPreview({ valid, invalid, duplicateInSheet, duplicateInStock, errorsByRow });
        setShowImportExcelModal(true);
      } catch (err) {
        console.warn(err);
        showToast('Erro ao ler planilha');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }
  function confirmImportExcel() {
    if (!importPreview) return;
    try {
      // === V2.4.2 LÓGICA REAL: valida limite antes de importar ===
      // TODO BACKEND: validar limite no Supabase com check_plan_limit() antes de inserir
      const limit = currentPlanLimit;
      const current = currentDeviceCount;
      const remaining = isFinite(limit) ? Math.max(0, limit - current) : Infinity;
      const toAdd: Device[] = [];
      importPreview.valid.forEach(r => {
        const quantidadeRaw = r['Quantidade'] ?? r['quantidade'] ?? 1;
        const qtd = Math.max(1, parseInt(String(quantidadeRaw)) || 1);
        const brand = String(r['Marca'] || r['marca'] || '').trim() || 'Outros';
        const model = String(r['Modelo'] || r['modelo'] || '').trim();
        const storage = String(r['Armazenamento'] || r['armazenamento'] || '128GB').trim();
        const color = String(r['Cor'] || r['cor'] || 'Preto').trim();
        const cond = (r.__parsed?.cond as DeviceCondition) || 'Seminovo';
        const batteryRaw = r['Bateria'] ?? '';
        const battery = batteryRaw === '' ? null : Number(batteryRaw);
        const imeiRaw = String(r['IMEI'] || '').trim();
        const serialRaw = String(r['Serial'] || '').trim();
        const cost = Number(r['Custo'] ?? 0) || 0;
        const price = Number(r['Preço venda'] ?? r['Preco venda'] ?? 0) || 0;
        const supplier = String(r['Fornecedor'] || '').trim();
        const notes = String(r['Observações'] || r['Observacoes'] || '').trim();
        const base: Device = {
          id: 'd_' + Math.random().toString(36).slice(2, 8),
          storeId: store.id,
          brand,
          model,
          storage,
          color,
          condition: cond,
          battery: battery !== null && !isNaN(battery) ? battery : null,
          imei: imeiRaw || null,
          serial: serialRaw || null,
          cost,
          price,
          status: 'Disponível',
          photoUrl: null,
          entryDate: new Date().toISOString(),
          notes: notes + (supplier ? ` | Fornecedor: ${supplier}` : ''),
          history: [createHistoryEntry('Cadastro', '-', `${brand} ${model}`, 'Importado via Excel')],
        };
        if (qtd > 1 && !imeiRaw) {
          for (let i = 0; i < qtd; i++) {
            toAdd.push({ ...base, id: 'd_' + Math.random().toString(36).slice(2, 8) });
          }
        } else {
          toAdd.push(base);
        }
      });
      if (isFinite(limit)) {
        if (current >= limit) {
          setShowLimitModal({ show: true, limit, current, plan: subscription.plan, attemptedCount: toAdd.length, isImport: true });
          return;
        }
        if (toAdd.length > remaining) {
          // importar parcial até limite e avisar
          const partial = toAdd.slice(0, remaining);
          setDevices(prev => [...partial, ...prev]);
          setImportSummary({ imported: partial.length, ignored: importPreview.invalid.length + (toAdd.length - partial.length), errors: importPreview.errorsByRow.length });
          setShowImportExcelModal(false);
          setImportPreview(null);
          setShowLimitModal({ show: true, limit, current, plan: subscription.plan, attemptedCount: toAdd.length, isImport: true });
          showToast(`Importado parcial ${partial.length}/${toAdd.length} • limite ${getPlanName(subscription.plan)} ${limit} atingido`);
          return;
        }
      }
      setDevices(prev => [...toAdd, ...prev]);
      setImportSummary({ imported: toAdd.length, ignored: importPreview.invalid.length, errors: importPreview.errorsByRow.length });
      setShowImportExcelModal(false);
      setImportPreview(null);
      showToast(`Importados ${toAdd.length} aparelhos • ${importPreview.invalid.length} ignorados`);
    } catch (e) {
      console.error(e);
      showToast('Erro ao importar');
    }
  }

  const costCount = useCountUp(totalCost);
  const saleCount = useCountUp(totalSale);
  const profitCount = useCountUp(potentialProfit);
  const fatCount = useCountUp(faturamento);

  const isAppView = isLogged && ['dashboard', 'estoque', 'add', 'edit', 'details', 'vendas', 'registrarVenda', 'financeiro', 'config', 'assinatura', 'clientes', 'clienteDetalhe', 'clienteForm'].includes(view);

  // === RENDER LANDING ===
  if (!isLogged && (view === 'landing' || view === 'login' || view === 'cadastro' || view === 'checkout' || view === 'onboarding' || view === 'planos' || view === 'termos' || view === 'privacidade' || view === 'politica-assinatura')) {
    // landing pages wrapper
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] selection:bg-[#2F6BFF]/30">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{font-family:Inter,system-ui,sans-serif} .grid-pattern{background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0); background-size: 28px 28px;} .no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none}`}</style>

        {/* HEADER LANDING */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F19]/80 border-b border-[#1E2D4A]">
          <div className="mx-auto max-w-[1120px] px-5 md:px-8 h-[64px] flex items-center justify-between">
            <div className="flex items-center gap-8">
              <LogoFull />
              <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#8B9BB4]">
                <a href="#funcionalidades" className="hover:text-white transition">Funcionalidades</a>
                <a href="#beneficios" className="hover:text-white transition">Benefícios</a>
                <a href="#preco" className="hover:text-white transition">Preço</a>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('login')} className="h-9 px-4 rounded-[12px] text-[13px] font-semibold text-[#8B9BB4] hover:text-white hover:bg-[#111B2E] transition">Entrar</button>
              <button onClick={(e) => { (e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true'); window.location.hash='cadastro'; setView('cadastro'); }} className="h-9 px-4 rounded-[12px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white text-[13px] font-bold shadow-[0_4px_16px_rgba(47,107,255,0.35)] transition-transform active:scale-[0.98]">Começar agora</button>
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden ml-1 w-9 h-9 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] flex items-center justify-center"><Menu className="w-4 h-4" /></button>
            </div>
          </div>
          {showMobileMenu && (
            <div className="md:hidden border-t border-[#1E2D4A] bg-[#0B0F19] px-5 py-4 space-y-3">
              <a href="#funcionalidades" className="block text-[14px] text-[#8B9BB4]">Funcionalidades</a>
              <a href="#beneficios" className="block text-[14px] text-[#8B9BB4]">Benefícios</a>
              <a href="#preco" className="block text-[14px] text-[#8B9BB4]">Preço</a>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setView('termos'); setShowMobileMenu(false); }} className="text-[12px] text-[#64748B]">Termos</button>
                <button onClick={() => { setView('privacidade'); setShowMobileMenu(false); }} className="text-[12px] text-[#64748B]">Privacidade</button>
              </div>
            </div>
          )}
        </header>

        {view === 'landing' && (
          <>
      {/* HERO */}
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-transparent to-[#0B0F19] pointer-events-none" />
              <div className="relative mx-auto max-w-[1120px] px-5 md:px-8 pt-12 md:pt-20 pb-12 md:pb-24 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-[#111B2E] border border-[#1E2D4A] text-[11px] font-semibold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" /> Novo • Gestão feita para lojas de celulares
                  </div>
                 <h1 className="mt-6 text-[32px] md:text-[48px] font-extrabold tracking-[-1.5px] leading-[0.95]">Controle total da sua loja de celulares</h1>
                  <p className="mt-4 text-[16px] md:text-[18px] leading-[1.5] text-[#8B9BB4] max-w-[520px]">Gestão de estoque por IMEI, controle de bateria, cálculo de lucro real e financeiro completo em uma plataforma desenvolvida para operação em dispositivos móveis.</p>
                 <div className="mt-8 flex flex-wrap gap-3">
                    <button type="button" data-testid="cta-hero-preco" onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true'); }} onMouseDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true'); e.currentTarget.setAttribute('data-clicked','true');}} onClick={(e) => { const btn=e.currentTarget as HTMLButtonElement; btn.setAttribute('data-clicked','true'); btn.setAttribute('data-feedback','preco'); btn.textContent='Confira nossos planos abaixo'; document.documentElement.setAttribute('data-last-action','hero-preco'); try{ window.location.hash='preco'; }catch{} showToast('Confira nossos planos abaixo'); try{ const el = document.getElementById('preco'); if(el){ el.scrollIntoView({behavior:'smooth'}); el.setAttribute('data-scrolled','true'); setTimeout(()=>{ btn.textContent='Começar agora - a partir de R$9,99/mês'; }, 1800); } }catch{} }} className="h-11 px-6 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] shadow-[0_8px_24px_rgba(47,107,255,0.35)] transition active:scale-[0.99] cursor-pointer">Começar agora - a partir de R$9,99/mês</button>
                    <button type="button" data-testid="cta-demo-login" onPointerDown={(e) => { (e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true'); }} onMouseDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onClick={(e) => { const btn=e.currentTarget as HTMLButtonElement; btn.setAttribute('data-clicked','true'); btn.setAttribute('data-feedback','login'); btn.textContent='Abrindo login...'; document.documentElement.setAttribute('data-last-action','demo-login'); try{ window.location.hash='login'; }catch{} showToast('Acesse com conta demo ou crie sua conta'); setView('login'); try{ window.scrollTo(0,0);}catch{} }} className="h-11 px-6 rounded-[14px] bg-[#111B2E] border border-[#1E2D4A] hover:bg-[#14213A] text-[#F1F5F9] font-semibold text-[14px] transition cursor-pointer">Ver demonstração</button>
                  </div>
                  <div className="mt-6 flex items-center gap-4 text-[12px] text-[#64748B]">
                    <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#16A34A]" /> 7 dias grátis</span>
                    <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#16A34A]" /> Sem fidelidade</span>
                    <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#16A34A]" /> Cancele quando quiser</span>
                  </div>
                </div>

                {/* MOCK DASHBOARD FLUTUANTE */}
                <div className="relative">
                  <div className="absolute -inset-6 bg-[#2F6BFF]/20 blur-[48px] rounded-[32px] pointer-events-none" />
                  <div className="relative rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] shadow-[0_24px_80px_rgba(0,0,0,0.5)] p-4 md:p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5"><LogoIcon size={28} /><span className="text-[13px] font-bold">Dashboard</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16A34A1A] text-[#16A34A] border border-[#16A34A22] font-bold">Ao vivo</span></div>
                      <div className="w-7 h-7 rounded-full bg-[#1A2744] flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#16A34A]" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Custo estoque</p><p className="text-[16px] font-bold mt-1">{fmtBRL(8540)}</p><p className="text-[11px] text-[#16A34A] mt-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> +12%</p></div>
                      <div className="rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Venda estoque</p><p className="text-[16px] font-bold mt-1">{fmtBRL(11995)}</p><p className="text-[11px] text-[#64748B] mt-1">6 aparelhos</p></div>
                      <div className="rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[10px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Faturamento</p><p className="text-[16px] font-bold mt-1">{fmtBRL(7797)}</p><p className="text-[11px] text-[#16A34A] mt-1">Este mês</p></div>
                      <div className="rounded-[14px] bg-[#2F6BFF] p-3 text-white"><p className="text-[10px] uppercase tracking-[0.8px] font-semibold opacity-80">Lucro potencial</p><p className="text-[16px] font-bold mt-1">{fmtBRL(3455)}</p><p className="text-[11px] opacity-80 mt-1">+41% margem</p></div>
                    </div>
                    <div className="rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] p-3">
                      <div className="flex justify-between items-center mb-3"><p className="text-[12px] font-semibold">Faturamento 7d</p><span className="text-[11px] text-[#8B9BB4]">R$ 7.797</span></div>
                      <div className="flex items-end gap-1.5 h-[48px]">
                        {[35, 60, 40, 85, 55, 90, 70].map((h, i) => (<div key={i} className="flex-1 rounded-full bg-[#2F6BFF]" style={{ height: `${h}%`, opacity: 0.4 + i * 0.08 }} />))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* BENEFICIOS */}
            <section id="beneficios" className="mx-auto max-w-[1120px] px-5 md:px-8 py-14 md:py-20">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: Smartphone, title: 'Controle por Unidade', desc: 'Cada aparelho com IMEI, bateria, fotos e histórico. Gestão individual completa, sem generalizações.' },
                  { icon: TrendingUp, title: 'Lucro Real', desc: 'Relação entre custo, venda e taxas. Visualize o lucro líquido de cada venda no momento da operação.' },
                  { icon: Zap, title: 'Otimizado para dispositivos móveis', desc: 'Projetado para atendimento no balcão, com interface ágil, busca rápida e ações em um toque.' },
                ].map((b, i) => (
                  <div key={i} className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6 hover:bg-[#14213A] transition">
                    <div className="w-10 h-10 rounded-[12px] bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center mb-4"><b.icon className="w-5 h-5 text-[#2F6BFF]" /></div>
                    <h3 className="text-[15px] font-bold tracking-[-0.2px]">{b.title}</h3>
                    <p className="text-[13px] text-[#8B9BB4] mt-2 leading-[1.5]">{b.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FUNCIONALIDADES */}
            <section id="funcionalidades" className="bg-[#0F1629] border-y border-[#1E2D4A]">
              <div className="mx-auto max-w-[1120px] px-5 md:px-8 py-14 md:py-20">
              <div className="max-w-[560px] mb-10">
                  <p className="text-[11px] font-bold tracking-[0.8px] uppercase text-[#2F6BFF]">Funcionalidades</p>
                  <h2 className="text-[26px] md:text-[32px] font-bold tracking-[-0.8px] leading-[1.1] mt-2">Tudo que sua loja precisa, sem excesso</h2>
                  <p className="text-[14px] text-[#8B9BB4] mt-3">Plataforma completa com interface intuitiva, desenvolvida para simplificar a gestão diária da sua loja.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: Boxes, title: 'Estoque inteligente', desc: 'Fotos, IMEI, bateria, condição e margem. Cards no celular, tabela no desktop.' },
                    { icon: Receipt, title: 'Vendas integradas', desc: 'Ao vender, estoque atualiza automaticamente, histórico é preservado e financeiro calcula lucro.' },
                    { icon: Wallet, title: 'Financeiro real', desc: 'Faturamento, despesas, lucro bruto e líquido estimado por período.' },
                    { icon: BarChart3, title: 'Relatórios', desc: 'Faturamento por dia, lucro, estoque por marca, produtos mais vendidos.' },
                    { icon: Battery, title: 'Saúde bateria', desc: '0-59% vermelho recomendar troca, 60-79% atenção, 80-89% bom, 90-100% excelente.' },
                    { icon: Shield, title: 'IMEI seguro', desc: 'Opcional, mas com validação de duplicidade por loja e cópia rápida.' },
                  ].map((f, i) => (
                    <div key={i} className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5 flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center shrink-0"><f.icon className="w-5 h-5 text-[#8B9BB4]" /></div>
                      <div><p className="text-[14px] font-semibold">{f.title}</p><p className="text-[13px] text-[#8B9BB4] mt-1 leading-[1.4]">{f.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* PREÇO - V2.4.3 Básico 9,99 / Pro 29,90 / Premium 59,90 */}
            <section id="preco" className="mx-auto max-w-[1120px] px-5 md:px-8 py-14 md:py-24">
              <div className="max-w-[1160px] mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-[28px] md:text-[36px] font-extrabold tracking-[-1px]">Escolha o plano ideal</h2>
                  <p className="text-[14px] text-[#8B9BB4] mt-3">Comece com 7 dias grátis. Sem fidelidade. Transparência total.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4 items-stretch">
                  {/* BÁSICO R$9,99 */}
                  <div className="rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-6 md:p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-[12px] bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center"><Boxes className="w-5 h-5 text-[#8B9BB4]" /></div>
                      <div><p className="text-[18px] font-bold">Básico</p><p className="text-[12px] text-[#8B9BB4]">Ideal para começar</p></div>
                    </div>
                    <p className="text-[12px] text-[#8B9BB4] leading-[1.4] mb-4">Um plano de entrada, muito básico, para quem está começando.</p>
                    <div className="flex items-baseline gap-2 mb-6"><span className="text-[36px] font-extrabold tracking-[-1.5px]">R$ 9,99</span><span className="text-[14px] text-[#8B9BB4]">/mês</span></div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {['Cadastro de até 10 celulares','Controle básico de estoque','Registro de preço de compra e venda','Visualização de lucro','Controle de aparelhos vendidos'].map((it, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.4]"><span className="w-5 h-5 rounded-full bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5 text-[#8B9BB4]" /></span><span>{it}</span></li>
                      ))}
                    </ul>
                    <button type="button" data-testid="plan-basico" disabled={isLoadingPlan==='basico'} onPointerDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onMouseDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onClick={(e)=>{ const btn=e.currentTarget as HTMLButtonElement; btn.setAttribute('data-clicked','true'); btn.setAttribute('data-feedback','basico'); btn.textContent='Carregando...'; document.documentElement.setAttribute('data-last-action','plan-basico'); try{ window.location.hash='cadastro'; }catch{} setSelectedPlan('basico'); setIsLoadingPlan('basico'); showToast('Plano Básico R$9,99 selecionado'); setTimeout(()=>{ setView('cadastro'); try{ window.scrollTo(0,0);}catch{} }, 150); setTimeout(()=>setIsLoadingPlan(null), 1300); }} className="w-full h-11 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] hover:bg-[#14213A] text-white font-bold text-[14px] transition active:scale-[0.99] cursor-pointer disabled:opacity-60">{isLoadingPlan==='basico' ? 'Carregando...' : 'Começar com Básico'}</button>
                    <p className="text-center text-[11px] text-[#64748B] mt-3">7 dias grátis • Sem fidelidade</p>
                  </div>
                  {/* PRO R$29,90 - MAIS POPULAR */}
                  <div className="rounded-[20px] bg-[#111B2E] border-2 border-[#2F6BFF] shadow-[0_0_0_8px_rgba(47,107,255,0.08),0_24px_64px_rgba(0,0,0,0.4)] p-6 md:p-6 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 bg-[#2F6BFF] text-white text-[10px] font-bold px-3 py-1 rounded-bl-[12px] rounded-tr-[18px] tracking-wide uppercase">Mais popular</div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-[12px] bg-[#2F6BFF] flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
                      <div><p className="text-[18px] font-bold flex items-center gap-2">Pro <span className="bg-[#2F6BFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Mais popular</span></p><p className="text-[12px] text-[#8B9BB4]">Para lojas que querem crescer</p></div>
                    </div>
                    <p className="text-[12px] text-[#8B9BB4] leading-[1.4] mb-4">Para lojistas que já trabalham com um estoque maior.</p>
                    <div className="flex items-baseline gap-2 mb-6"><span className="text-[36px] font-extrabold tracking-[-1.5px]">R$ 29,90</span><span className="text-[14px] text-[#8B9BB4]">/mês</span></div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {['Cadastro de até 50 celulares','Todos os recursos do Básico','Controle de estoque mais completo','Histórico de vendas','Relatórios de lucro e movimentação','Organização dos aparelhos por status'].map((it, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.4]"><span className="w-5 h-5 rounded-full bg-[#16A34A1A] border border-[#16A34A22] flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5 text-[#16A34A]" /></span><span>{it}</span></li>
                      ))}
                    </ul>
                    <button type="button" data-testid="plan-profissional" disabled={isLoadingPlan==='profissional'} onPointerDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onMouseDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onClick={(e)=>{ const btn=e.currentTarget as HTMLButtonElement; btn.setAttribute('data-clicked','true'); btn.setAttribute('data-feedback','profissional'); btn.textContent='Carregando...'; document.documentElement.setAttribute('data-last-action','plan-profissional'); try{ window.location.hash='cadastro'; }catch{} setSelectedPlan('profissional'); setIsLoadingPlan('profissional'); showToast('Plano Pro R$29,90 selecionado'); setTimeout(()=>{ setView('cadastro'); try{ window.scrollTo(0,0);}catch{} }, 150); setTimeout(()=>setIsLoadingPlan(null), 1300); }} className="w-full h-11 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] shadow-[0_8px_24px_rgba(47,107,255,0.35)] transition active:scale-[0.99] cursor-pointer disabled:opacity-60">{isLoadingPlan==='profissional' ? 'Carregando...' : 'Começar com Pro'}</button>
                    <p className="text-center text-[11px] text-[#64748B] mt-3">7 dias grátis • Sem fidelidade • Mais popular</p>
                  </div>
                  {/* PREMIUM R$59,90 */}
                  <div className="rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-6 md:p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-[12px] bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center"><Layers className="w-5 h-5 text-[#8B9BB4]" /></div>
                      <div><p className="text-[18px] font-bold">Premium</p><p className="text-[12px] text-[#8B9BB4]">Sem limites</p></div>
                    </div>
                    <p className="text-[12px] text-[#8B9BB4] leading-[1.4] mb-4">Para quem quer trabalhar com estoque maior, sem ficar limitado.</p>
                    <div className="flex items-baseline gap-2 mb-6"><span className="text-[36px] font-extrabold tracking-[-1.5px]">R$ 59,90</span><span className="text-[14px] text-[#8B9BB4]">/mês</span></div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {['Estoque ilimitado','Todos os recursos do Pro','Relatórios completos','Mais liberdade para cadastrar aparelhos','Acesso aos recursos avançados que forem adicionados ao sistema'].map((it, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.4]"><span className="w-5 h-5 rounded-full bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5 text-[#8B9BB4]" /></span><span>{it}</span></li>
                      ))}
                    </ul>
                    <button type="button" data-testid="plan-premium" disabled={isLoadingPlan==='premium'} onPointerDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onMouseDown={(e)=>{(e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true');}} onClick={(e)=>{ const btn=e.currentTarget as HTMLButtonElement; btn.setAttribute('data-clicked','true'); btn.setAttribute('data-feedback','premium'); btn.textContent='Carregando...'; document.documentElement.setAttribute('data-last-action','plan-premium'); try{ window.location.hash='cadastro'; }catch{} setSelectedPlan('premium'); setIsLoadingPlan('premium'); showToast('Plano Premium R$59,90 selecionado'); setTimeout(()=>{ setView('cadastro'); try{ window.scrollTo(0,0);}catch{} }, 150); setTimeout(()=>setIsLoadingPlan(null), 1300); }} className="w-full h-11 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] hover:bg-[#14213A] text-white font-bold text-[14px] transition active:scale-[0.99] cursor-pointer disabled:opacity-60">{isLoadingPlan==='premium' ? 'Carregando...' : 'Começar com Premium'}</button>
                    <p className="text-center text-[11px] text-[#64748B] mt-3">7 dias grátis • Sem fidelidade</p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA FINAL + FOOTER */}
            <section className="bg-[#111B2E] border-t border-[#1E2D4A]">
              <div className="mx-auto max-w-[1120px] px-5 md:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
                <div><h3 className="text-[20px] font-bold tracking-[-0.5px]">Pronto para organizar sua loja?</h3><p className="text-[13px] text-[#8B9BB4] mt-1">Em 2 minutos você já está vendendo com controle total.</p></div>
                <button onClick={(e) => { (e.currentTarget as HTMLButtonElement).setAttribute('data-clicked','true'); window.location.hash='cadastro'; setView('cadastro'); }} className="h-11 px-6 rounded-[14px] bg-white text-[#0B0F19] font-bold text-[14px] hover:bg-[#F1F5F9] transition">Começar agora</button>
              </div>
              <footer className="border-t border-[#1E2D4A] py-8">
                <div className="mx-auto max-w-[1120px] px-5 md:px-8 flex flex-col md:flex-row gap-6 justify-between">
                  <div>
                    <LogoFull />
                    <p className="text-[12px] text-[#64748B] mt-3 max-w-[360px] leading-[1.5]">Plataforma de gestão para lojas de celulares. Controle de estoque, vendas e financeiro em um sistema completo e profissional.</p>
                  </div>
                  <div className="flex gap-10 text-[12px]">
                    <div className="space-y-2"><p className="font-bold text-[#F1F5F9]">Produto</p><button onClick={() => setView('planos')} className="block text-[#8B9BB4] hover:text-white">Planos</button><button onClick={() => setView('login')} className="block text-[#8B9BB4] hover:text-white">Entrar</button></div>
                    <div className="space-y-2"><p className="font-bold text-[#F1F5F9]">Legal</p><button onClick={() => setView('termos')} className="block text-[#8B9BB4] hover:text-white">Termos de Uso</button><button onClick={() => setView('privacidade')} className="block text-[#8B9BB4] hover:text-white">Privacidade</button><button onClick={() => setView('politica-assinatura')} className="block text-[#8B9BB4] hover:text-white">Assinatura</button></div>
                    <div className="space-y-2"><p className="font-bold text-[#F1F5F9]">Contato</p><span className="flex items-center gap-1.5 text-[#8B9BB4]"><Mail className="w-3.5 h-3.5" /> contato@nexgest.app</span><span className="flex items-center gap-1.5 text-[#8B9BB4]"><Phone className="w-3.5 h-3.5" /> Suporte prioritário</span></div>
                  </div>
                </div>
                <div className="mx-auto max-w-[1120px] px-5 md:px-8 mt-8 pt-6 border-t border-[#1E2D4A] flex flex-col md:flex-row justify-between gap-2 text-[11px] text-[#475569]">
                  <span>© {new Date().getFullYear()} NexGest. Todos os direitos reservados. Modelo inicial — revisar com jurídico.</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Sistema operacional</span>
                </div>
              </footer>
            </section>
          </>
        )}

        {/* AUTH VIEWS */}
        {view === 'login' && (
          <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-[400px] rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
              <LogoFull />
              <h1 className="text-[20px] font-bold tracking-[-0.5px] mt-6">Entrar na sua conta</h1>
              <p className="text-[13px] text-[#8B9BB4] mt-1">Use o acesso demo para ver o dashboard real.</p>
              <div className="mt-6 space-y-3">
                <input placeholder="Email" className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" defaultValue="rafael@cellprime.com" />
                <input placeholder="Senha" type="password" className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" defaultValue="123456" />
                <button onClick={handleLogin} className="w-full h-11 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] transition active:scale-[0.99]">Entrar</button>
                <button onClick={() => setView('cadastro')} className="w-full h-11 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[#F1F5F9] font-semibold text-[14px]">Criar conta</button>
                <div className="pt-3 flex justify-center gap-4 text-[11px]"><button onClick={() => setView('termos')} className="text-[#64748B] hover:text-white">Termos</button><button onClick={() => setView('privacidade')} className="text-[#64748B] hover:text-white">Privacidade</button></div>
              </div>
            </div>
          </div>
        )}

        {view === 'cadastro' && (
          <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-[440px] rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">
              <LogoFull />
              <h1 className="text-[20px] font-bold tracking-[-0.5px] mt-6">Crie sua loja em 1 minuto</h1>
              <div className="mt-6 space-y-3">
                <input value={cadastroForm.loja} onChange={e => setCadastroForm({ ...cadastroForm, loja: e.target.value })} placeholder="Nome da loja" className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                <input value={cadastroForm.nome} onChange={e => setCadastroForm({ ...cadastroForm, nome: e.target.value })} placeholder="Seu nome" className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                <input value={cadastroForm.email} onChange={e => setCadastroForm({ ...cadastroForm, email: e.target.value })} placeholder="Email" className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                <input value={cadastroForm.senha} onChange={e => setCadastroForm({ ...cadastroForm, senha: e.target.value })} placeholder="Senha" type="password" className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                <label className="flex gap-2.5 items-start pt-2">
                  <input type="checkbox" checked={cadastroForm.termos} onChange={e => setCadastroForm({ ...cadastroForm, termos: e.target.checked })} className="mt-1 accent-[#2F6BFF]" />
                  <span className="text-[11px] text-[#8B9BB4] leading-[1.4]">Li e aceito os <button onClick={() => setView('termos')} className="underline text-[#F1F5F9]">Termos de Uso</button> e <button onClick={() => setView('privacidade')} className="underline text-[#F1F5F9]">Política de Privacidade</button>. Texto modelo — revisar com jurídico.</span>
                </label>
                <button onClick={handleCadastro} className="w-full h-11 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] mt-2 transition active:scale-[0.99]">Continuar para pagamento</button>
                <p className="text-center text-[11px] text-[#64748B]">Já tem conta? <button onClick={() => setView('login')} className="text-[#2F6BFF] font-semibold">Entrar</button></p>
              </div>
            </div>
          </div>
        )}

        {view === 'checkout' && (
          <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-[960px] grid md:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-7">
                <h2 className="text-[18px] font-bold">Checkout — Plano {PLAN_LABELS[selectedPlan] || 'Pro'}</h2>
                <p className="text-[13px] text-[#8B9BB4] mt-1">{fmtBRL(PLAN_PRICES[selectedPlan] || 29.90)}/mês • 7 dias grátis • Cancele quando quiser</p>
                <div className="mt-6 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                  <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-[#8B9BB4]">Resumo</p>
                  <div className="flex justify-between mt-3 text-[14px]"><span>Plano {PLAN_LABELS[selectedPlan] || 'Pro'}</span><span className="font-bold">{fmtBRL(PLAN_PRICES[selectedPlan] || 29.90)}/mês</span></div>
                  <div className="flex justify-between mt-2 text-[13px] text-[#8B9BB4]"><span>Trial 7 dias</span><span className="text-[#16A34A] font-semibold">Grátis hoje</span></div>
                  <div className="h-px bg-[#1E2D4A] my-3" />
                  <div className="flex justify-between text-[14px] font-bold"><span>Total hoje</span><span className="text-[#16A34A]">R$ 0,00</span></div>
                </div>
                <div className="mt-6 rounded-[14px] bg-[#0B0F19] border border-[#2F6BFF]/30 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-bold"><CreditCard className="w-4 h-4 text-[#2F6BFF]" /> Pix — preparado para produção</div>
                  <p className="text-[11px] text-[#8B9BB4] mt-2 leading-[1.5]">Integração via Stripe / Gerencianet. Webhook <code className="px-1.5 py-0.5 rounded bg-[#1A2744] border border-[#1E2D4A] text-[11px]">/api/webhooks/pix</code> confirmará pagamento e liberará acesso com <code className="px-1 py-0.5 rounded bg-[#1A2744]">verified=true</code>. Hoje é simulação segura local.</p>
                  <div className="mt-4 grid place-items-center rounded-[12px] bg-white p-4">
                    <div className="w-28 h-28 rounded-[8px] bg-[repeating-linear-gradient(45deg,#000 0 4px,#fff 4px 8px)] opacity-20" />
                    <p className="text-[10px] text-black mt-2 font-mono">QR CODE MOCK</p>
                  </div>
                </div>
                <div className="mt-6 rounded-[12px] bg-[#F59E0B12] border border-[#F59E0B22] p-3 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#F59E0B] leading-[1.4]"><b>DEMO:</b> Este pagamento é simulado. Não processa Pix real. Acesso real deve ser validado no backend via webhook assinado. Variável <code>verified=false</code> indica modo demonstração.</p>
                </div>
              </div>
              <div className="rounded-[20px] bg-[#0F1629] border border-[#1E2D4A] p-7 flex flex-col">
                <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-[#8B9BB4]">Confirmar</p>
                <h3 className="text-[18px] font-bold mt-2">Tudo pronto para começar</h3>
                <ul className="mt-4 space-y-2.5 text-[13px] text-[#8B9BB4]">
                  <li className="flex gap-2"><Check className="w-4 h-4 text-[#16A34A] shrink-0" /> Acesso imediato ao dashboard real</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-[#16A34A] shrink-0" /> Dados locais por enquanto (localStorage)</li>
                  <li className="flex gap-2"><Check className="w-4 h-4 text-[#16A34A] shrink-0" /> 7 dias grátis, depois {fmtBRL(PLAN_PRICES[selectedPlan] || 29.90)}/mês</li>
                </ul>
                <button onClick={handleSimularPix} className="mt-auto w-full h-12 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] shadow-[0_8px_24px_rgba(47,107,255,0.35)] transition active:scale-[0.99]">Simular pagamento Pix (DEMO)</button>
                <p className="text-[10px] text-[#64748B] text-center mt-3">TODO BACKEND: Substituir por Stripe Checkout + webhook que seta subscription verified=true no Supabase RLS por storeId.</p>
                <button onClick={() => setView('landing')} className="mt-3 text-[12px] text-[#8B9BB4] hover:text-white">Voltar</button>
              </div>
            </div>
          </div>
        )}

        {view === 'onboarding' && (
          <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-[480px] rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-7">
              <div className="w-12 h-12 rounded-[14px] bg-[#16A34A1A] border border-[#16A34A22] flex items-center justify-center mb-4"><CheckCircle2 className="w-6 h-6 text-[#16A34A]" /></div>
              <h1 className="text-[20px] font-bold">Tudo pronto, {cadastroForm.nome || 'lojista'}!</h1>
              <p className="text-[13px] text-[#8B9BB4] mt-1">Sua assinatura Pro está ativa (DEMO verified=false). Vamos configurar sua loja.</p>
              <div className="mt-6 space-y-3">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Nome da loja</label>
                <input value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} className="w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                <div className="rounded-[12px] bg-[#0B0F19] border border-dashed border-[#1E2D4A] p-6 text-center">
                  <p className="text-[13px] font-semibold">Logo da loja (opcional)</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Em produção, upload para Supabase Storage por storeId</p>
                  <button className="mt-3 h-8 px-4 rounded-[10px] bg-[#111B2E] border border-[#1E2D4A] text-[12px] font-semibold">Enviar logo (em breve)</button>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => { setIsLogged(true); setView('dashboard'); }} className="flex-1 h-11 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] transition">Ir para dashboard</button>
                <button onClick={() => { setIsLogged(true); setView('dashboard'); }} className="h-11 px-5 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Pular</button>
              </div>
              <p className="text-[10px] text-[#475569] mt-4 text-center">Guardado em <code>nexgest_subscriptions</code> com <code>verified:false</code> — acesso real exige webhook backend.</p>
            </div>
          </div>
        )}

        {(view === 'termos' || view === 'privacidade' || view === 'politica-assinatura' || view === 'planos') && (
          <div className="mx-auto max-w-[760px] px-5 md:px-8 py-10">
            <button onClick={() => setView('landing')} className="inline-flex items-center gap-1.5 text-[13px] text-[#8B9BB4] hover:text-white mb-6"><ChevronRight className="w-4 h-4 rotate-180" /> Voltar</button>
            <div className="rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-7 md:p-9">
              {view === 'termos' && (
                <>
                  <h1 className="text-[22px] font-bold tracking-[-0.5px]">Termos de Uso</h1>
                  <p className="text-[11px] text-[#F59E0B] mt-2 bg-[#F59E0B12] border border-[#F59E0B22] rounded-[10px] px-3 py-2">Modelo inicial — revisar com jurídico antes do lançamento comercial. Não constitui garantia jurídica completa.</p>
                  <div className="prose prose-invert prose-sm mt-6 text-[13px] leading-[1.6] text-[#8B9BB4] space-y-4">
                    <p>1. O NexGest é um SaaS de gestão para lojas de celulares. Ao criar conta, você concorda em usar o sistema de forma lícita.</p>
                    <p>2. Planos oficiais: Básico R$9,99/mês, Pro R$29,90/mês e Premium R$59,90/mês, cobrança via Pix/Cartão. Trial 7 dias. Sem fidelidade.</p>
                    <p>3. Você é responsável pelos dados de estoque, IMEI e vendas lançados.</p>
                    <p>4. Não nos responsabilizamos por perda de dados enquanto estiver em localStorage (versão demo). Backup em nuvem em desenvolvimento.</p>
                    <p>5. Suporte prioritário em horário comercial.</p>
                  </div>
                </>
              )}
              {view === 'privacidade' && (
                <>
                  <h1 className="text-[22px] font-bold">Política de Privacidade</h1>
                  <p className="text-[11px] text-[#F59E0B] mt-2 bg-[#F59E0B12] border border-[#F59E0B22] rounded-[10px] px-3 py-2">Modelo inicial — revisar com jurídico. Adequar à LGPD.</p>
                  <div className="mt-6 space-y-4 text-[13px] text-[#8B9BB4] leading-[1.6]">
                    <p>Coletamos nome, email, dados da loja e estoque. IMEI é opcional e criptografado em produção futura.</p>
                    <p>Dados isolados por storeId com RLS no Supabase (planejado). Sem compartilhamento com terceiros.</p>
                    <p>Você pode solicitar exclusão da conta a qualquer momento.</p>
                  </div>
                </>
              )}
              {view === 'politica-assinatura' && (
                <>
                  <h1 className="text-[22px] font-bold">Política de Assinatura e Cancelamento</h1>
                  <div className="mt-6 space-y-4 text-[13px] text-[#8B9BB4] leading-[1.6]">
                    <p>Assinatura mensal: Básico R$9,99, Pro R$29,90 e Premium R$59,90. Renovação automática. Cancelamento a qualquer momento sem multa, acesso até fim do ciclo.</p>
                    <p>Reembolso em até 7 dias conforme CDC para compras online.</p>
                    <p>Em caso de inadimplência, acesso bloqueado após 3 dias, dados mantidos por 30 dias.</p>
                  </div>
                </>
              )}
              {view === 'planos' && (
                <>
                  <h1 className="text-[22px] font-bold">Planos</h1>
                  <p className="text-[13px] text-[#8B9BB4] mt-2">Básico R$9,99/mês • até 10 aparelhos • Pro R$29,90/mês • até 50 aparelhos • Premium R$59,90/mês • ilimitado • 7 dias grátis em todos.</p>
                </>
              )}
            </div>
          </div>
        )}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-[#111B2E] border border-[#1E2D4A] shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-[13px] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> {toast}
          </div>
        )}
      </div>
    );
  }

  // === APP LOGADO ===
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F1F5F9] selection:bg-[#2F6BFF]/30 overflow-x-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{font-family:Inter,system-ui,sans-serif} .no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none; scrollbar-width:none}`}</style>

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[240px] bg-[#0F1629] border-r border-[#1E2D4A] flex-col z-30">
        <div className="h-[64px] px-5 flex items-center border-b border-[#1E2D4A]"><LogoFull /></div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Início', icon: Home },
            { id: 'estoque', label: 'Estoque', icon: Package },
            { id: 'vendas', label: 'Vendas', icon: Receipt },
            { id: 'financeiro', label: 'Financeiro', icon: Wallet },
            { id: 'config', label: 'Configurações', icon: Settings },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id as any)} className={`w-full flex items-center gap-3 h-10 px-3 rounded-[12px] text-[13px] font-medium transition ${view === item.id ? 'bg-[#111B2E] text-white border border-[#1E2D4A]' : 'text-[#8B9BB4] hover:text-white hover:bg-[#111B2E]/60'}`}>
              <item.icon className="w-[18px] h-[18px]" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1E2D4A] space-y-3">
          <div className="rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] p-3">
            <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-[10px] bg-[#2F6BFF] flex items-center justify-center text-white font-bold text-[12px]">{store.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="text-[13px] font-semibold truncate">{store.name}</p><p className="text-[11px] text-[#8B9BB4] truncate">{store.owner}</p></div></div>
            <div className="mt-2.5 flex items-center gap-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${subscription.verified ? 'bg-[#16A34A14] text-[#16A34A] border-[#16A34A22]' : 'bg-[#F59E0B14] text-[#F59E0B] border-[#F59E0B22]'}`}>{subscription.status.toUpperCase()} {subscription.verified ? '✓' : 'DEMO'}</span><span className="text-[11px] text-[#64748B]">{fmtBRL(subscription.price || PLAN_PRICES[subscription.plan] || 29.90)}</span></div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 h-9 px-3 rounded-[12px] text-[12px] text-[#8B9BB4] hover:text-white hover:bg-[#111B2E] transition"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="md:pl-[240px] pb-[84px] md:pb-0 min-h-screen">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-20 bg-[#0B0F19]/85 backdrop-blur-xl border-b border-[#1E2D4A]">
          <div className="px-5 md:px-8 h-[64px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden"><LogoIcon size={32} /></div>
              <div className="min-w-0">
                <h1 className="text-[16px] md:text-[20px] font-bold tracking-[-0.5px] truncate">
                  {view === 'dashboard' && `Olá, ${store.owner.split(' ')[0]} 👋`}
                  {view === 'estoque' && 'Estoque'}
                  {view === 'add' && 'Novo aparelho'}
                  {view === 'edit' && 'Editar aparelho'}
                  {view === 'details' && 'Detalhes'}
                  {view === 'vendas' && 'Vendas'}
                  {view === 'registrarVenda' && 'Registrar venda'}
                  {view === 'financeiro' && 'Financeiro'}
                  {view === 'config' && 'Configurações'}
                  {view === 'assinatura' && 'Assinatura'}
                  {view === 'clientes' && 'Clientes'}
                  {view === 'clienteDetalhe' && 'Detalhe cliente'}
                  {view === 'clienteForm' && (editingClient ? 'Editar cliente' : 'Novo cliente')}
                </h1>
                {view === 'dashboard' && <p className="text-[12px] text-[#8B9BB4] hidden md:block">Visão geral da sua loja hoje</p>}
                {(view === 'clientes' || view === 'vendas') && salesSubTab === 'clientes' && <p className="text-[12px] text-[#8B9BB4] hidden md:block">{storeClients.length} clientes cadastrados</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {bateriasAtencao.length > 0 && view === 'dashboard' && (
                <div className="hidden md:flex items-center gap-2 h-8 px-3 rounded-full bg-[#EF444412] border border-[#EF444422] text-[11px] font-semibold text-[#EF4444]"><AlertTriangle className="w-4 h-4" /> {bateriasAtencao.length} baterias &lt;80%</div>
              )}
              <div className="hidden md:flex items-center gap-2 h-8 px-3 rounded-full bg-[#111B2E] border border-[#1E2D4A] text-[11px]"><Store className="w-3.5 h-3.5 text-[#8B9BB4]" /> {store.name}</div>
              <button onClick={() => setView('config')} className="w-9 h-9 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] flex items-center justify-center"><Settings className="w-4 h-4 text-[#8B9BB4]" /></button>
            </div>
          </div>
        </header>

        <div className="px-5 md:px-8 py-6 md:py-8 max-w-[1320px] mx-auto">

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
              {/* Row1 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatCard icon={Boxes} label="Custo estoque" value={fmtBRL(Math.round(costCount))} sub={`${qtdDisp} aparelhos`} accent="#2F6BFF" />
                <StatCard icon={Tag} label="Venda estoque" value={fmtBRL(Math.round(saleCount))} sub={`Margem média ${totalCost ? Math.round((potentialProfit / totalSale) * 100) : 0}%`} accent="#7C3AED" />
                <StatCard icon={TrendingUp} label="Lucro potencial" value={fmtBRL(Math.round(profitCount))} trend="up" sub="+8% mês" />
                <StatCard icon={Package} label="Disponíveis" value={`${qtdDisp}`} sub={`${qtdVendido} vendidos`} />
              </div>

              {/* Row2 */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[14px] font-bold tracking-[-0.2px]">Financeiro do período</h2>
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#111B2E] border border-[#1E2D4A] overflow-x-auto no-scrollbar">
                  {([
                    { id: 'hoje', label: 'Hoje' },
                    { id: '7d', label: '7 dias' },
                    { id: 'mes', label: 'Este mês' },
                    { id: '90d', label: '90 dias' },
                    { id: 'todas', label: 'Todas' },
                  ] as const).map(p => (
                    <button key={p.id} onClick={() => setFilterPeriod(p.id as any)} className={`h-7 px-3.5 rounded-full text-[12px] font-semibold transition whitespace-nowrap shrink-0 ${filterPeriod === p.id ? 'bg-[#2F6BFF] text-white shadow' : 'text-[#8B9BB4] hover:text-white'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4"><p className="text-[11px] uppercase font-semibold tracking-[0.8px] text-[#8B9BB4]">Faturamento</p><p className="text-[20px] font-bold mt-1">{fmtBRL(Math.round(fatCount))}</p><p className="text-[11px] text-[#8B9BB4] mt-1">{filteredSales.length} vendas no período</p></div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4"><p className="text-[11px] uppercase font-semibold tracking-[0.8px] text-[#8B9BB4]">Lucro bruto</p><p className="text-[20px] font-bold mt-1 text-[#16A34A]">{fmtBRL(lucroBruto)}</p><p className="text-[11px] text-[#8B9BB4] mt-1">Antes de despesas</p></div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4"><p className="text-[11px] uppercase font-semibold tracking-[0.8px] text-[#8B9BB4]">Despesas</p><p className="text-[20px] font-bold mt-1 text-[#EF4444]">{fmtBRL(despesas)}</p><p className="text-[11px] text-[#8B9BB4] mt-1">Aluguel, taxas</p></div>
                <div className="rounded-[16px] bg-[#2F6BFF] p-4 text-white"><p className="text-[11px] uppercase font-semibold tracking-[0.8px] opacity-80">Lucro líquido</p><p className="text-[20px] font-bold mt-1">{fmtBRL(lucroLiquido)}</p><p className="text-[11px] opacity-80 mt-1">Estimado período</p></div>
              </div>

              {/* Row3 Charts reais */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-[13px] font-semibold">Faturamento por período</h3><BarChart3 className="w-4 h-4 text-[#8B9BB4]" /></div>
                  <ChartBar data={faturamentoPorDia} color="#2F6BFF" />
                </div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-[13px] font-semibold">Lucro por período</h3><TrendingUp className="w-4 h-4 text-[#16A34A]" /></div>
                  <ChartBar data={lucroPorDia} color="#16A34A" />
                </div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-[13px] font-semibold">Estoque por marca</h3><Layers className="w-4 h-4 text-[#8B9BB4]" /></div>
                  {estoquePorMarca.length === 0 ? (
                    <div className="py-10 text-center"><div className="w-10 h-10 rounded-full bg-[#1E2D4A] mx-auto flex items-center justify-center mb-2"><Boxes className="w-5 h-5 text-[#8B9BB4]" /></div><p className="text-[12px] text-[#8B9BB4]">Sem aparelhos</p></div>
                  ) : (
                    <div className="space-y-3">
                      {estoquePorMarca.map(m => (
                        <div key={m.label} className="flex items-center gap-3">
                          <span className="text-[12px] font-medium w-20">{m.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-[#1A2744] overflow-hidden"><div className="h-full bg-[#7C3AED] rounded-full transition-all duration-700" style={{ width: `${m.pct}%` }} /></div>
                          <span className="text-[11px] font-bold text-[#8B9BB4] w-8 text-right">{m.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Vendas por marca</p>
                    <ChartBar data={vendasPorMarca} color="#7C3AED" />
                  </div>
                </div>
              </div>

              {/* Row4 */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                  <h3 className="text-[13px] font-semibold mb-4">Produtos mais vendidos</h3>
                  {topProdutos.length === 0 ? <p className="text-[12px] text-[#8B9BB4]">Sem vendas ainda</p> : (
                    <div className="space-y-3">
                      {topProdutos.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center text-[11px] font-bold">#{i + 1}</div>
                          <div className="flex-1 min-w-0"><p className="text-[13px] font-medium truncate">{p.label}</p><p className="text-[11px] text-[#8B9BB4]">{p.count} vendas • {fmtBRL(p.total)}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                  <h3 className="text-[13px] font-semibold mb-1">Estoque parado &gt;30 dias</h3>
                  <p className="text-[11px] text-[#8B9BB4] mb-4">{estoqueParado.length} aparelhos — considere promoção</p>
                  {estoqueParado.length === 0 ? <div className="py-6 text-center"><CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2" /><p className="text-[12px] text-[#8B9BB4]">Estoque girando bem!</p></div> : (
                    <div className="space-y-2">
                      {estoqueParado.slice(0, 4).map(d => (
                        <div key={d.id} className="flex items-center justify-between text-[12px]"><span className="truncate">{d.brand} {d.model} {d.storage}</span><span className="text-[#8B9BB4]">{Math.floor((Date.now() - new Date(d.entryDate).getTime()) / 86400000)}d</span></div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#EF4444]/20 p-5">
                  <h3 className="text-[13px] font-semibold mb-1 flex items-center gap-2"><Battery className="w-4 h-4 text-[#EF4444]" /> Baterias atenção &lt;80%</h3>
                  <p className="text-[11px] text-[#8B9BB4] mb-4">{bateriasAtencao.length} aparelhos precisam de atenção</p>
                  {bateriasAtencao.length === 0 ? <div className="py-6 text-center"><CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2" /><p className="text-[12px] text-[#8B9BB4]">Todas as baterias ok</p></div> : (
                    <div className="space-y-2">
                      {bateriasAtencao.slice(0, 4).map(d => (
                        <div key={d.id} className="flex items-center justify-between"><span className="text-[12px] truncate">{d.brand} {d.model}</span><BatteryIndicator value={d.battery} small /></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ESTOQUE */}
          {view === 'estoque' && (
            <div className="space-y-4">
              <div className="sticky top-[64px] z-10 -mx-5 md:-mx-8 px-5 md:px-8 py-3 bg-[#0B0F19]/90 backdrop-blur-xl border-b border-[#1E2D4A]/50 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4]" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar modelo, IMEI, cor..." className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] text-[14px] outline-none focus:border-[#2F6BFF]" />
                </div>
                <button onClick={() => setShowFilters(true)} className="h-11 w-11 md:w-auto md:px-4 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] flex items-center justify-center md:gap-2 text-[#8B9BB4] hover:text-white"><Filter className="w-4 h-4" /><span className="hidden md:inline text-[13px] font-semibold">Filtros</span></button>
                <button onClick={() => setView('add')} className="hidden md:flex h-11 px-5 rounded-[12px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white text-[13px] font-bold items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
              </div>

              {/* V2.4 FIX: BOTÕES EXCEL + INDICADOR USO PLANO REAL */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportEstoqueExcel} className="h-9 px-3 rounded-[10px] bg-[#1E2D4A] hover:bg-[#23365A] text-[12px] font-semibold flex items-center gap-1.5 transition"><Download className="w-4 h-4" /> Exportar Excel</button>
                  <button onClick={()=>setShowImportExcelModal(true)} className="h-9 px-3 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] hover:bg-[#14213A] text-[12px] font-semibold flex items-center gap-1.5 transition"><Upload className="w-4 h-4" /> Importar Excel</button>
                  <button onClick={downloadModeloExcel} className="h-9 px-3 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] hover:bg-[#14213A] text-[11px] font-semibold flex items-center gap-1.5 transition"><FileSpreadsheet className="w-4 h-4" /> Baixar modelo</button>
                  <span className="ml-auto text-[11px] text-[#64748B] flex items-center">{filteredDevices.length} aparelhos • isolado por loja {store.id}</span>
                </div>
                {/* Indicador visual de uso - só mostra quando plano não é ilimitado */}
                {isFinite(currentPlanLimit) && (
                  <div className="rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Uso do plano {getPlanName(subscription.plan)}</p>
                        <p className="text-[11px] font-bold text-[#F1F5F9]">{currentDeviceCount} / {currentPlanLimit} usados</p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#0B0F19] border border-[#1E2D4A] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${getPlanProgress()}%`, background: getPlanProgress() >= 80 ? '#F59E0B' : '#2F6BFF' }} />
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-1">{getRemainingSlots()} vagas restantes • {getPlanProgress().toFixed(0)}% ocupado</p>
                    </div>
                    {getPlanProgress() >= 80 && (
                      <button onClick={()=>setView('planos')} className="h-9 px-4 rounded-[10px] bg-[#F59E0B14] border border-[#F59E0B22] text-[#F59E0B] text-[11px] font-bold hover:bg-[#F59E0B22] transition shrink-0">Upgrade</button>
                    )}
                  </div>
                )}
              </div>

             {/* Mobile cards */}
              <div className="md:hidden space-y-2.5">
                {filteredDevices.length === 0 ? (
                  <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#1A2744] mx-auto flex items-center justify-center mb-3"><Package className="w-7 h-7 text-[#8B9BB4]" /></div>
                    <p className="text-[14px] font-semibold">Nenhum aparelho</p><p className="text-[12px] text-[#8B9BB4] mt-1">Ajuste filtros ou adicione novo</p>
                    <button onClick={() => { resetAddForm(); setView('add'); }} className="mt-4 h-10 px-5 rounded-[12px] bg-[#2F6BFF] text-white text-[13px] font-bold">Adicionar aparelho</button>
                  </div>
                ) : filteredDevices.map(d => {
                  const margin = d.price - d.cost;
                  const marginPct = d.cost ? Math.round((margin / d.cost) * 100) : 0;
                  return (
                    <div key={d.id} className="w-full text-left rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-3 flex gap-3 items-center">
                      <button onClick={() => { setSelectedDevice(d); setView('details'); }} className="flex-1 flex gap-3 items-center min-w-0 text-left">
                        <div className="w-14 h-14 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center shrink-0 overflow-hidden">
                          {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" /> : <span className="text-[12px] font-bold text-[#8B9BB4]">{d.brand[0]}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold tracking-[-0.2px] truncate">{d.brand} {d.model}</p>
                          <p className="text-[12px] text-[#8B9BB4] truncate">{d.storage} • {d.color} • {d.condition} {d.battery !== null && <span className="inline-flex ml-1"><BatteryIndicator value={d.battery} small /></span>}</p>
                        </div>
                        <div className="text-right shrink-0 mr-1">
                          <p className="text-[14px] font-bold">{fmtBRL(d.price)}</p>
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${marginPct >= 20 ? 'bg-[#16A34A14] text-[#16A34A] border border-[#16A34A22]' : 'bg-[#EF444414] text-[#EF4444] border border-[#EF444422]'}`}>{marginPct}%</span>
                          <div className="mt-1 flex justify-end"><span className={`w-2 h-2 rounded-full ${d.status === 'Disponível' ? 'bg-[#16A34A]' : d.status === 'Reservado' ? 'bg-[#F59E0B]' : 'bg-[#64748B]'}`} /></div>
                        </div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openEditDevice(d); }} className="w-9 h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center hover:bg-[#14213A] text-[#8B9BB4] hover:text-white transition shrink-0" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-[#0F1629] border-b border-[#1E2D4A] text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">
                      <tr><th className="px-4 py-3">Foto</th><th className="px-4 py-3">Modelo</th><th className="px-4 py-3">GB</th><th className="px-4 py-3">Cor</th><th className="px-4 py-3">Condição</th><th className="px-4 py-3">Bateria</th><th className="px-4 py-3">IMEI</th><th className="px-4 py-3">Custo</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3">Margem</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2D4A]/60">
                      {filteredDevices.map(d => (
                        <tr key={d.id} className="hover:bg-[#14213A]/50 transition text-[13px]">
                          <td className="px-4 py-3"><div className="w-10 h-10 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] overflow-hidden flex items-center justify-center">{d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" /> : <span className="text-[11px] font-bold">{d.brand[0]}</span>}</div></td>
                          <td className="px-4 py-3 font-medium">{d.brand} {d.model}</td>
                          <td className="px-4 py-3 text-[#8B9BB4]">{d.storage}</td>
                          <td className="px-4 py-3 text-[#8B9BB4]">{d.color}</td>
                          <td className="px-4 py-3"><span className="text-[11px] px-2 py-1 rounded-full bg-[#1A2744] border border-[#1E2D4A]">{d.condition}</span></td>
                          <td className="px-4 py-3"><BatteryIndicator value={d.battery} small /></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-1.5">{d.imei ? <><span className="font-mono text-[11px]">{d.imei.slice(0, 6)}…{d.imei.slice(-4)}</span><button onClick={() => { navigator.clipboard.writeText(d.imei!); showToast('IMEI copiado'); }} className="w-6 h-6 rounded bg-[#1A2744] flex items-center justify-center hover:bg-[#1E2D4A]"><Copy className="w-3 h-3" /></button></> : <span className="text-[#64748B] text-[11px]">—</span>}</div></td>
                          <td className="px-4 py-3">{fmtBRL(d.cost)}</td>
                          <td className="px-4 py-3 font-bold">{fmtBRL(d.price)}</td>
                          <td className="px-4 py-3"><span className={`text-[11px] font-bold ${d.price - d.cost >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{d.cost ? Math.round(((d.price - d.cost) / d.cost) * 100) : 0}%</span></td>
                          <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${d.status === 'Disponível' ? 'bg-[#16A34A14] text-[#16A34A] border-[#16A34A22]' : d.status === 'Reservado' ? 'bg-[#F59E0B14] text-[#F59E0B] border-[#F59E0B22]' : 'bg-[#1A2744] text-[#8B9BB4] border-[#1E2D4A]'}`}>{d.status}</span></td>
                          <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => openEditDevice(d)} className="w-7 h-7 rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center hover:bg-[#14213A] text-[#8B9BB4] hover:text-white transition" title="Editar"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => { setSelectedDevice(d); setView('details'); }} className="w-7 h-7 rounded-[8px] bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center hover:bg-[#1E2D4A]"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => { setSelectedDevice(d); setSalePriceInput(String(d.price)); setView('registrarVenda'); }} className="w-7 h-7 rounded-[8px] bg-[#2F6BFF] flex items-center justify-center hover:bg-[#1E5EFF]"><DollarSign className="w-3.5 h-3.5 text-white" /></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {showFilters && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
                  <div className="relative w-full md:max-w-[420px] rounded-t-[20px] md:rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-6 animate-[slideUp_0.25s_ease]">
                    <div className="flex items-center justify-between mb-5"><h3 className="text-[15px] font-bold">Filtros</h3><button onClick={() => setShowFilters(false)} className="w-8 h-8 rounded-full bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                    <div className="space-y-4">
                      <div><p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Marca</p><div className="flex flex-wrap gap-2">{['Todas', ...Array.from(new Set(storeDevices.map(d => d.brand)))].map(b => (<button key={b} onClick={() => setFilterBrand(b)} className={`h-8 px-3 rounded-full text-[12px] font-medium border transition ${filterBrand === b ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B9BB4] hover:text-white'}`}>{b}</button>))}</div></div>
                      <div><p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Status</p><div className="flex flex-wrap gap-2">{(['Todos', 'Disponível', 'Reservado', 'Vendido'] as const).map(s => (<button key={s} onClick={() => setFilterStatus(s as any)} className={`h-8 px-3 rounded-full text-[12px] font-medium border transition ${filterStatus === s ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B9BB4] hover:text-white'}`}>{s}</button>))}</div></div>
                      <div><p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Bateria</p><div className="flex flex-wrap gap-2">{['Todas', '<80', '80-89', '90+'].map(b => (<button key={b} onClick={() => setFilterBattery(b)} className={`h-8 px-3 rounded-full text-[12px] font-medium border transition ${filterBattery === b ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B9BB4] hover:text-white'}`}>{b}</button>))}</div></div>
                      <button onClick={() => { setFilterBrand('Todas'); setFilterStatus('Todos'); setFilterBattery('Todas'); setSearch(''); setShowFilters(false); }} className="w-full h-10 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold mt-2">Limpar filtros</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADD / EDIT - UNIFICADO COM GARANTIA VISÍVEL */}
          {(view === 'add' || view === 'edit') && (
            <div className="max-w-[720px] mx-auto space-y-6">
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6 md:p-7">
                <h2 className="text-[16px] font-bold flex items-center gap-2">{editingDevice ? <><Pencil className="w-4 h-4 text-[#2F6BFF]" /> Editar aparelho</> : 'Adicionar aparelho'}</h2>
                <p className="text-[12px] text-[#8B9BB4] mt-1">{editingDevice ? `Editando ${editingDevice.brand} ${editingDevice.model} • ID ${editingDevice.id}` : 'Foto, IMEI e bateria opcionais — IMEI com validação por loja'}</p>
                {editingDevice && editingDevice.status === 'Vendido' && (
                  <div className="mt-4 rounded-[12px] bg-[#F59E0B12] border border-[#F59E0B22] p-3 flex gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#F59E0B] leading-[1.4]">Este aparelho já foi vendido. Você pode editar observações e dados do aparelho, mas o histórico de venda, valor vendido e lucro não serão alterados.</p>
                  </div>
                )}
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="rounded-[12px] bg-[#0B0F19] border border-dashed border-[#1E2D4A] p-5 text-center">
                      {photoPreview ? <img src={photoPreview} className="w-full h-32 object-cover rounded-[10px] mb-3" /> : <div className="w-16 h-16 rounded-full bg-[#1A2744] mx-auto flex items-center justify-center mb-3"><Package className="w-8 h-8 text-[#8B9BB4]" /></div>}
                      <input type="file" accept="image/*" onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const r = new FileReader(); r.onload = () => setPhotoPreview(r.result as string); r.readAsDataURL(f);
                      }} className="hidden" id="photoUp" />
                      <label htmlFor="photoUp" className="inline-flex h-8 px-4 rounded-[10px] bg-[#111B2E] border border-[#1E2D4A] text-[12px] font-semibold items-center cursor-pointer hover:bg-[#14213A]">Escolher foto</label>
                      <p className="text-[10px] text-[#64748B] mt-2">Base64 local — em prod Supabase Storage</p>
                    </div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Marca</label><select value={addForm.brand} onChange={e => setAddForm({ ...addForm, brand: e.target.value })} className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]"><option>Apple</option><option>Samsung</option><option>Xiaomi</option><option>Motorola</option><option>Realme</option><option>Outros</option></select></div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Modelo / nome do celular</label><input value={addForm.model} onChange={e => setAddForm({ ...addForm, model: e.target.value })} placeholder="Ex: iPhone 13" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Armazenamento</label><select value={addForm.storage} onChange={e => setAddForm({ ...addForm, storage: e.target.value })} className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px]"><option>32GB</option><option>64GB</option><option>128GB</option><option>256GB</option><option>512GB</option><option>1TB</option></select></div><div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Cor</label><input value={addForm.color} onChange={e => setAddForm({ ...addForm, color: e.target.value })} placeholder="Preto" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div></div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Observações</label><textarea value={(addForm as any).notes || ''} onChange={e => setAddForm({ ...addForm, notes: e.target.value } as any)} placeholder="Ex: acompanha caixa, detalhe na traseira..." rows={3} className="mt-1 w-full rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 py-2.5 text-[13px] outline-none focus:border-[#2F6BFF] resize-none" /></div>
                  </div>
                  <div className="space-y-4">
                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Condição</label><select value={addForm.condition} onChange={e => setAddForm({ ...addForm, condition: e.target.value as any })} className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]"><option>Novo</option><option>Seminovo</option><option>Usado</option></select></div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Saúde da bateria % (opcional)</label><input type="number" value={addForm.battery ?? ''} onChange={e => setAddForm({ ...addForm, battery: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Ex: 92" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" />{addForm.battery !== null && addForm.battery !== undefined && addForm.battery !== 0 && <div className="mt-2"><BatteryIndicator value={addForm.battery} /></div>}</div>

                    {/* === GARANTIA VISÍVEL - SEMPRE APÓS BATERIA E ANTES DE CUSTO === */}
                    <div className="rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] p-4 flex flex-col gap-3 shadow-[0_0_0_1px_rgba(47,107,255,0.12)_inset]">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#2F6BFF]" style={{ width: 16, height: 16 }} />
                        <span className="text-[14px] font-bold text-white tracking-[-0.2px]">Garantia</span>
                        <span className="bg-[#2F6BFF] text-white text-[10px] font-bold px-[6px] py-[2px] rounded-full leading-none tracking-wide">NOVO</span>
                      </div>
                      <p className="text-[12px] text-[#8B95A9] leading-[1.3] -mt-1">Opcional - controle de garantia do aparelho</p>
                      
                      <div className="pt-1">
                        <label className="text-[12px] text-[#8B95A9] font-medium">Possui garantia?</label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHasWarranty(true)}
                            className={`h-10 rounded-[8px] text-[13px] font-semibold transition border ${hasWarranty ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white shadow-[0_4px_12px_rgba(47,107,255,0.25)]' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B95A9] hover:text-white hover:border-[#2A3A5A]'}`}
                          >Sim</button>
                          <button
                            type="button"
                            onClick={() => setHasWarranty(false)}
                            className={`h-10 rounded-[8px] text-[13px] font-semibold transition border ${!hasWarranty ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white shadow-[0_4px_12px_rgba(47,107,255,0.25)]' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B95A9] hover:text-white hover:border-[#2A3A5A]'}`}
                          >Não</button>
                        </div>
                      </div>

                      {hasWarranty && (
                        <div className="space-y-3 pt-1 animate-[fadeIn_0.25s_ease]">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[12px] text-[#8B95A9]">Prazo</label>
                              <input
                                type="number"
                                value={warrantyDuration || ''}
                                onChange={e => setWarrantyDuration(Number(e.target.value) || 0)}
                                placeholder="90"
                                className="mt-1 w-full h-11 rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] text-white outline-none focus:border-[#2F6BFF]"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#8B95A9]">Unidade</label>
                              <select
                                value={warrantyUnit}
                                onChange={e => setWarrantyUnit(e.target.value as any)}
                                className="mt-1 w-full h-11 rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] text-white outline-none focus:border-[#2F6BFF]"
                              >
                                <option value="dias">dias</option>
                                <option value="meses">meses</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[12px] text-[#8B95A9]">Data início</label>
                              <input
                                type="date"
                                value={warrantyStartDate}
                                onChange={e => setWarrantyStartDate(e.target.value)}
                                className="mt-1 w-full h-11 rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] text-white outline-none focus:border-[#2F6BFF]"
                              />
                            </div>
                            <div>
                              <label className="text-[12px] text-[#8B95A9]">Data vencimento</label>
                              <input
                                readOnly
                                value={warrantyEndDate ? fmtDateBR(warrantyEndDate) : '—'}
                                placeholder="—"
                                className="mt-1 w-full h-11 rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] font-bold text-[#2F6BFF] outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[12px] text-[#8B95A9]">Observação garantia</label>
                            <textarea
                              value={warrantyNote}
                              onChange={e => setWarrantyNote(e.target.value)}
                              rows={2}
                              placeholder="Ex: Garantia de loja, 90 dias..."
                              className="mt-1 w-full rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#2F6BFF] resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* === FIM GARANTIA === */}

                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">IMEI (opcional)</label><input value={addForm.imei as any} onChange={e => { setAddForm({ ...addForm, imei: e.target.value }); setImeiError(null); }} placeholder="15 dígitos" className={`mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border px-3 text-[14px] outline-none ${imeiError ? 'border-[#EF4444]' : 'border-[#1E2D4A] focus:border-[#2F6BFF]'}`} />{imeiError && <p className="text-[11px] text-[#EF4444] mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {imeiError}</p>}<p className="text-[10px] text-[#64748B] mt-1">Valida duplicidade por storeId ignorando vendidos/arquivados</p></div>
                    <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Número de série (opcional)</label><input value={(addForm as any).serial || ''} onChange={e => setAddForm({ ...addForm, serial: e.target.value } as any)} placeholder="Ex: C39X..." className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div>
                    <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Custo compra</label><input type="text" inputMode="decimal" value={costStr} onChange={e => setCostStr(normalizeMoneyInput(e.target.value))} onBlur={() => setCostStr(prev => normalizeMoneyInput(prev))} placeholder="0" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div><div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Preço venda</label><input type="text" inputMode="decimal" value={priceStr} onChange={e => setPriceStr(normalizeMoneyInput(e.target.value))} onBlur={() => setPriceStr(prev => normalizeMoneyInput(prev))} placeholder="0" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div></div>
                    {(priceNum > 0 || costNum > 0) && <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3 flex justify-between text-[12px]"><span className="text-[#8B9BB4]">Margem</span><span className={`font-bold ${priceNum - costNum >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{fmtBRL(priceNum - costNum)} • {costNum ? Math.round(((priceNum - costNum) / costNum) * 100) : 0}%</span></div>}
                  </div>
                </div>
                <div className="mt-6 flex gap-3"><button onClick={handleAddDevice} className="flex-1 h-11 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white font-bold text-[14px] transition active:scale-[0.99]">{editingDevice ? 'Salvar alterações' : 'Salvar aparelho'}</button><button onClick={() => { resetAddForm(); setView('estoque'); }} className="h-11 px-6 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Cancelar</button></div>
              </div>
            </div>
          )}

          {/* DETAILS */}
          {view === 'details' && selectedDevice && (
            <div className="max-w-[720px] mx-auto space-y-4">
              <button onClick={() => setView('estoque')} className="inline-flex items-center gap-1.5 text-[13px] text-[#8B9BB4] hover:text-white"><ChevronRight className="w-4 h-4 rotate-180" /> Voltar ao estoque</button>
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <div className="flex gap-5">
                  <div className="w-24 h-24 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] overflow-hidden flex items-center justify-center shrink-0">{selectedDevice.photoUrl ? <img src={selectedDevice.photoUrl} className="w-full h-full object-cover" /> : <span className="text-[20px] font-bold">{selectedDevice.brand[0]}</span>}</div>
                  <div className="flex-1 min-w-0"><h2 className="text-[18px] font-bold">{selectedDevice.brand} {selectedDevice.model}</h2><p className="text-[13px] text-[#8B9BB4] mt-1">{selectedDevice.storage} • {selectedDevice.color} • {selectedDevice.condition}</p><div className="mt-3 flex flex-wrap gap-2"><BatteryIndicator value={selectedDevice.battery} /><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${selectedDevice.status === 'Disponível' ? 'bg-[#16A34A14] text-[#16A34A] border-[#16A34A22]' : 'bg-[#1A2744] text-[#8B9BB4] border-[#1E2D4A]'}`}>{selectedDevice.status}</span></div></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[11px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Custo</p><p className="font-bold mt-1">{fmtBRL(selectedDevice.cost)}</p></div>
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[11px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Preço</p><p className="font-bold mt-1">{fmtBRL(selectedDevice.price)}</p></div>
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3 col-span-2"><p className="text-[11px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">IMEI</p><div className="flex items-center gap-2 mt-1">{selectedDevice.imei ? <><span className="font-mono text-[13px]">{selectedDevice.imei}</span><button onClick={() => { navigator.clipboard.writeText(selectedDevice.imei!); showToast('IMEI copiado'); }} className="w-7 h-7 rounded-[8px] bg-[#111B2E] border border-[#1E2D4A] flex items-center justify-center"><Copy className="w-3.5 h-3.5" /></button></> : <span className="text-[#64748B]">Não informado</span>}</div></div>
                </div>
                {/* GARANTIA - SEMPRE VISÍVEL NOS DETALHES */}
                <div className="mt-4 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#2F6BFF]" style={{ width: 16, height: 16 }} />
                    <span className="text-[14px] font-bold text-white">Garantia</span>
                    {selectedDevice.hasWarranty ? <span className="bg-[#16A34A14] text-[#16A34A] border border-[#16A34A22] text-[10px] font-bold px-2 py-0.5 rounded-full">COM GARANTIA</span> : <span className="bg-[#0B0F19] border border-[#1E2D4A] text-[#8B9BB4] text-[10px] font-bold px-2 py-0.5 rounded-full">SEM GARANTIA</span>}
                  </div>
                  {!selectedDevice.hasWarranty ? (
                    <div className="rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] p-3">
                      <p className="text-[12px] text-[#8B95A9]">Este aparelho está sem garantia cadastrada.</p>
                      <p className="text-[11px] text-[#64748B] mt-1">Edite o aparelho para adicionar garantia de loja.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] p-3">
                          <p className="text-[11px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Prazo</p>
                          <p className="text-[13px] font-bold text-white mt-1">{selectedDevice.warrantyDuration} {selectedDevice.warrantyUnit}</p>
                        </div>
                        <div className="rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] p-3">
                          <p className="text-[11px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Vencimento</p>
                          <p className="text-[13px] font-bold text-[#2F6BFF] mt-1">{fmtDateBR(selectedDevice.warrantyEndDate)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[12px]">
                        <div><p className="text-[11px] text-[#8B9BB4]">Início</p><p className="text-white font-medium">{fmtDateBR(selectedDevice.warrantyStartDate)}</p></div>
                        <div><p className="text-[11px] text-[#8B9BB4]">Resumo</p><p className="text-white font-medium">{buildWarrantySummary(selectedDevice.hasWarranty, selectedDevice.warrantyDuration, selectedDevice.warrantyUnit, selectedDevice.warrantyStartDate, selectedDevice.warrantyEndDate)}</p></div>
                      </div>
                      {selectedDevice.warrantyNote && (
                        <div className="rounded-[8px] bg-[#0B0F19] border border-[#1E2D4A] p-3">
                          <p className="text-[11px] uppercase tracking-[0.8px] font-semibold text-[#8B9BB4]">Observação</p>
                          <p className="text-[12px] text-white mt-1 leading-[1.4]">{selectedDevice.warrantyNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setSalePriceInput(String(selectedDevice.price)); setView('registrarVenda'); }} disabled={selectedDevice.status === 'Vendido'} className="flex-1 h-11 rounded-[14px] bg-[#2F6BFF] hover:bg-[#1E5EFF] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[14px]">Registrar venda</button>
                  <button onClick={() => { setDevices(devices.map(d => d.id === selectedDevice.id ? { ...d, status: d.status === 'Disponível' ? 'Reservado' : 'Disponível' } : d)); setSelectedDevice({ ...selectedDevice, status: selectedDevice.status === 'Disponível' ? 'Reservado' : 'Disponível' }); showToast('Status atualizado'); }} className="h-11 px-5 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">{selectedDevice.status === 'Disponível' ? 'Reservar' : 'Disponibilizar'}</button>
                </div>
              </div>
            </div>
          )}

          {/* REGISTRAR VENDA - V2.2 COM CLIENTE */}
          {view === 'registrarVenda' && selectedDevice && (
            <div className="max-w-[520px] mx-auto space-y-4">
              <button onClick={() => { setSelectedSaleClient(null); setSaleClientQuery(''); setShowClientDropdown(false); setView('details'); }} className="inline-flex items-center gap-1.5 text-[13px] text-[#8B9BB4] hover:text-white"><ChevronRight className="w-4 h-4 rotate-180" /> Voltar</button>
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <h2 className="text-[16px] font-bold">Confirmar venda</h2>
                <p className="text-[12px] text-[#8B9BB4] mt-1">Vincular cliente é opcional, mas recomendado</p>
                <div className="mt-5 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-[10px] bg-[#111B2E] border border-[#1E2D4A] flex items-center justify-center font-bold">{selectedDevice.brand[0]}</div>
                  <div><p className="text-[14px] font-semibold">{selectedDevice.brand} {selectedDevice.model} {selectedDevice.storage}</p><p className="text-[12px] text-[#8B9BB4]">{selectedDevice.color} • IMEI {selectedDevice.imei ? '✓' : '—'} • {fmtBRL(selectedDevice.price)}</p></div>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Cliente (opcional)</label>
                    <div className="mt-1 relative">
                      {selectedSaleClient ? (
                        <div className="h-11 rounded-[12px] bg-[#1A2744] border border-[#2F6BFF]/30 px-3 flex items-center justify-between">
                          <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#2F6BFF] flex items-center justify-center text-white text-[11px] font-bold">{selectedSaleClient.name.slice(0,2).toUpperCase()}</div><div><p className="text-[13px] font-semibold">{selectedSaleClient.name}</p><p className="text-[11px] text-[#8B9BB4]">{selectedSaleClient.phone}</p></div></div>
                          <button onClick={() => { setSelectedSaleClient(null); setSaleClientQuery(''); }} className="w-7 h-7 rounded-full bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4]" />
                            <input value={saleClientQuery} onChange={e => { setSaleClientQuery(e.target.value); setShowClientDropdown(true); }} onFocus={() => setShowClientDropdown(true)} placeholder="Buscar cliente por nome ou telefone..." className="w-full h-11 pl-10 pr-3 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] outline-none focus:border-[#2F6BFF]" />
                          </div>
                          {showClientDropdown && (
                            <div className="absolute z-20 mt-2 w-full rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] shadow-[0_12px_32px_rgba(0,0,0,0.5)] overflow-hidden max-h-[220px] overflow-y-auto no-scrollbar">
                              <button onClick={() => { setSelectedSaleClient(null); setShowClientDropdown(false); setSaleClientQuery(''); }} className="w-full text-left px-4 py-3 hover:bg-[#0B0F19] border-b border-[#1E2D4A] flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><User className="w-4 h-4 text-[#8B9BB4]" /></div><div><p className="text-[13px] font-semibold">Venda avulsa</p><p className="text-[11px] text-[#8B9BB4]">Sem cliente vinculado</p></div></button>
                              {filteredSaleClients.length === 0 ? <div className="p-4 text-center text-[12px] text-[#8B9BB4]">Nenhum cliente encontrado</div> : filteredSaleClients.map(c => (
                                <button key={c.id} onClick={() => { setSelectedSaleClient(c); setShowClientDropdown(false); setSaleClientQuery(''); }} className="w-full text-left px-4 py-2.5 hover:bg-[#0B0F19] flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#1A2744] flex items-center justify-center text-[11px] font-bold">{c.name.slice(0,2).toUpperCase()}</div>
                                  <div className="flex-1 min-w-0"><p className="text-[13px] font-medium truncate">{c.name}</p><p className="text-[11px] text-[#8B9BB4] truncate">{c.phone}</p></div>
                                </button>
                              ))}
                              <div className="border-t border-[#1E2D4A] p-2">
                                {!showInlineClientForm ? (
                                  <button onClick={() => setShowInlineClientForm(true)} className="w-full h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5"><UserPlus className="w-4 h-4" /> Cadastrar novo cliente rápido</button>
                                ) : (
                                  <div className="space-y-2 p-1">
                                    <input value={inlineClientForm.name} onChange={e => setInlineClientForm({ ...inlineClientForm, name: e.target.value })} placeholder="Nome *" className="w-full h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[12px] outline-none focus:border-[#2F6BFF]" />
                                    <input value={inlineClientForm.phone} onChange={e => setInlineClientForm({ ...inlineClientForm, phone: e.target.value })} placeholder="Telefone *" className="w-full h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[12px] outline-none focus:border-[#2F6BFF]" />
                                    <div className="flex gap-2"><button onClick={handleInlineCreateClient} className="flex-1 h-8 rounded-[10px] bg-[#2F6BFF] text-white text-[12px] font-bold">Criar e vincular</button><button onClick={() => setShowInlineClientForm(false)} className="h-8 px-3 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px]">Cancelar</button></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div><label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Preço de venda</label><input type="text" inputMode="decimal" value={salePriceInput} onChange={e => setSalePriceInput(normalizeMoneyInput(e.target.value))} onBlur={() => setSalePriceInput(prev => normalizeMoneyInput(prev))} className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div>
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3 flex justify-between text-[12px]"><span className="text-[#8B9BB4]">Lucro nesta venda</span><span className="font-bold text-[#16A34A]">{fmtBRL(((parseFloat(salePriceInput.replace(',', '.')) || 0) || selectedDevice.price) - selectedDevice.cost)}</span></div>
                </div>
                <div className="mt-6 flex gap-3"><button onClick={handleSaleAtomic} className="flex-1 h-11 rounded-[14px] bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[14px]">Confirmar venda</button><button onClick={() => { setSelectedSaleClient(null); setView('details'); }} className="h-11 px-6 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Voltar</button></div>
              </div>
            </div>
          )}

          {/* VENDAS COM TABS VENDAS | CLIENTES | COMPROVANTES - V2.3.1 */}
          {view === 'vendas' && (
            <div className="space-y-4 max-w-[900px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#111B2E] border border-[#1E2D4A] overflow-x-auto no-scrollbar">
                  <button onClick={() => setSalesSubTab('vendas')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition shrink-0 ${salesSubTab==='vendas' ? 'bg-[#2F6BFF] text-white shadow' : 'text-[#8B9BB4] hover:text-white'}`}>Vendas</button>
                  <button onClick={() => setSalesSubTab('clientes')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition shrink-0 ${salesSubTab==='clientes' ? 'bg-[#2F6BFF] text-white shadow' : 'text-[#8B9BB4] hover:text-white'}`}>Clientes</button>
                  <button onClick={() => setSalesSubTab('comprovantes')} className={`h-8 px-4 rounded-full text-[12px] font-bold transition shrink-0 flex items-center gap-1.5 ${salesSubTab==='comprovantes' ? 'bg-[#2F6BFF] text-white shadow' : 'text-[#8B9BB4] hover:text-white'}`}><Receipt className="w-3.5 h-3.5" /> Comprovantes</button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#8B9BB4] hidden md:block">
                    {salesSubTab==='vendas' ? `${storeSales.filter(s=>!s.isCanceled).length} vendas` : salesSubTab==='clientes' ? `${storeClients.length} clientes` : `${filteredComprovantes.length} comprovantes`}
                  </span>
                  {salesSubTab==='clientes' && <button onClick={() => openClientForm()} className="h-8 px-3 rounded-[10px] bg-[#2F6BFF] text-white text-[12px] font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Novo</button>}
                </div>
              </div>

              {salesSubTab==='vendas' && (
                <div className="space-y-3">
                  {storeSales.length === 0 ? <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-10 text-center"><Receipt className="w-10 h-10 text-[#8B9BB4] mx-auto mb-3" /><p className="text-[14px] font-semibold">Nenhuma venda ainda</p><p className="text-[12px] text-[#8B9BB4] mt-1">Registre pelo estoque</p></div> :
                  storeSales.slice().sort((a,b)=>new Date(b.saleDate).getTime()-new Date(a.saleDate).getTime()).map(s => {
                    const clientExists = s.clientId ? clients.find(c=>c.id===s.clientId) : null;
                    const displayName = clientExists ? clientExists.name : (s.clientNameSnapshot ? (s.clientId && !clientExists ? `Cliente removido (${s.clientNameSnapshot})` : s.clientNameSnapshot) : null);
                    return (
                      <div key={s.id} className={`rounded-[14px] border p-4 ${s.isCanceled ? 'bg-[#1A2744]/40 border-[#1E2D4A] opacity-60' : 'bg-[#111B2E] border-[#1E2D4A]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${s.isCanceled ? 'bg-[#1A2744]' : 'bg-[#16A34A14] border border-[#16A34A22]'}`}><DollarSign className={`w-5 h-5 ${s.isCanceled ? 'text-[#64748B]' : 'text-[#16A34A]'}`} /></div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold truncate">{s.deviceSnapshot.brand} {s.deviceSnapshot.model} {s.deviceSnapshot.storage} {s.isCanceled && <span className="text-[#EF4444]">(Cancelada)</span>}</p>
                              <p className="text-[11px] text-[#8B9BB4]">{new Date(s.saleDate).toLocaleString('pt-BR')} • {s.paymentMethod} • Lucro {fmtBRL(s.profit)}</p>
                              {displayName && <p className="text-[11px] mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1A2744] border border-[#1E2D4A]"><Users className="w-3 h-3" /> {displayName}</p>}
                              {s.deviceSnapshot.imei && <p className="text-[10px] text-[#64748B] mt-1 font-mono">IMEI {s.deviceSnapshot.imei.slice(0,6)}…</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[13px] font-bold mr-1">{fmtBRL(s.salePrice)}</span>
                            <button onClick={() => openReceipt(s)} className="w-8 h-8 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center text-[#8B95A9] hover:text-[#2F6BFF] hover:border-[#2F6BFF]/40 transition" title="Ver comprovante"><Receipt className="w-4 h-4" /></button>
                            {!s.isCanceled && <button onClick={() => handleCancelSale(s.id)} className="w-8 h-8 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><Trash2 className="w-4 h-4 text-[#8B9BB4]" /></button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {salesSubTab==='clientes' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4]" />
                    <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Buscar cliente por nome, telefone, CPF..." className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] text-[13px] outline-none focus:border-[#2F6BFF]" />
                  </div>
                  {filteredClients.length===0 ? (
                    <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-10 text-center">
                      <div className="w-14 h-14 rounded-full bg-[#1A2744] mx-auto flex items-center justify-center mb-3"><Users className="w-7 h-7 text-[#8B9BB4]" /></div>
                      <p className="text-[14px] font-semibold">{clientSearch ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p><p className="text-[12px] text-[#8B9BB4] mt-1">{clientSearch ? 'Tente outro termo' : 'Cadastre seu primeiro cliente para vincular às vendas'}</p>
                      {!clientSearch && <button onClick={()=>openClientForm()} className="mt-4 h-10 px-5 rounded-[12px] bg-[#2F6BFF] text-white text-[13px] font-bold">+ Novo cliente</button>}
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      {filteredClients.map(c => {
                        const stats = clientStats.get(c.id);
                        return (
                          <button key={c.id} onClick={()=>{ setSelectedClient(c); setView('clienteDetalhe'); }} className="w-full text-left rounded-[14px] bg-[#111B2E] border border-[#1E2D4A] p-4 hover:bg-[#14213A] transition flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center text-[12px] font-bold shrink-0">{c.name.slice(0,2).toUpperCase()}</div>
                              <div className="min-w-0"><p className="text-[13px] font-semibold truncate">{c.name}</p><p className="text-[11px] text-[#8B9BB4] truncate">{c.phone}{c.email ? ` • ${c.email}` : ''}</p>{stats && <p className="text-[11px] text-[#16A34A] mt-0.5">{stats.completed} compras • {fmtBRL(stats.total)} total</p>}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#64748B] shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {salesSubTab==='comprovantes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-bold tracking-[-0.3px]">Comprovantes <span className="ml-2 text-[12px] font-semibold text-[#8B9BB4] bg-[#111B2E] border border-[#1E2D4A] px-2.5 py-1 rounded-full">{filteredComprovantes.length}</span></h3>
                  </div>
                  {/* Busca */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4]" />
                    <input value={comprovanteSearch} onChange={e=>setComprovanteSearch(e.target.value)} placeholder="Buscar por nº venda, cliente, modelo ou IMEI" className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] text-[13px] outline-none focus:border-[#2F6BFF]" />
                  </div>
                  {/* Filtros período - FIX V2.4.3: 30d removido, add 90d, mes=Este mês calendário */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Período</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'hoje', label: 'Hoje' },
                        { id: '7d', label: '7 dias' },
                        { id: 'mes', label: 'Este mês' },
                        { id: '90d', label: '90 dias' },
                        { id: 'todas', label: 'Todas' },
                      ].map(p => (
                        <button key={p.id} onClick={()=>setComprovantePeriod(p.id as any)} className={`h-8 px-3.5 rounded-full text-[12px] font-semibold border transition ${comprovantePeriod===p.id ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B9BB4] hover:text-white'}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  {/* Filtros status */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'todas', label: 'Todas' },
                        { id: 'concluidas', label: 'Concluídas' },
                        { id: 'canceladas', label: 'Canceladas' },
                      ].map(s => (
                        <button key={s.id} onClick={()=>setComprovanteStatus(s.id as any)} className={`h-8 px-3.5 rounded-full text-[12px] font-semibold border transition ${comprovanteStatus===s.id ? 'bg-[#2F6BFF] border-[#2F6BFF] text-white' : 'bg-[#0B0F19] border-[#1E2D4A] text-[#8B9BB4] hover:text-white'}`}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                  {/* Lista */}
                  <div className="space-y-3">
                    {filteredComprovantes.length===0 ? (
                      <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-10 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#1A2744] mx-auto flex items-center justify-center mb-3"><Receipt className="w-7 h-7 text-[#8B9BB4]" /></div>
                        <p className="text-[14px] font-semibold">Nenhum comprovante</p>
                        <p className="text-[12px] text-[#8B9BB4] mt-1">Ajuste busca ou filtros</p>
                      </div>
                    ) : filteredComprovantes.map(s => {
                      const clientExists = s.clientId ? clients.find(c=>c.id===s.clientId) : null;
                      let clientLabel = '';
                      if (clientExists) clientLabel = clientExists.name;
                      else if (s.clientNameSnapshot) clientLabel = s.clientId && !clientExists ? `Cliente removido (${s.clientNameSnapshot})` : s.clientNameSnapshot;
                      else clientLabel = 'Venda avulsa';
                      const dateDDMM = new Date(s.saleDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                      const codigo = '#' + s.id.slice(-4).toUpperCase();
                      return (
                        <div key={s.id} className="rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-white">{codigo}</span>
                              <span className="text-[11px] text-[#8B95A9]">{dateDDMM}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.isCanceled ? 'bg-[#EF444420] text-[#EF4444] border-[#EF444422]' : 'bg-[#16A34A20] text-[#16A34A] border-[#16A34A22]'}`}>{s.isCanceled ? 'Cancelada' : 'Concluída'}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[13px] font-medium text-white truncate">{clientLabel}</p>
                            <p className="text-[12px] text-[#8B95A9]">{s.deviceSnapshot.brand} {s.deviceSnapshot.model} {s.deviceSnapshot.storage || ''}</p>
                            {s.deviceSnapshot.imei && <p className="text-[12px] text-[#64748B] font-mono">IMEI {s.deviceSnapshot.imei}</p>}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[14px] font-bold text-white">{fmtBRL(s.salePrice)}</span>
                              <span className="text-[11px] text-[#8B9BB4]">• {s.paymentMethod || 'Não informado'}{s.installments ? ` em ${s.installments}x` : ''}</span>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button onClick={()=>openReceipt(s)} className="h-9 bg-[#1E2D4A] hover:bg-[#23365A] rounded-[8px] text-[12px] font-semibold flex items-center justify-center gap-1.5 text-[#F1F5F9] transition"><Eye className="w-4 h-4" /> Ver comprovante</button>
                            <button onClick={()=>handleShareReceipt(s)} className="h-9 bg-[#1E2D4A] hover:bg-[#23365A] rounded-[8px] text-[12px] font-semibold flex items-center justify-center gap-1.5 text-[#F1F5F9] transition"><Share2 className="w-4 h-4" /> Compartilhar</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CLIENTES VIEWS - V2.2 */}
          {view === 'clientes' && (
            <div className="space-y-4 max-w-[900px]">
              <div className="flex items-center gap-3">
                <button onClick={()=>setView('vendas')} className="w-9 h-9 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] flex items-center justify-center"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                <h2 className="text-[16px] font-bold">Clientes</h2>
                <span className="ml-auto text-[12px] text-[#8B9BB4]">{storeClients.length} clientes</span>
                <button onClick={()=>openClientForm()} className="h-9 px-4 rounded-[12px] bg-[#2F6BFF] text-white text-[12px] font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Novo</button>
              </div>
              <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4]" /><input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Buscar..." className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] text-[13px] outline-none focus:border-[#2F6BFF]" /></div>
              {filteredClients.length===0 ? (
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-10 text-center"><Users className="w-10 h-10 text-[#8B9BB4] mx-auto mb-3" /><p className="text-[14px] font-semibold">Nenhum cliente</p><button onClick={()=>openClientForm()} className="mt-4 h-10 px-5 rounded-[12px] bg-[#2F6BFF] text-white text-[13px] font-bold">+ Cadastrar</button></div>
              ) : (
                <div className="grid gap-2.5">{filteredClients.map(c=>{ const st=clientStats.get(c.id); return (<button key={c.id} onClick={()=>{ setSelectedClient(c); setView('clienteDetalhe'); }} className="w-full text-left rounded-[14px] bg-[#111B2E] border border-[#1E2D4A] p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1A2744] flex items-center justify-center text-[11px] font-bold">{c.name.slice(0,2).toUpperCase()}</div><div><p className="text-[13px] font-semibold">{c.name}</p><p className="text-[11px] text-[#8B9BB4]">{c.phone}</p>{st && <p className="text-[11px] text-[#16A34A]">{st.completed} compras • {fmtBRL(st.total)}</p>}</div></div><ChevronRight className="w-4 h-4 text-[#64748B]" /></button>); })}</div>
              )}
            </div>
          )}

          {view === 'clienteDetalhe' && selectedClient && (
            <div className="max-w-[720px] mx-auto space-y-4">
              <button onClick={()=>{ setView('clientes'); setSalesSubTab('clientes'); }} className="inline-flex items-center gap-1.5 text-[13px] text-[#8B9BB4] hover:text-white"><ChevronRight className="w-4 h-4 rotate-180" /> Voltar para clientes</button>
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center text-[14px] font-bold">{selectedClient.name.slice(0,2).toUpperCase()}</div>
                    <div><h2 className="text-[18px] font-bold">{selectedClient.name}</h2><p className="text-[13px] text-[#8B9BB4] mt-1">{selectedClient.phone}</p>{selectedClient.email && <p className="text-[12px] text-[#8B9BB4]">{selectedClient.email}</p>}{selectedClient.cpf && <p className="text-[11px] text-[#64748B] mt-1 font-mono">CPF {selectedClient.cpf}</p>}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>openClientForm(selectedClient)} className="w-9 h-9 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={()=>setShowDeleteClientModal(selectedClient)} className="w-9 h-9 rounded-[12px] bg-[#EF444414] border border-[#EF444422] flex items-center justify-center"><Trash2 className="w-4 h-4 text-[#EF4444]" /></button>
                  </div>
                </div>
                {selectedClient.notes && <div className="mt-4 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Observações</p><p className="text-[12px] mt-1">{selectedClient.notes}</p></div>}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[11px] uppercase text-[#8B9BB4] font-semibold">Total gasto</p><p className="text-[16px] font-bold mt-1 text-[#16A34A]">{fmtBRL(clientStats.get(selectedClient.id)?.total || 0)}</p><p className="text-[11px] text-[#8B9BB4] mt-1">Só concluídas</p></div>
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[11px] uppercase text-[#8B9BB4] font-semibold">Compras</p><p className="text-[16px] font-bold mt-1">{clientStats.get(selectedClient.id)?.completed || 0}</p><p className="text-[11px] text-[#8B9BB4] mt-1">{clientStats.get(selectedClient.id)?.count || 0} total c/ canceladas</p></div>
                  <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3"><p className="text-[11px] uppercase text-[#8B9BB4] font-semibold">Cliente desde</p><p className="text-[13px] font-bold mt-1">{new Date(selectedClient.createdAt).toLocaleDateString('pt-BR')}</p></div>
                </div>
              </div>
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                <h3 className="text-[14px] font-bold mb-4">Histórico de compras • {selectedClientSales.length}</h3>
                {selectedClientSales.length===0 ? <div className="py-8 text-center"><Receipt className="w-8 h-8 text-[#8B9BB4] mx-auto mb-2" /><p className="text-[12px] text-[#8B9BB4]">Nenhuma compra ainda</p></div> : (
                  <div className="space-y-2.5">
                    {selectedClientSales.map(s=>(
                      <div key={s.id} className={`rounded-[12px] border p-3 flex items-center justify-between ${s.isCanceled ? 'bg-[#1A2744]/40 border-[#1E2D4A] opacity-60' : 'bg-[#0B0F19] border-[#1E2D4A]'}`}>
                        <div className="flex gap-3 min-w-0"><div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${s.isCanceled ? 'bg-[#1A2744]' : 'bg-[#16A34A14]'}`}><Smartphone className="w-4 h-4 text-[#8B9BB4]" /></div><div className="min-w-0"><p className="text-[13px] font-medium truncate">{s.deviceSnapshot.brand} {s.deviceSnapshot.model} {s.deviceSnapshot.storage} {s.isCanceled && <span className="text-[#EF4444] text-[11px]">• Cancelada</span>}{!s.isCanceled && <span className="text-[#16A34A] text-[11px]">• Concluída</span>}</p><p className="text-[11px] text-[#8B9BB4]">{new Date(s.saleDate).toLocaleString('pt-BR')} • {fmtBRL(s.salePrice)} • {s.paymentMethod}{s.deviceSnapshot.imei ? ` • IMEI ${s.deviceSnapshot.imei.slice(-4)}` : ''}</p></div></div><span className={`text-[12px] font-bold ${s.isCanceled ? 'text-[#8B9BB4]' : 'text-[#16A34A]'}`}>{s.isCanceled ? 'Cancelada' : 'Concluída'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {showDeleteClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowDeleteClientModal(null)} />
                  <div className="relative w-full max-w-[380px] rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                    <h3 className="text-[15px] font-bold">Remover cliente?</h3><p className="text-[12px] text-[#8B9BB4] mt-2">Vendas vinculadas serão mantidas com snapshot <b>{showDeleteClientModal.name}</b> mostrando “Cliente removido”.</p>
                    <div className="mt-5 flex gap-3"><button onClick={()=>handleDeleteClient(showDeleteClientModal)} className="flex-1 h-10 rounded-[12px] bg-[#EF4444] text-white text-[13px] font-bold">Remover</button><button onClick={()=>setShowDeleteClientModal(null)} className="flex-1 h-10 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Cancelar</button></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'clienteForm' && (
            <div className="max-w-[520px] mx-auto">
              <button onClick={()=>{ resetClientForm(); setView('clientes'); setSalesSubTab('clientes'); }} className="inline-flex items-center gap-1.5 text-[13px] text-[#8B9BB4] hover:text-white mb-4"><ChevronRight className="w-4 h-4 rotate-180" /> Voltar</button>
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <h2 className="text-[16px] font-bold">{editingClient ? 'Editar cliente' : 'Novo cliente'}</h2><p className="text-[12px] text-[#8B9BB4] mt-1">Nome e telefone obrigatórios • restante opcional</p>
                <div className="mt-5 space-y-4">
                  <div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Nome *</label><input value={clientForm.name} onChange={e=>setClientForm({...clientForm, name: e.target.value})} placeholder="Ex: João Silva" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div>
                  <div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Telefone *</label><input value={clientForm.phone} onChange={e=>setClientForm({...clientForm, phone: e.target.value})} placeholder="(11) 99999-9999" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">CPF opcional</label><input value={clientForm.cpf} onChange={e=>setClientForm({...clientForm, cpf: e.target.value})} placeholder="000.000.000-00" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div><div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Email opcional</label><input value={clientForm.email} onChange={e=>setClientForm({...clientForm, email: e.target.value})} placeholder="email@..." className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px] outline-none focus:border-[#2F6BFF]" /></div></div>
                  <div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Observações</label><textarea value={clientForm.notes} onChange={e=>setClientForm({...clientForm, notes: e.target.value})} placeholder="Ex: cliente fiel, prefere iPhone..." rows={3} className="mt-1 w-full rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 py-2.5 text-[13px] outline-none focus:border-[#2F6BFF] resize-none" /></div>
                </div>
                <div className="mt-6 flex gap-3"><button onClick={handleSaveClient} className="flex-1 h-11 rounded-[14px] bg-[#2F6BFF] text-white font-bold text-[14px]">{editingClient ? 'Salvar alterações' : 'Cadastrar cliente'}</button><button onClick={()=>{ resetClientForm(); setView('clientes'); }} className="h-11 px-6 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Cancelar</button></div>
              </div>
            </div>
          )}

          {/* FINANCEIRO */}
          {view === 'financeiro' && (
            <div className="space-y-6 max-w-[900px]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4"><p className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Faturamento</p><p className="text-[18px] font-bold mt-1">{fmtBRL(faturamento)}</p></div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4"><p className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Lucro bruto</p><p className="text-[18px] font-bold mt-1 text-[#16A34A]">{fmtBRL(lucroBruto)}</p></div>
                <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-4"><p className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Despesas</p><p className="text-[18px] font-bold mt-1 text-[#EF4444]">{fmtBRL(despesas)}</p></div>
                <div className="rounded-[16px] bg-[#2F6BFF] p-4 text-white"><p className="text-[11px] uppercase font-semibold opacity-80">Líquido</p><p className="text-[18px] font-bold mt-1">{fmtBRL(lucroLiquido)}</p></div>
              </div>

              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                <h3 className="text-[14px] font-bold mb-4">Adicionar despesa</h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <input value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="Descrição (ex: Aluguel)" className="flex-1 h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                  <input value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="Valor" type="number" className="w-full md:w-32 h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-4 text-[14px] outline-none focus:border-[#2F6BFF]" />
                  <button onClick={() => {
                    if (!expenseDesc || !expenseAmount) { showToast('Preencha descrição e valor'); return; }
                    setTransactions([{ id: 't_' + Math.random().toString(36).slice(2, 6), storeId: store.id, type: 'expense', amount: Number(expenseAmount), date: new Date().toISOString(), description: expenseDesc }, ...transactions]);
                    setExpenseDesc(''); setExpenseAmount(''); showToast('Despesa adicionada');
                  }} className="h-11 px-6 rounded-[12px] bg-[#111B2E] border border-[#1E2D4A] text-[13px] font-bold hover:bg-[#14213A]">Adicionar</button>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-5">
                <h3 className="text-[14px] font-bold mb-4">Movimentações</h3>
                <div className="space-y-2">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-[#1E2D4A]/60 last:border-0">
                      <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'sale' ? 'bg-[#16A34A14] text-[#16A34A]' : t.type === 'expense' ? 'bg-[#EF444414] text-[#EF4444]' : 'bg-[#F59E0B14] text-[#F59E0B]'}`}><DollarSign className="w-4 h-4" /></div><div><p className="text-[13px] font-medium">{t.description}</p><p className="text-[11px] text-[#8B9BB4]">{new Date(t.date).toLocaleDateString('pt-BR')}</p></div></div>
                      <span className={`text-[13px] font-bold ${t.type === 'sale' ? 'text-[#16A34A]' : t.type === 'expense' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>{t.type === 'expense' || t.type === 'reversal' ? '-' : '+'}{fmtBRL(Math.abs(t.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CONFIG */}
          {view === 'config' && (
            <div className="max-w-[720px] space-y-4">
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <h3 className="text-[14px] font-bold">Loja</h3>
                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Nome</label><input value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px]" /></div>
                  <div><label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Email</label><input value={store.email} onChange={e => setStore({ ...store, email: e.target.value })} className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[14px]" /></div>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <h3 className="text-[14px] font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-[#2F6BFF]" /> Assinatura</h3>
                <div className="mt-4 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                  <div className="flex items-center justify-between"><span className="text-[13px]">Plano {PLAN_LABELS[subscription.plan] || 'Pro'} • {fmtBRL(subscription.price || PLAN_PRICES[subscription.plan] || 29.90)}/mês</span><span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${subscription.verified ? 'bg-[#16A34A14] text-[#16A34A] border-[#16A34A22]' : 'bg-[#F59E0B14] text-[#F59E0B] border-[#F59E0B22]'}`}>{subscription.verified ? 'VERIFICADO BACKEND' : 'DEMO verified=false'}</span></div>
                  <p className="text-[11px] text-[#8B9BB4] mt-2">Status: {subscription.status} • Trial até {subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString('pt-BR') : '—'}</p>
                  <p className="text-[10px] text-[#475569] mt-2 leading-[1.4]">TODO BACKEND: Integração Pix real via Stripe/Gerencianet, webhook /api/webhooks/pix atualiza Supabase subscriptions verified=true com RLS por storeId. Hoje é simulação segura local.</p>
                  <button onClick={() => setView('assinatura')} className="mt-3 h-9 px-4 rounded-[10px] bg-[#111B2E] border border-[#1E2D4A] text-[12px] font-semibold">Ver detalhes assinatura</button>
                </div>
              </div>

              {/* === V2.4 FIX: BACKUP E DADOS VISÍVEL === */}
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <h3 className="text-[14px] font-bold flex items-center gap-2"><FileCheck className="w-4 h-4 text-[#2F6BFF]" /> Backup e dados</h3>
                <p className="text-[11px] text-[#8B9BB4] mt-1">Exporte, restaure e gerencie seus dados por loja (storeId: {store.id})</p>
                <div className="mt-4 grid gap-3">
                  <button onClick={() => exportBackup(false)} className="w-full h-11 rounded-[12px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white text-[13px] font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Exportar backup completo .json</button>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#14213A] transition">
                      <Upload className="w-4 h-4" /> Importar/restaurar backup
                      <input ref={backupFileInputRef} type="file" accept=".json" className="hidden" onChange={(e)=>handleImportBackupFile(e)} />
                    </label>
                    <button onClick={()=>exportBackup(true)} className="h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A] transition"><DatabaseBackup className="w-4 h-4" /> Backup automático atual</button>
                  </div>
                  <div className="pt-3 border-t border-[#1E2D4A]/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Exportar Excel por loja</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={exportEstoqueExcel} className="h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A]"><FileSpreadsheet className="w-3.5 h-3.5" /> Estoque .xlsx</button>
                      <button onClick={exportVendasExcel} className="h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A]"><FileSpreadsheet className="w-3.5 h-3.5" /> Vendas .xlsx</button>
                      <button onClick={exportClientesExcel} className="h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A]"><FileSpreadsheet className="w-3.5 h-3.5" /> Clientes .xlsx</button>
                      <button onClick={exportFinanceiroExcel} className="h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A]"><FileSpreadsheet className="w-3.5 h-3.5" /> Financeiro .xlsx</button>
                    </div>
              <p className="text-[10px] text-[#475569] mt-3 leading-[1.3]">Backups e excels isolados por loja. Restauração cria backup automático antes de substituir. Tudo persiste após F5 via localStorage por storeId.</p>
                  </div>
                </div>
              </div>

              {/* V3.1a - CONFIGURAÇÃO TÉCNICA SUPABASE DISCRETA */}
              <div className="rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
                <button onClick={() => setShowTechConfig(!showTechConfig)} className="w-full flex items-center justify-between text-left">
                  <h3 className="text-[14px] font-bold flex items-center gap-2"><Database className="w-4 h-4 text-[#8B9BB4]" /> Configuração Técnica V3.1a - Supabase (Avançado) <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0B0F19] border border-[#1E2D4A] text-[#64748B]">PREP</span></h3>
                  <ChevronDown className={`w-4 h-4 text-[#8B9BB4] transition-transform ${showTechConfig ? 'rotate-180' : ''}`} />
                </button>
                {showTechConfig && (
                  <div className="mt-5 space-y-4 animate-[fadeIn_0.25s_ease]">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4]">Status</span>
                      {supabaseConfiguredLive || (sbUrlInput && sbAnonInput) ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#16A34A14] text-[#16A34A] border border-[#16A34A22] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Configurado</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#F59E0B14] text-[#F59E0B] border border-[#F59E0B22] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Não configurado - usando localStorage V3.0</span>
                      )}
                    </div>
                    <div className="grid gap-3">
                      <div>
                        <label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Supabase URL</label>
                        <input value={sbUrlInput} onChange={e=>setSbUrlInput(e.target.value)} placeholder="https://xxxx.supabase.co" className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[13px] font-mono outline-none focus:border-[#2F6BFF]" />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase font-semibold text-[#8B9BB4]">Supabase Anon Key (pública)</label>
                        <input type="password" value={sbAnonInput} onChange={e=>setSbAnonInput(e.target.value)} placeholder="eyJ..." className="mt-1 w-full h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] px-3 text-[13px] font-mono outline-none focus:border-[#2F6BFF]" />
                        <p className="text-[10px] text-[#475569] mt-1">Somente anon public - nunca service_role no frontend</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>{
                          try{
                            localStorage.setItem('nexgest_supabase_url', sbUrlInput.trim());
                            localStorage.setItem('nexgest_supabase_anon_key', sbAnonInput.trim());
                            setSupabaseConfiguredLive(!!(sbUrlInput.trim() && sbAnonInput.trim()));
                            showToast(sbUrlInput.trim() && sbAnonInput.trim() ? 'Config Supabase salva localmente' : 'Config removida - voltando localStorage V3.0');
                          }catch{ showToast('Erro ao salvar'); }
                        }} className="h-10 px-5 rounded-[12px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white text-[12px] font-bold flex items-center gap-1.5"><Database className="w-4 h-4" /> Salvar config</button>
                        <button onClick={()=>{
                          setSbUrlInput(''); setSbAnonInput('');
                          try{ localStorage.removeItem('nexgest_supabase_url'); localStorage.removeItem('nexgest_supabase_anon_key'); setSupabaseConfiguredLive(false); showToast('Config limpa'); }catch{}
                        }} className="h-10 px-4 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold">Limpar</button>
                      </div>
                    </div>
                    <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Instruções curtas</p>
                      <ol className="text-[11px] text-[#8B9BB4] space-y-1 list-decimal list-inside leading-[1.5]">
                        <li>Crie projeto em <span className="text-[#F1F5F9] font-mono">supabase.com</span> → New Project</li>
                        <li>Copie URL e anon key em Settings → API</li>
                        <li>Cole aqui e salve — fica só no seu navegador (localStorage)</li>
                      </ol>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={async()=>{
                        try{ await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL); showToast('SQL copiado'); }catch{ showToast('Copie manualmente o SQL'); }
                      }} className="h-10 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A]"><Copy className="w-4 h-4" /> Copiar SQL</button>
                      <button onClick={()=>setShowSupabaseGuide(true)} className="h-10 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#14213A]"><BookOpen className="w-4 h-4" /> Ver guia completo</button>
                    </div>
                    <div className="rounded-[12px] bg-[#F59E0B12] border border-[#F59E0B22] p-3 flex gap-2.5">
                      <Info className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#F59E0B] leading-[1.4]"><b>V3.1a PREP:</b> Conexão real será ativada nas próximas etapas V3.1b. Sistema atual continua funcionando como V3.0 com localStorage. Sem RLS completa ainda, sem troca de CRUD, sem auth real.</p>
                    </div>
                    <div className="rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] p-3">
                      <p className="text-[10px] text-[#64748B] font-mono leading-[1.4]">getSupabaseClient() → {supabaseConfiguredLive ? 'null (preparado, ainda não conectado)' : 'null (não configurado)'} • tabelas: profiles, stores, inventory, customers, sales, expenses</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[16px] bg-[#111B2E] border border-[#F59E0B22] p-6">
                <h3 className="text-[14px] font-bold flex items-center gap-2 text-[#F59E0B]"><AlertTriangle className="w-4 h-4" /> Diagnóstico arquitetura</h3>
                <div className="mt-4 space-y-3 text-[12px] leading-[1.5]">
                  <div className="flex gap-2"><span className="text-[#EF4444]">•</span><span className="text-[#8B9BB4]"><b className="text-[#F1F5F9]">Dados locais:</b> localStorage (nexgest_devices, sales, subscriptions) — risco de perda, sem backup. Falta migrar para Supabase com RLS por storeId.</span></div>
                  <div className="flex gap-2"><span className="text-[#EF4444]">•</span><span className="text-[#8B9BB4]"><b className="text-[#F1F5F9]">Backend:</b> não existe — tudo frontend. Precisa API Node/Next com autenticação real (bcrypt + JWT), Supabase Postgres.</span></div>
                  <div className="flex gap-2"><span className="text-[#EF4444]">•</span><span className="text-[#8B9BB4]"><b className="text-[#F1F5F9]">Auth:</b> mock — sem hash, sem sessão segura. Falta Supabase Auth.</span></div>
                  <div className="flex gap-2"><span className="text-[#F59E0B]">•</span><span className="text-[#8B9BB4]"><b className="text-[#F1F5F9]">Isolamento loja:</b> storeId presente mas sem RLS. Falta políticas Supabase por storeId.</span></div>
                  <div className="flex gap-2"><span className="text-[#F59E0B]">•</span><span className="text-[#8B9BB4]"><b className="text-[#F1F5F9]">Múltiplos usuários:</b> não preparado — precisa tabela users + store_members.</span></div>
                  <div className="flex gap-2"><span className="text-[#16A34A]">•</span><span className="text-[#8B9BB4]"><b className="text-[#F1F5F9]">Regras preservadas:</b> bateria 0-59/60-79/80-89/90-100, IMEI opcional com duplicidade, venda atômica, histórico, cancelamento restaura.</span></div>
                  <div className="mt-4 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] p-3 text-[11px] text-[#64748B]"><p className="font-semibold text-[#8B9BB4] mb-1">O que falta para nuvem:</p><p>1. Supabase projeto + tabelas devices/sales/transactions/subscriptions com RLS por storeId</p><p>2. Storage para fotos</p><p>3. Edge Function webhook Pix valida assinatura e seta verified=true</p><p>4. Backup automático + export CSV</p><p>5. Auth real + recuperação senha</p></div>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#0F1629] border border-[#1E2D4A] p-6">
                <h3 className="text-[13px] font-bold">Legal</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setView('assinatura')} className="h-9 px-4 rounded-[10px] bg-[#111B2E] border border-[#1E2D4A] text-[12px] font-medium">Política Assinatura</button>
                  <button onClick={handleLogout} className="h-9 px-4 rounded-[10px] bg-[#EF444414] border border-[#EF444422] text-[#EF4444] text-[12px] font-bold">Sair da conta</button>
                </div>
              </div>
            </div>
          )}

          {view === 'assinatura' && (
            <div className="max-w-[560px] mx-auto rounded-[16px] bg-[#111B2E] border border-[#1E2D4A] p-6">
              <h2 className="text-[16px] font-bold">Assinatura</h2>
              <p className="text-[12px] text-[#8B9BB4] mt-1">Detalhes e próximos passos backend</p>
              <div className="mt-5 space-y-3 text-[13px]">
                <div className="flex justify-between"><span className="text-[#8B9BB4]">Plano</span><span className="font-bold">{PLAN_LABELS[subscription.plan] || 'Pro'} {fmtBRL(subscription.price || PLAN_PRICES[subscription.plan] || 29.90)}/mês</span></div>
                <div className="flex justify-between"><span className="text-[#8B9BB4]">Status</span><span className="font-bold">{subscription.status} {subscription.verified ? '(verificado)' : '(DEMO)'}</span></div>
                <div className="flex justify-between"><span className="text-[#8B9BB4]">Verificado backend</span><span className={`font-bold ${subscription.verified ? 'text-[#16A34A]' : 'text-[#F59E0B]'}`}>{subscription.verified ? 'Sim' : 'Não — simulação'}</span></div>
                <div className="mt-4 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-3 text-[11px] text-[#8B9BB4] leading-[1.5]"><p className="font-bold text-[#F1F5F9] mb-1">O que falta para pagamento real:</p><p>• Provedor: Stripe Pix ou Gerencianet Efí</p><p>• Checkout session com storeId metadata</p><p>• Webhook /api/webhooks/pix valida assinatura e atualiza verified=true</p><p>• Frontend só libera dashboard se verified=true (hoje libera com DEMO para teste)</p><p>• Não usar apenas variável frontend — validar no backend a cada request</p></div>
                <button onClick={() => setView('config')} className="mt-4 w-full h-10 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Voltar</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      {isAppView && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-[#0B0F19]/95 backdrop-blur-xl border-t border-[#1E2D4A] flex items-center justify-around px-2 z-30">
          {[
            { id: 'dashboard', label: 'Início', icon: Home },
            { id: 'estoque', label: 'Estoque', icon: Package },
            { id: 'plus', label: '', icon: Plus, central: true },
            { id: 'vendas', label: 'Vendas', icon: Receipt },
            { id: 'financeiro', label: 'Financeiro', icon: Wallet },
          ].map(item => {
            if (item.central) {
              return (
                <button key={item.id} onClick={() => setShowPlusSheet(true)} className="relative -top-3 w-14 h-14 rounded-full bg-[#2F6BFF] shadow-[0_8px_24px_rgba(47,107,255,0.45)] flex items-center justify-center active:scale-95 transition">
                  <Plus className="w-7 h-7 text-white" />
                </button>
              );
            }
            const active = view === item.id || (item.id === 'vendas' && ['clientes','clienteDetalhe','clienteForm'].includes(view));
            return (
              <button key={item.id} onClick={() => setView(item.id as any)} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-[12px] transition ${active ? 'text-[#2F6BFF]' : 'text-[#64748B]'}`}>
                <item.icon className={`w-5 h-5 ${active ? 'stroke-[2.2]' : ''}`} />
                <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* LOADING SPINNER - evita tela escura */}
      {isLoadingApp && isLogged && (
        <div className="fixed inset-0 z-[100] bg-[#0B0F19] flex flex-col items-center justify-center gap-4">
          <LogoIcon size={48} />
          <div className="flex items-center gap-2 text-[13px] text-[#8B9BB4]"><div className="w-4 h-4 border-2 border-[#1E2D4A] border-t-[#2F6BFF] rounded-full animate-spin" /> Carregando sua loja...</div>
        </div>
      )}

      {/* PLUS SHEET - V2.3.1 com Ver comprovantes */}
      {showPlusSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlusSheet(false)} />
          <div className="relative w-full max-w-[440px] rounded-t-[24px] bg-[#111B2E] border border-[#1E2D4A] p-6 pb-10 animate-[slideUp_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="w-10 h-1 rounded-full bg-[#1E2D4A] mx-auto mb-6" />
            <h3 className="text-[16px] font-bold mb-5">Ações rápidas</h3>
            <div className="space-y-3">
              {[
                { label: 'Adicionar aparelho', desc: 'Foto, IMEI, bateria', icon: Package, action: () => { setShowPlusSheet(false); resetAddForm(); setView('add'); } },
                { label: 'Registrar venda', desc: 'Escolha aparelho no estoque', icon: Receipt, action: () => { setShowPlusSheet(false); setView('estoque'); showToast('Selecione um aparelho e toque em Vender'); } },
                { label: 'Ver comprovantes', desc: `${filteredComprovantes.length} comprovantes`, icon: Receipt, action: () => { setShowPlusSheet(false); setSalesSubTab('comprovantes'); setView('vendas'); } },
                { label: 'Ver clientes', desc: `${storeClients.length} cadastrados`, icon: Users, action: () => { setShowPlusSheet(false); setSalesSubTab('clientes'); setView('vendas'); } },
                { label: 'Novo cliente', desc: 'Cadastro rápido', icon: UserPlus, action: () => { setShowPlusSheet(false); openClientForm(); } },
                { label: 'Adicionar despesa', desc: 'Aluguel, taxas', icon: Wallet, action: () => { setShowPlusSheet(false); setView('financeiro'); } },
              ].map((a, i) => (
                <button key={i} onClick={a.action} className="w-full flex items-center gap-4 p-4 rounded-[16px] bg-[#0B0F19] border border-[#1E2D4A] hover:bg-[#14213A] transition text-left active:scale-[0.99]">
                  <div className="w-10 h-10 rounded-full bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center"><a.icon className="w-5 h-5 text-[#2F6BFF]" /></div>
                  <div className="flex-1"><p className="text-[14px] font-semibold">{a.label}</p><p className="text-[12px] text-[#8B9BB4]">{a.desc}</p></div>
                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowPlusSheet(false)} className="mt-5 w-full h-11 rounded-[14px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Fechar</button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL - V2.3.1 SEM PRINT */}
      {receiptSale && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-5">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setReceiptSale(null)} />
          <div className="relative w-full md:max-w-[480px] max-h-[92vh] md:max-h-[86vh] rounded-t-[20px] md:rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] flex flex-col overflow-hidden animate-[slideUp_0.28s_ease] receipt-print-area">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1E2D4A] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#1E2D4A] flex items-center justify-center"><Receipt className="w-5 h-5 text-[#F1F5F9]" /></div>
                <div>
                  <p className="text-[14px] font-bold">Comprovante</p>
                  <p className="text-[11px] text-[#8B9BB4]">#{receiptSale.id.slice(-4).toUpperCase()} • {formatReceiptDateTime(receiptSale.saleDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>handleShareReceipt(receiptSale)} className="h-9 px-4 rounded-[10px] bg-[#1E2D4A] hover:bg-[#23365A] text-[12px] font-semibold flex items-center gap-1.5"><Share2 className="w-4 h-4" /> Compartilhar</button>
                <button onClick={()=>setReceiptSale(null)} className="w-9 h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {receiptSale.isCanceled && (
                <div className="rounded-[12px] bg-[#EF444420] border border-[#EF444430] p-3 text-center">
                  <p className="text-[14px] font-black tracking-[0.5px] text-[#EF4444]">VENDA CANCELADA</p>
                  <p className="text-[11px] text-[#EF4444]/80 mt-1">Este comprovante refere-se a uma venda cancelada</p>
                </div>
              )}
              <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Loja</p>
                <p className="text-[14px] font-bold text-white">{store.name || 'Não informado'}</p>
                <p className="text-[12px] text-[#8B9BB4] mt-1">{store.phone || 'Telefone não informado'}</p>
                <p className="text-[11px] text-[#64748B] mt-1">{store.address || 'Endereço não informado'}</p>
              </div>
              <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Venda</p>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div><p className="text-[#8B9BB4]">ID</p><p className="font-mono font-bold text-white">#{receiptSale.id.slice(-4).toUpperCase()} ({receiptSale.id})</p></div>
                  <div><p className="text-[#8B9BB4]">Data</p><p className="font-medium text-white">{formatReceiptDateTime(receiptSale.saleDate)}</p></div>
                </div>
              </div>
              <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Cliente</p>
                {(() => {
                  const clientObj = receiptSale.clientId ? clients.find(c=>c.id===receiptSale.clientId) : null;
                  const name = clientObj ? clientObj.name : (receiptSale.clientNameSnapshot || (receiptSale.clientId ? 'Cliente removido' : 'Venda avulsa / Não informado'));
                  const phone = clientObj ? clientObj.phone : getClientPhoneForSale(receiptSale) || 'Não informado';
                  return (
                    <div className="space-y-1">
                      <p className="text-[13px] font-semibold text-white">{name}</p>
                      <p className="text-[12px] text-[#8B9BB4]">Telefone: {phone}</p>
                    </div>
                  );
                })()}
              </div>
              <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Aparelho</p>
                <p className="text-[13px] font-semibold text-white">{receiptSale.deviceSnapshot.brand} {receiptSale.deviceSnapshot.model}</p>
                <p className="text-[12px] text-[#8B9BB4] mt-1">Armazenamento: {receiptSale.deviceSnapshot.storage || 'Não informado'} • Cor: {receiptSale.deviceSnapshot.color || 'Não informado'} • Condição: {receiptSale.deviceSnapshot.condition || 'Não informado'}</p>
                <p className="text-[12px] text-[#8B9BB4] mt-1 font-mono">IMEI: {receiptSale.deviceSnapshot.imei || 'Não informado'}</p>
                {receiptSale.deviceSnapshot.notes && <p className="text-[11px] text-[#64748B] mt-2">Obs aparelho: {receiptSale.deviceSnapshot.notes}</p>}
              </div>
              <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">Valores e Pagamento</p>
                <div className="flex justify-between text-[12px]"><span className="text-[#8B9BB4]">Valor original</span><span className="font-medium text-white">{receiptSale.originalPrice ? fmtBRL(receiptSale.originalPrice) : fmtBRL(receiptSale.deviceSnapshot.price || receiptSale.salePrice)}</span></div>
                {receiptSale.discount && receiptSale.discount>0 && <div className="flex justify-between text-[12px]"><span className="text-[#8B9BB4]">Desconto</span><span className="font-medium text-[#16A34A]">-{fmtBRL(receiptSale.discount)}</span></div>}
                <div className="flex justify-between text-[13px] font-bold"><span className="text-white">Valor final</span><span className="text-white">{fmtBRL(receiptSale.salePrice)}</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-[#8B9BB4]">Pagamento</span><span className="text-white">{receiptSale.paymentMethod || 'Não informado'}{receiptSale.installments ? ` em ${receiptSale.installments}x` : ''}</span></div>
                {receiptSale.fees ? <div className="flex justify-between text-[12px]"><span className="text-[#8B9BB4]">Taxas</span><span className="text-white">{fmtBRL(receiptSale.fees)}</span></div> : null}
                {receiptSale.observations && <p className="text-[11px] text-[#8B9BB4] mt-2">Obs: {receiptSale.observations}</p>}
              </div>
              {receiptSale.deviceSnapshot.hasWarranty && (
                <div className="rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Garantia</p>
                  <p className="text-[12px] text-white">{receiptSale.deviceSnapshot.warrantyDuration || '—'} {receiptSale.deviceSnapshot.warrantyUnit || ''} • Início {fmtDateBR(receiptSale.deviceSnapshot.warrantyStartDate)} • Venc {fmtDateBR(receiptSale.deviceSnapshot.warrantyEndDate)}</p>
                  {receiptSale.deviceSnapshot.warrantyNote && <p className="text-[11px] text-[#8B9BB4] mt-1">{receiptSale.deviceSnapshot.warrantyNote}</p>}
                </div>
              )}
              <p className="text-[10px] text-[#475569] text-center pt-2">Gerado em {new Date().toLocaleString('pt-BR')} • {store.name}</p>
            </div>
            <div className="p-4 border-t border-[#1E2D4A] flex gap-2 shrink-0">
              <button onClick={()=>setReceiptSale(null)} className="flex-1 h-11 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[13px] font-semibold">Fechar</button>
              <button onClick={()=>handleShareReceipt(receiptSale)} className="flex-1 h-11 rounded-[12px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white text-[13px] font-bold flex items-center justify-center gap-1.5"><Share2 className="w-4 h-4" /> Compartilhar / Copiar</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL APOS VENDA - SEM PRINT */}
      {showSaleSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowSaleSuccessModal(null)} />
          <div className="relative w-full max-w-[360px] rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] p-6 text-center animate-[slideUp_0.28s_ease]">
            <div className="w-12 h-12 rounded-full bg-[#16A34A14] border border-[#16A34A22] mx-auto flex items-center justify-center mb-4"><CheckCircle2 className="w-6 h-6 text-[#16A34A]" /></div>
            <h3 className="text-[16px] font-bold">Venda registrada!</h3>
            <p className="text-[12px] text-[#8B9BB4] mt-1">{showSaleSuccessModal.deviceSnapshot.brand} {showSaleSuccessModal.deviceSnapshot.model} por {fmtBRL(showSaleSuccessModal.salePrice)}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={()=>{ const s=showSaleSuccessModal; setShowSaleSuccessModal(null); openReceipt(s); }} className="h-10 rounded-[12px] bg-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5"><Eye className="w-4 h-4" /> Ver comprovante</button>
              <button onClick={()=>{ if(showSaleSuccessModal) handleShareReceipt(showSaleSuccessModal); }} className="h-10 rounded-[12px] bg-[#2F6BFF] text-white text-[12px] font-bold flex items-center justify-center gap-1.5"><Share2 className="w-4 h-4" /> Compartilhar</button>
            </div>
            <button onClick={()=>setShowSaleSuccessModal(null)} className="mt-3 w-full h-10 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] text-[12px] font-semibold">Fechar</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-[84px] md:bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-full bg-[#111B2E] border border-[#1E2D4A] shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-[13px] font-medium flex items-center gap-2 animate-[slideUp_0.25s_ease]">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> {toast}
        </div>
      )}

      {/* V3.1a - MODAL GUIA SUPABASE SETUP */}
      {showSupabaseGuide && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-5">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowSupabaseGuide(false)} />
          <div className="relative w-full md:max-w-[640px] max-h-[90vh] md:max-h-[85vh] rounded-t-[20px] md:rounded-[20px] bg-[#111B2E] border border-[#1E2D4A] flex flex-col overflow-hidden animate-[slideUp_0.28s_ease]">
            <div className="flex items-center justify-between p-5 border-b border-[#1E2D4A] shrink-0">
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-[10px] bg-[#1A2744] border border-[#1E2D4A] flex items-center justify-center"><BookOpen className="w-5 h-5 text-[#2F6BFF]" /></div><div><p className="text-[14px] font-bold">SUPABASE-SETUP.md</p><p className="text-[11px] text-[#8B9BB4]">Guia curto V3.1a</p></div></div>
              <button onClick={()=>setShowSupabaseGuide(false)} className="w-9 h-9 rounded-[10px] bg-[#0B0F19] border border-[#1E2D4A] flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
              <pre className="whitespace-pre-wrap text-[12px] leading-[1.6] text-[#8B9BB4] font-mono bg-[#0B0F19] border border-[#1E2D4A] rounded-[12px] p-4">{SUPABASE_SETUP_MD}</pre>
              <div className="mt-4 rounded-[12px] bg-[#0B0F19] border border-[#1E2D4A] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#8B9BB4] mb-2">SQL Preview</p>
                <pre className="whitespace-pre-wrap text-[10px] leading-[1.4] text-[#64748B] font-mono max-h-[180px] overflow-y-auto no-scrollbar">{SUPABASE_SCHEMA_SQL.slice(0, 1200)}... (copie completo com botão)</pre>
              </div>
            </div>
            <div className="p-4 border-t border-[#1E2D4A] flex gap-2 shrink-0">
              <button onClick={async()=>{ try{ await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL); showToast('SQL copiado'); }catch{} }} className="flex-1 h-11 rounded-[12px] bg-[#1E2D4A] text-[12px] font-semibold flex items-center justify-center gap-1.5"><Copy className="w-4 h-4" /> Copiar SQL</button>
              <button onClick={()=>setShowSupabaseGuide(false)} className="flex-1 h-11 rounded-[12px] bg-[#2F6BFF] hover:bg-[#1E5EFF] text-white text-[12px] font-bold">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @media print { body * { visibility: hidden; } .receipt-print-area, .receipt-print-area * { visibility: visible; } .receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}
