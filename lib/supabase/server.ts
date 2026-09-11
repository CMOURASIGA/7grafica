import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";

// Sem o generic <Database>: ver nota em lib/supabase/client.ts.

/**
 * Cliente Supabase server-side que le/escreve os cookies de sessao do
 * usuario autenticado. Respeita RLS: toda query passa pelo JWT do usuario,
 * nunca pela service role. Use este cliente em Server Components, Route
 * Handlers e Server Actions que leem/gravam dados de negocio.
 */
export async function getSupabaseServerClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component sem permissao de escrita
          // de cookies (o middleware ja cuida do refresh de sessao nesse caso).
        }
      },
    },
  });
}

/**
 * Cliente com a service role key: ignora RLS. Restrito a rotinas internas
 * de sistema (ex.: jobs administrativos, auditoria de sistema). Nunca deve
 * ser exposto a uma requisicao autenticada por usuario final.
 */
export function getSupabaseServiceRoleClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
