"use client";

import { useEffect, useState, useTransition } from "react";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import type { Exigencia2FA, Politica2FAPapel } from "@/lib/domain/administracao";
import type { Papel } from "@/lib/domain/entities";
import { MATRIZ_PAPEIS, PAPEL_LABEL } from "@/lib/rbac";

const PAPEIS: Papel[] = ["admin", "gerente", "atendente", "operador"];

export function SegurancaAdmin() {
  const repos = useRepositories(), { sessao } = useSessao(), { showToast } = useToast(), empresaId = sessao?.empresaAtiva?.id;
  const [politicas, setPoliticas] = useState<Politica2FAPapel[]>([]), [pending, startTransition] = useTransition();
  useEffect(() => { if (!empresaId) return; repos.administracao.obter(empresaId).then((c) => setPoliticas(c.politicas2FA)); }, [empresaId, repos]);
  function alterar(papel: Papel, exigencia: Exigencia2FA) { if (!empresaId || !sessao) return; startTransition(async () => { try { const c = await repos.administracao.definirPolitica2FA(empresaId, { papel, exigencia }, sessao.usuario.id); setPoliticas(c.politicas2FA); showToast("Política de 2FA atualizada.", "success"); } catch (e) { showToast(e instanceof Error ? e.message : "Falha ao atualizar política.", "error"); } }); }
  return <div className="space-y-5"><div><p className="text-sm text-(--text-secondary)">A política registra se cada perfil terá 2FA opcional ou obrigatório. No modo local-first ela sinaliza conformidade; o desafio real depende do Supabase Auth na etapa de infraestrutura definitiva.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{PAPEIS.map((papel) => <div className="rounded-xl border border-(--border) p-3" key={papel}><label className="workspace-label" htmlFor={`mfa-${papel}`}>{PAPEL_LABEL[papel]}</label><select id={`mfa-${papel}`} className="workspace-input" disabled={pending} value={politicas.find((p) => p.papel === papel)?.exigencia ?? "opcional"} onChange={(e) => alterar(papel, e.target.value as Exigencia2FA)}><option value="opcional">Opcional</option><option value="obrigatorio">Obrigatório</option></select></div>)}</div></div><div><p className="workspace-section-label">Matriz efetiva de permissões</p><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b border-(--border)"><th className="p-2">Perfil</th><th className="p-2">Permissões</th></tr></thead><tbody>{PAPEIS.map((papel) => <tr className="border-b border-(--border)" key={papel}><td className="p-2 font-semibold">{PAPEL_LABEL[papel]}</td><td className="p-2 text-(--text-secondary)">{MATRIZ_PAPEIS[papel].join(", ")}</td></tr>)}</tbody></table></div></div></div>;
}
