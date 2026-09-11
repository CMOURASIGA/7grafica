"use client";

import Link from "next/link";
import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES, type Permissao } from "@/lib/rbac";

const GRUPOS: { titulo: string; descricao: string; href: string; permissaoRequerida: Permissao }[] = [
  {
    titulo: "Clientes",
    descricao: "Clientes PF/PJ, contatos e e-mails para identificacao rapida.",
    href: "/cadastros/clientes",
    permissaoRequerida: PERMISSOES.CLIENTES_GERENCIAR,
  },
  {
    titulo: "Fornecedores",
    descricao: "Fornecedores de materiais e insumos.",
    href: "/cadastros/fornecedores",
    permissaoRequerida: PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
  },
  {
    titulo: "Servicos",
    descricao: "Servicos oferecidos e suas categorias.",
    href: "/cadastros/servicos",
    permissaoRequerida: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
  },
  {
    titulo: "Materiais",
    descricao: "Materiais, unidades de medida e conversoes de compra/consumo.",
    href: "/cadastros/materiais",
    permissaoRequerida: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
  },
  {
    titulo: "Equipamentos",
    descricao: "Equipamentos de producao e suas capacidades.",
    href: "/cadastros/equipamentos",
    permissaoRequerida: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
  },
  {
    titulo: "Formas de pagamento",
    descricao: "Formas de pagamento aceitas no balcao e no portal.",
    href: "/cadastros/formas-pagamento",
    permissaoRequerida: PERMISSOES.CADASTROS_COMERCIAIS_VISUALIZAR,
  },
  {
    titulo: "Workflows",
    descricao: "Fluxos de producao e suas etapas humanas/automaticas/hibridas.",
    href: "/cadastros/workflows",
    permissaoRequerida: PERMISSOES.CADASTROS_OPERACIONAIS_VISUALIZAR,
  },
];

export default function CadastrosIndexPage() {
  const { sessao } = useSessao();
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const gruposVisiveis = GRUPOS.filter((grupo) => papel && papelTemPermissao(papel, grupo.permissaoRequerida));

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="SPEC 02"
        title="Cadastros mestres"
        description="Base de dados compartilhada por todos os processos do 7Grafica: os mesmos registros aparecerao depois no PDV, no orcamento, no pedido e no portal."
      />
      {gruposVisiveis.length === 0 ? (
        <SurfaceCard className="p-5">
          <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a nenhum cadastro.</p>
        </SurfaceCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gruposVisiveis.map((grupo) => (
            <Link key={grupo.href} href={grupo.href}>
              <SurfaceCard className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <SectionLabel>{grupo.titulo}</SectionLabel>
                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">{grupo.descricao}</p>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
