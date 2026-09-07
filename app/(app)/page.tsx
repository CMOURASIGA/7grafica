import { MetricCard, PageIntro, SectionLabel, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { getSessaoAtual } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/env";
import { PAPEL_LABEL } from "@/lib/rbac";

export default async function DashboardPage() {
  const supabaseConfigurado = hasSupabaseConfig();
  const sessao = supabaseConfigurado ? await getSessaoAtual() : null;
  const empresa = sessao?.empresaAtiva ?? null;
  const papel = empresa?.papel ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Foundation"
        title={`Bem-vindo${sessao?.perfil?.nome ? `, ${sessao.perfil.nome}` : ""}`}
        description="Esta e a base tecnica e visual do 7Grafica. Os modulos operacionais (solicitacoes, orcamentos, pedidos, producao, estoque, financeiro e portal) chegam nas proximas specs."
        aside={<StatusPill tone={empresa ? "success" : "neutral"}>{empresa ? empresa.nome : "Sem empresa vinculada"}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Empresa ativa" value={empresa?.nome ?? "—"} helper={empresa?.ativo ? "Ativa" : "Sem vinculo"} />
        <MetricCard label="Seu papel" value={papel ? PAPEL_LABEL[papel] : "—"} helper="Define o que voce pode acessar" />
        <MetricCard
          label="Supabase"
          value={supabaseConfigurado ? "Conectado" : "Nao configurado"}
          helper={supabaseConfigurado ? "RLS e RBAC ativos" : "Defina as variaveis de ambiente"}
        />
      </div>

      <SurfaceCard className="p-5">
        <SectionLabel>Proximos passos do produto</SectionLabel>
        <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
          A SPEC 02 introduz cadastros (clientes, contatos, fornecedores, servicos, materiais, equipamentos e
          workflows). Nada disso e antecipado aqui: esta tela existe apenas para validar shell, navegacao,
          autenticacao e identidade visual.
        </p>
      </SurfaceCard>
    </div>
  );
}
