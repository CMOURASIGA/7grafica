"use client";

import { MetricCard, PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useSessao } from "@/components/providers/session-provider";
import { PAPEL_LABEL } from "@/lib/rbac";

export default function DashboardPage() {
  const { sessao } = useSessao();
  const empresa = sessao?.empresaAtiva ?? null;
  const papel = empresa?.papel ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Foundation"
        title={`Bem-vindo${sessao?.usuario.nome ? `, ${sessao.usuario.nome}` : ""}`}
        description="Esta e a base tecnica e visual do 7Grafica, rodando em modo de validacao local (dados em LocalStorage, prontos para migrar ao Supabase definitivo)."
        aside={<StatusPill tone={empresa ? "success" : "neutral"}>{empresa ? empresa.nome : "Sem empresa vinculada"}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Empresa ativa" value={empresa?.nome ?? "—"} helper={empresa?.ativo ? "Ativa" : "Sem vinculo"} />
        <MetricCard label="Seu papel" value={papel ? PAPEL_LABEL[papel] : "—"} helper="Define o que voce pode acessar" />
        <MetricCard label="Persistencia" value="LocalStorage" helper="Fase de validacao — Supabase preparado para depois" />
      </div>

      <SurfaceCard className="p-5">
        <SectionLabel>Cadastros mestres (SPEC 02)</SectionLabel>
        <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
          Clientes, contatos, fornecedores, servicos, materiais, equipamentos, formas de pagamento e workflows ja
          estao disponiveis no menu <strong>Cadastros</strong>. Os dados sao os mesmos que aparecerao no PDV, no
          orcamento, no pedido e no portal quando essas specs chegarem — nada e recriado do zero por tela.
        </p>
      </SurfaceCard>
    </div>
  );
}
