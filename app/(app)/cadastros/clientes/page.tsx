"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, TipoPessoa } from "@/lib/domain/entities";

const TIPOS: { value: TipoPessoa; label: string }[] = [
  { value: "PF", label: "Pessoa fisica" },
  { value: "PJ", label: "Pessoa juridica" },
];

export default function ClientesPage() {
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessarClientes = papel ? papelTemPermissao(papel, PERMISSOES.CLIENTES_GERENCIAR) : false;
  const [clientes, setClientes] = useState<Cliente[]>([]);

  async function recarregar() {
    if (!empresaId || !podeAcessarClientes) return;
    setClientes(await repositories.clientes.listar(empresaId));
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, podeAcessarClientes]);

  if (!empresaId) return null;

  if (!podeAcessarClientes) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a clientes.</p>
      </SurfaceCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow="Cadastros"
        title="Clientes"
        description="Clientes PF/PJ podem existir sem login. Abra um cliente para gerenciar contatos e e-mails — o mesmo registro sera usado depois no PDV, orcamento, pedido e portal."
      />
      <CrudSection<Cliente>
        titulo="Clientes cadastrados"
        nomeEntidade="Cliente"
        campos={[
          { name: "tipo", label: "Tipo", tipo: "select", obrigatorio: true, opcoes: TIPOS },
          { name: "nome", label: "Nome / Razao social", tipo: "texto", obrigatorio: true },
          { name: "documento", label: "CPF/CNPJ", tipo: "texto" },
          { name: "observacoes", label: "Observacoes", tipo: "textarea" },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={clientes}
        colunas={[
          {
            chave: "nome",
            titulo: "Nome",
            render: (item) => (
              <Link href={`/cadastros/clientes/${item.id}`} className="font-medium text-(--accent-strong) hover:underline">
                {item.nome}
              </Link>
            ),
          },
          { chave: "tipo", titulo: "Tipo", render: (item) => (item.tipo === "PF" ? "Pessoa fisica" : "Pessoa juridica") },
          { chave: "documento", titulo: "Documento", render: (item) => item.documento ?? "—" },
          { chave: "status", titulo: "Status", render: (item) => (item.ativo ? "Ativo" : "Inativo") },
        ]}
        valoresParaEdicao={(item) => ({
          tipo: item.tipo,
          nome: item.nome,
          documento: item.documento ?? "",
          observacoes: item.observacoes ?? "",
          ativo: item.ativo,
        })}
        acoesExtras={(item) => (
          <Link href={`/cadastros/clientes/${item.id}`} className="workspace-button-secondary">
            Abrir
          </Link>
        )}
        aoCriar={async (dados) => {
          await repositories.clientes.criar({
            empresaId,
            tipo: dados.tipo as TipoPessoa,
            nome: String(dados.nome),
            documento: String(dados.documento) || null,
            observacoes: String(dados.observacoes) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (id, dados) => {
          await repositories.clientes.atualizar(id, {
            tipo: dados.tipo as TipoPessoa,
            nome: String(dados.nome),
            documento: String(dados.documento) || null,
            observacoes: String(dados.observacoes) || null,
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (id) => {
          await repositories.clientes.remover(id);
          await recarregar();
        }}
      />
    </div>
  );
}
