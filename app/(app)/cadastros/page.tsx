import Link from "next/link";
import { PageIntro, SectionLabel, SurfaceCard } from "@/components/ui/workspace-primitives";

const GRUPOS = [
  {
    titulo: "Clientes",
    descricao: "Clientes PF/PJ, contatos e e-mails para identificacao rapida.",
    href: "/cadastros/clientes",
  },
  {
    titulo: "Fornecedores",
    descricao: "Fornecedores de materiais e insumos.",
    href: "/cadastros/fornecedores",
  },
  {
    titulo: "Servicos",
    descricao: "Servicos oferecidos e suas categorias.",
    href: "/cadastros/servicos",
  },
  {
    titulo: "Materiais",
    descricao: "Materiais, unidades de medida e conversoes de compra/consumo.",
    href: "/cadastros/materiais",
  },
  {
    titulo: "Equipamentos",
    descricao: "Equipamentos de producao e suas capacidades.",
    href: "/cadastros/equipamentos",
  },
  {
    titulo: "Formas de pagamento",
    descricao: "Formas de pagamento aceitas no balcao e no portal.",
    href: "/cadastros/formas-pagamento",
  },
  {
    titulo: "Workflows",
    descricao: "Fluxos de producao e suas etapas humanas/automaticas/hibridas.",
    href: "/cadastros/workflows",
  },
];

export default function CadastrosIndexPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="SPEC 02"
        title="Cadastros mestres"
        description="Base de dados compartilhada por todos os processos do 7Grafica: os mesmos registros aparecerao depois no PDV, no orcamento, no pedido e no portal."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GRUPOS.map((grupo) => (
          <Link key={grupo.href} href={grupo.href}>
            <SurfaceCard className="p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <SectionLabel>{grupo.titulo}</SectionLabel>
              <p className="mt-3 text-sm leading-6 text-(--text-secondary)">{grupo.descricao}</p>
            </SurfaceCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
