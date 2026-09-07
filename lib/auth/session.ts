import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Empresa, EmpresaUsuario, UsuarioPerfil } from "@/lib/supabase/types";

export type SessaoAtual = {
  usuario: { id: string; email: string | null };
  perfil: UsuarioPerfil | null;
  vinculos: Array<EmpresaUsuario & { empresa: Empresa }>;
  empresaAtiva: (Empresa & { papel: EmpresaUsuario["papel"] }) | null;
};

/**
 * Carrega o usuario autenticado (via cookie de sessao) e suas empresas.
 * Retorna null quando nao ha sessao — quem chama decide se isso bloqueia a
 * rota (ver AppShell) ou apenas degrada a UI.
 *
 * A empresa ativa e a primeira vinculada e ativa; troca de empresa (para
 * quando um usuario acessa mais de um cliente whitelabel) fica fora do
 * escopo desta SPEC.
 */
export async function getSessaoAtual(): Promise<SessaoAtual | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: vinculosRaw }] = await Promise.all([
    supabase.from("usuarios_perfil").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("empresa_usuarios")
      .select("*, empresa:empresas(*)")
      .eq("usuario_id", user.id)
      .eq("ativo", true),
  ]);

  const vinculos = (vinculosRaw ?? []) as Array<EmpresaUsuario & { empresa: Empresa }>;
  const primeiro = vinculos[0];

  return {
    usuario: { id: user.id, email: user.email ?? null },
    perfil: (perfil as UsuarioPerfil | null) ?? null,
    vinculos,
    empresaAtiva: primeiro ? { ...primeiro.empresa, papel: primeiro.papel } : null,
  };
}
