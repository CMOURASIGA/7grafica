"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/auditoria";
import { PERMISSOES } from "@/lib/rbac";
import { getSessaoAtual } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/supabase/types";

export type AcaoResultado = { ok: true } | { ok: false; erro: string };

/**
 * Atualiza dados de whitelabel/empresa. A policy de RLS ja bloqueia sem a
 * permissao correta — a checagem aqui e defesa em profundidade e o ponto
 * onde a auditoria e registrada com o "antes" e "depois".
 */
export async function atualizarEmpresaAction(formData: FormData): Promise<AcaoResultado> {
  const sessao = await getSessaoAtual();
  const empresa = sessao?.empresaAtiva;
  if (!sessao || !empresa) return { ok: false, erro: "Sessao invalida." };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, erro: "Supabase indisponivel." };

  const dadosDepois = {
    nome: String(formData.get("nome") ?? "").trim(),
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    cor_primaria: String(formData.get("cor_primaria") ?? "").trim() || null,
    cor_destaque: String(formData.get("cor_destaque") ?? "").trim() || null,
  };

  if (!dadosDepois.nome) return { ok: false, erro: "Informe o nome da empresa." };

  const { error } = await supabase.from("empresas").update(dadosDepois).eq("id", empresa.id);
  if (error) return { ok: false, erro: "Sem permissao ou falha ao salvar." };

  await registrarAuditoria({
    empresaId: empresa.id,
    usuarioId: sessao.usuario.id,
    acao: "empresa.atualizar",
    entidade: "empresas",
    entidadeId: empresa.id,
    dadosAntes: { nome: empresa.nome, logo_url: empresa.logo_url, cor_primaria: empresa.cor_primaria, cor_destaque: empresa.cor_destaque },
    dadosDepois,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true };
}

export async function alterarPapelUsuarioAction(vinculoId: string, novoPapel: Papel): Promise<AcaoResultado> {
  const sessao = await getSessaoAtual();
  const empresa = sessao?.empresaAtiva;
  if (!sessao || !empresa) return { ok: false, erro: "Sessao invalida." };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, erro: "Supabase indisponivel." };

  const { data: vinculoAntes } = await supabase
    .from("empresa_usuarios")
    .select("*")
    .eq("id", vinculoId)
    .maybeSingle();

  const { error } = await supabase.from("empresa_usuarios").update({ papel: novoPapel }).eq("id", vinculoId);
  if (error) return { ok: false, erro: "Sem permissao ou falha ao salvar." };

  await registrarAuditoria({
    empresaId: empresa.id,
    usuarioId: sessao.usuario.id,
    acao: "empresa_usuarios.alterar_papel",
    entidade: "empresa_usuarios",
    entidadeId: vinculoId,
    dadosAntes: vinculoAntes ? { papel: vinculoAntes.papel } : null,
    dadosDepois: { papel: novoPapel },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function alternarAtivoUsuarioAction(vinculoId: string, ativo: boolean): Promise<AcaoResultado> {
  const sessao = await getSessaoAtual();
  const empresa = sessao?.empresaAtiva;
  if (!sessao || !empresa) return { ok: false, erro: "Sessao invalida." };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, erro: "Supabase indisponivel." };

  const { error } = await supabase.from("empresa_usuarios").update({ ativo }).eq("id", vinculoId);
  if (error) return { ok: false, erro: "Sem permissao ou falha ao salvar." };

  await registrarAuditoria({
    empresaId: empresa.id,
    usuarioId: sessao.usuario.id,
    acao: ativo ? "empresa_usuarios.reativar" : "empresa_usuarios.desativar",
    entidade: "empresa_usuarios",
    entidadeId: vinculoId,
    dadosDepois: { ativo },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

export { PERMISSOES };
