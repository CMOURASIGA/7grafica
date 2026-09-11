import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RegistrarAuditoriaInput = {
  empresaId: string;
  usuarioId: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
};

/**
 * Grava um evento de auditoria. Chamar a partir de toda Server Action que
 * cria/edita/remove dados sensiveis (usuarios, papeis, whitelabel, feature
 * flags nesta SPEC; entidades de negocio nas specs seguintes).
 *
 * Nao lanca em caso de falha de escrita — auditoria nao deve derrubar a
 * operacao principal, mas a falha e logada no servidor para investigacao.
 */
export async function registrarAuditoria(input: RegistrarAuditoriaInput): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  const { error } = await supabase.from("eventos_auditoria").insert({
    empresa_id: input.empresaId,
    usuario_id: input.usuarioId,
    acao: input.acao,
    entidade: input.entidade,
    entidade_id: input.entidadeId ?? null,
    dados_antes: input.dadosAntes ?? null,
    dados_depois: input.dadosDepois ?? null,
  });

  if (error) {
    console.error("[auditoria] falha ao registrar evento", { acao: input.acao, entidade: input.entidade, error });
  }
}
