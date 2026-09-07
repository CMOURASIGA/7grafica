import { gravarColecao, gravarValor, lerValor, limparNamespace } from "@/lib/storage/local-storage-client";
import { CHAVES_USUARIOS } from "@/lib/repositories/local/usuarios";
import { CHAVES_SESSAO } from "@/lib/repositories/local/sessao";
import {
  capacidadesEquipamentoSeed,
  categoriasServicoSeed,
  clientesSeed,
  contatosSeed,
  conversoesUnidadeSeed,
  credenciaisDemoSeed,
  emailsContatoSeed,
  empresasSeed,
  empresaUsuariosSeed,
  equipamentosSeed,
  etapasWorkflowSeed,
  fornecedoresSeed,
  formasPagamentoSeed,
  materiaisSeed,
  servicosSeed,
  unidadesMedidaSeed,
  usuariosPerfilSeed,
  workflowsSeed,
} from "@/lib/mock/seed-data";

/**
 * Grava o conjunto de dados de demonstracao, sobrescrevendo qualquer coisa
 * que exista no namespace 7grafica. Usado no primeiro acesso (bootstrap) e
 * sob confirmacao explicita em Configuracoes ("Restaurar dados de
 * demonstracao"). Ids sao fixos (ver lib/mock/seed-data.ts) para que as
 * proximas specs referenciem os mesmos registros.
 */
export function restaurarDadosDemo(): void {
  limparNamespace();

  gravarColecao(CHAVES_SESSAO.empresas, empresasSeed);
  gravarColecao(CHAVES_USUARIOS.perfis, usuariosPerfilSeed);
  gravarColecao(CHAVES_USUARIOS.vinculos, empresaUsuariosSeed);
  gravarColecao(CHAVES_SESSAO.credenciais, credenciaisDemoSeed);

  gravarColecao("clientes", clientesSeed);
  gravarColecao("contatos", contatosSeed);
  gravarColecao("emails_contato", emailsContatoSeed);
  gravarColecao("fornecedores", fornecedoresSeed);
  gravarColecao("categorias_servico", categoriasServicoSeed);
  gravarColecao("servicos", servicosSeed);
  gravarColecao("unidades_medida", unidadesMedidaSeed);
  gravarColecao("materiais", materiaisSeed);
  gravarColecao("conversoes_unidade", conversoesUnidadeSeed);
  gravarColecao("equipamentos", equipamentosSeed);
  gravarColecao("capacidades_equipamento", capacidadesEquipamentoSeed);
  gravarColecao("formas_pagamento", formasPagamentoSeed);
  gravarColecao("workflows", workflowsSeed);
  gravarColecao("etapas_workflow", etapasWorkflowSeed);
}

const CHAVE_BOOTSTRAP = "bootstrap_v1";

/** Semeia os dados de demonstracao apenas na primeira vez que o app roda neste navegador. */
export function garantirDadosDemo(): void {
  if (typeof window === "undefined") return;
  if (lerValor<boolean>(CHAVE_BOOTSTRAP)) return;
  restaurarDadosDemo();
  gravarValor(CHAVE_BOOTSTRAP, true);
}
