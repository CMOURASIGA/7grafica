"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CrudSection } from "@/components/cadastros/crud-section";
import { PageIntro, StatusPill, SurfaceCard } from "@/components/ui/workspace-primitives";
import { useRepositoriosAutorizados as useRepositories, useSessao } from "@/components/providers/session-provider";
import { papelTemPermissao, PERMISSOES } from "@/lib/rbac";
import type { Cliente, Contato, EmailContato } from "@/lib/domain/entities";

export default function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repositories = useRepositories();
  const { sessao } = useSessao();
  const empresaId = sessao?.empresaAtiva?.id;
  const papel = sessao?.empresaAtiva?.papel ?? null;
  const podeAcessarClientes = papel ? papelTemPermissao(papel, PERMISSOES.CLIENTES_GERENCIAR) : false;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [emails, setEmails] = useState<EmailContato[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function recarregar() {
    if (!podeAcessarClientes) {
      setCarregando(false);
      return;
    }
    const [clienteAtual, listaContatos] = await Promise.all([
      repositories.clientes.obter(id),
      repositories.contatos.listarPorCliente(id),
    ]);
    setCliente(clienteAtual);
    setContatos(listaContatos);
    const listasEmails = await Promise.all(listaContatos.map((contato) => repositories.emailsContato.listarPorContato(contato.id)));
    setEmails(listasEmails.flat());
    setCarregando(false);
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, podeAcessarClientes]);

  if (carregando) return null;

  if (!podeAcessarClientes) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Seu papel atual nao tem acesso a clientes.</p>
      </SurfaceCard>
    );
  }

  if (!cliente || !empresaId) {
    return (
      <SurfaceCard className="p-5">
        <p className="text-sm text-(--text-secondary)">Cliente nao encontrado.</p>
        <Link href="/cadastros/clientes" className="mt-3 inline-block workspace-button-secondary">
          Voltar para clientes
        </Link>
      </SurfaceCard>
    );
  }

  const nomeContato = (id: string) => contatos.find((contato) => contato.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow={cliente.tipo === "PF" ? "Pessoa fisica" : "Pessoa juridica"}
        title={cliente.nome}
        description={cliente.documento ? `Documento: ${cliente.documento}` : "Sem documento cadastrado."}
        aside={<StatusPill tone={cliente.ativo ? "success" : "danger"}>{cliente.ativo ? "Ativo" : "Inativo"}</StatusPill>}
      />
      <Link href="/cadastros/clientes" className="text-xs font-medium text-(--accent-strong) hover:underline">
        ← Voltar para clientes
      </Link>

      {cliente.observacoes ? (
        <SurfaceCard className="p-4">
          <p className="text-sm text-(--text-secondary)">{cliente.observacoes}</p>
        </SurfaceCard>
      ) : null}

      <CrudSection<Contato>
        titulo="Contatos"
        descricao="Um cliente pode ter varios contatos."
        nomeEntidade="Contato"
        campos={[
          { name: "nome", label: "Nome", tipo: "texto", obrigatorio: true },
          { name: "cargo", label: "Cargo", tipo: "texto" },
          { name: "telefone", label: "Telefone", tipo: "texto" },
          { name: "principal", label: "Principal", tipo: "checkbox", placeholder: "Contato principal" },
          { name: "ativo", label: "Status", tipo: "checkbox", placeholder: "Ativo" },
        ]}
        itens={contatos}
        colunas={[
          { chave: "nome", titulo: "Nome", render: (item) => item.nome },
          { chave: "cargo", titulo: "Cargo", render: (item) => item.cargo ?? "—" },
          { chave: "telefone", titulo: "Telefone", render: (item) => item.telefone ?? "—" },
          { chave: "principal", titulo: "Principal", render: (item) => (item.principal ? "Sim" : "Nao") },
        ]}
        valoresParaEdicao={(item) => ({
          nome: item.nome,
          cargo: item.cargo ?? "",
          telefone: item.telefone ?? "",
          principal: item.principal,
          ativo: item.ativo,
        })}
        aoCriar={async (dados) => {
          await repositories.contatos.criar({
            empresaId,
            clienteId: id,
            nome: String(dados.nome),
            cargo: String(dados.cargo) || null,
            telefone: String(dados.telefone) || null,
            principal: Boolean(dados.principal),
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoAtualizar={async (contatoId, dados) => {
          await repositories.contatos.atualizar(contatoId, {
            nome: String(dados.nome),
            cargo: String(dados.cargo) || null,
            telefone: String(dados.telefone) || null,
            principal: Boolean(dados.principal),
            ativo: Boolean(dados.ativo),
          });
          await recarregar();
        }}
        aoRemover={async (contatoId) => {
          await repositories.contatos.remover(contatoId);
          await recarregar();
        }}
      />

      <CrudSection<EmailContato>
        titulo="E-mails"
        descricao="Um contato pode ter varios e-mails. Indexados para identificacao rapida (ex.: e-mail de entrada, PDV)."
        nomeEntidade="E-mail"
        campos={[
          {
            name: "contatoId",
            label: "Contato",
            tipo: "select",
            obrigatorio: true,
            opcoes: contatos.map((contato) => ({ value: contato.id, label: contato.nome })),
          },
          { name: "email", label: "E-mail", tipo: "texto", obrigatorio: true, placeholder: "nome@dominio.com" },
          { name: "principal", label: "Principal", tipo: "checkbox", placeholder: "E-mail principal" },
        ]}
        itens={emails}
        colunas={[
          { chave: "contato", titulo: "Contato", render: (item) => nomeContato(item.contatoId) },
          { chave: "email", titulo: "E-mail", render: (item) => item.email },
          { chave: "principal", titulo: "Principal", render: (item) => (item.principal ? "Sim" : "Nao") },
        ]}
        valoresParaEdicao={(item) => ({ contatoId: item.contatoId, email: item.email, principal: item.principal })}
        aoCriar={async (dados) => {
          await repositories.emailsContato.criar({
            empresaId,
            contatoId: String(dados.contatoId),
            email: String(dados.email),
            principal: Boolean(dados.principal),
          });
          await recarregar();
        }}
        aoAtualizar={async (emailId, dados) => {
          await repositories.emailsContato.atualizar(emailId, {
            contatoId: String(dados.contatoId),
            email: String(dados.email),
            principal: Boolean(dados.principal),
          });
          await recarregar();
        }}
        aoRemover={async (emailId) => {
          await repositories.emailsContato.remover(emailId);
          await recarregar();
        }}
      />
    </div>
  );
}
