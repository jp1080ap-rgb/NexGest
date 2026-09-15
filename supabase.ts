// V3.1a - Configuração Supabase - Módulo separado
// Apenas Anon Key pública, nunca secret. Sem conexão ainda nesta etapa.

export const SUPABASE_CONFIG = {
  url: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || (typeof localStorage !== 'undefined' ? localStorage.getItem('nexgest_supabase_url') : '') || '',
  anonKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem('nexgest_supabase_anon_key') : '') || '',
  get isConfigured() {
    return !!(this.url && this.anonKey);
  },
  saveLocal(url: string, anonKey: string) {
    try {
      localStorage.setItem('nexgest_supabase_url', url);
      localStorage.setItem('nexgest_supabase_anon_key', anonKey);
      this.url = url;
      this.anonKey = anonKey;
    } catch {}
  }
};

// Preparada, mas ainda não executa conexão nesta etapa V3.1a
export function getSupabaseClient() {
  // Na V3.1b retornará createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  // Nesta etapa retorna null para preservar funcionamento V3.0 com localStorage
  return null;
}

export const SUPABASE_TABLES = {
  profiles: 'profiles',
  stores: 'stores',
  inventory: 'inventory',
  customers: 'customers',
  sales: 'sales',
  expenses: 'expenses',
  subscriptions: 'subscriptions',
} as const;
