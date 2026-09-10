"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MetricCard, PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import type { DashboardGestao } from "@/lib/domain/relatorios";
import { papelTemPermissao, PAPEL_LABEL, PERMISSOES } from "@/lib/rbac";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardPage() {
  const repos = useRepositories(), { sessao } = useSessao(), empresa = sessao?.empresaAtiva ?? null, papel = empresa?.papel ?? null;
  const podeVerGestao = Boolean(papel && papelTemPermissao(papel, PERMISSOES.RELATORIOS_CONSULTAR));
  const [dashboard, setDashboard] = useState<DashboardGestao | null>(null);
  useEffect(() => { if (!empresa || !podeVerGestao) return; let ativo = true; repos.relatorios.obterDashboard(empresa.id).then((dados) => { if (ativo) setDashboard(dados); }); return () => { ativo = false; }; }, [empresa, podeVerGestao, repos]);
  return <div className="flex flex-col gap-4">
    <PageIntro eyebrow="Visão geral" title={`Bem-vindo${sessao?.usuario.nome ? `, ${sessao.usuario.nome}` : ""}`} description={podeVerGestao ? "Indicadores atuais da operação, calculados diretamente a partir dos módulos consolidados." : "Acompanhe sua área de trabalho conforme as permissões do seu perfil."} aside={<StatusPill tone={empresa ? "success" : "neutral"}>{empresa ? empresa.nome : "Sem empresa vinculada"}</StatusPill>} />
    {podeVerGestao && dashboard ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Pedidos novos" value={dashboard.pedidosNovos} helper="No mês atual" /><MetricCard label="Em produção" value={dashboard.emProducao} helper={`${dashboard.atrasados} atrasados`} /><MetricCard label="Prontos" value={dashboard.prontos} helper="Prontos ou aguardando retirada" /><MetricCard label="Estoque crítico" value={dashboard.estoqueCritico} helper="Itens abaixo do mínimo" /></div><div className="grid gap-3 sm:grid-cols-2"><MetricCard label="Faturamento de Pedidos" value={moeda(dashboard.faturamentoPedidos)} helper="Valor comercial dos Pedidos criados no mês" /><MetricCard label="Recebimentos" value={moeda(dashboard.recebimentos)} helper="Entradas registradas no mês" /></div><SurfaceCard className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><SectionLabel>Análise detalhada</SectionLabel><p className="mt-2 text-sm text-(--text-secondary)">Consulte vendas, conversão, produção, perdas, compras, financeiro, clientes e equipamentos.</p></div><Link href="/relatorios" className="workspace-button-primary">Abrir relatórios</Link></div></SurfaceCard></> : null}
    {!podeVerGestao ? <div className="grid gap-4 sm:grid-cols-2"><MetricCard label="Empresa ativa" value={empresa?.nome ?? "Sem vínculo"} helper={empresa?.ativo ? "Ativa" : "Indisponível"} /><MetricCard label="Seu papel" value={papel ? PAPEL_LABEL[papel] : "Sem papel"} helper="Define módulos e ações disponíveis" /></div> : null}
    <SurfaceCard className="p-5" muted><SectionLabel>Persistência do MVP</SectionLabel><p className="mt-3 text-sm leading-6 text-(--text-secondary)">Os indicadores são agregações de leitura sobre o dataset local-first. Não criam cópias de Pedido, Financeiro, Estoque, Produção, Cliente ou Entrega.</p></SurfaceCard>
  </div>;
}
