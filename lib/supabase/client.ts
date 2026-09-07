"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

// Sem o generic <Database>: o schema em lib/supabase/types.ts e um esqueleto
// manual (nao gerado pelo CLI) e nao modela Relationships/Functions, entao
// tipar o client com ele deixa o query builder inferir `never` em vez de
// ajudar. Uso explicito dos tipos de dominio acontece no call-site.
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Cliente Supabase para uso em componentes client-side.
 * Retorna null quando o ambiente nao tem Supabase configurado, para permitir
 * rodar a Foundation localmente (build/preview) sem segredos.
 */
export function getSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  return browserClient;
}
