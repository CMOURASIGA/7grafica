import type {
  CategoriaServico,
  Equipamento,
  FeatureFlag,
  FormaPagamento,
  Material,
  Servico,
  UnidadeMedida,
  Workflow,
  Fornecedor,
} from "@/lib/domain/entities";
import type { Repositories } from "@/lib/repositories/types";
import { criarCrudLocal } from "@/lib/repositories/local/crud-generico";
import { criarEmpresaRepositoryLocal } from "@/lib/repositories/local/empresas";
import { criarUsuarioRepositoryLocal } from "@/lib/repositories/local/usuarios";
import { criarSessaoRepositoryLocal } from "@/lib/repositories/local/sessao";
import { criarAuditoriaRepositoryLocal } from "@/lib/repositories/local/auditoria";
import { criarClienteRepositoryLocal } from "@/lib/repositories/local/clientes";
import { criarContatoRepositoryLocal } from "@/lib/repositories/local/contatos";
import { criarEmailContatoRepositoryLocal } from "@/lib/repositories/local/emails-contato";
import { criarConversaoUnidadeRepositoryLocal } from "@/lib/repositories/local/conversoes-unidade";
import { criarCapacidadeEquipamentoRepositoryLocal } from "@/lib/repositories/local/capacidades-equipamento";
import { criarEtapaWorkflowRepositoryLocal } from "@/lib/repositories/local/etapas-workflow";
import { criarEmailRecebidoRepositoryLocal } from "@/lib/repositories/local/emails-recebidos";
import { criarSolicitacaoRepositoryLocal } from "@/lib/repositories/local/solicitacoes";
import { criarOrcamentoRepositoryLocal } from "@/lib/repositories/local/orcamentos";
import { criarEmailEnviadoRepositoryLocal } from "@/lib/repositories/local/emails-enviados";
import { criarPedidoRepositoryLocal } from "@/lib/repositories/local/pedidos";

/**
 * Bundle completo do adapter LocalStorage. E o unico lugar que sabe que os
 * cadastros "simples" (fornecedores, servicos, materiais, unidades,
 * equipamentos, formas de pagamento, workflows, feature flags) usam o CRUD
 * generico — cada um continua com seu proprio tipo e chave de storage.
 */
export function criarRepositoriesLocal(): Repositories {
  return {
    empresas: criarEmpresaRepositoryLocal(),
    usuarios: criarUsuarioRepositoryLocal(),
    sessao: criarSessaoRepositoryLocal(),
    auditoria: criarAuditoriaRepositoryLocal(),
    featureFlags: criarCrudLocal<FeatureFlag, Omit<FeatureFlag, "id">>("feature_flags", "flag"),

    clientes: criarClienteRepositoryLocal(),
    contatos: criarContatoRepositoryLocal(),
    emailsContato: criarEmailContatoRepositoryLocal(),
    fornecedores: criarCrudLocal<Fornecedor, Omit<Fornecedor, "id">>("fornecedores", "fornecedor"),
    categoriasServico: criarCrudLocal<CategoriaServico, Omit<CategoriaServico, "id">>("categorias_servico", "cat-serv"),
    servicos: criarCrudLocal<Servico, Omit<Servico, "id">>("servicos", "servico"),
    unidadesMedida: criarCrudLocal<UnidadeMedida, Omit<UnidadeMedida, "id">>("unidades_medida", "unidade"),
    materiais: criarCrudLocal<Material, Omit<Material, "id">>("materiais", "material"),
    conversoesUnidade: criarConversaoUnidadeRepositoryLocal(),
    equipamentos: criarCrudLocal<Equipamento, Omit<Equipamento, "id">>("equipamentos", "equip"),
    capacidadesEquipamento: criarCapacidadeEquipamentoRepositoryLocal(),
    formasPagamento: criarCrudLocal<FormaPagamento, Omit<FormaPagamento, "id">>("formas_pagamento", "fp"),
    workflows: criarCrudLocal<Workflow, Omit<Workflow, "id">>("workflows", "workflow"),
    etapasWorkflow: criarEtapaWorkflowRepositoryLocal(),

    emailsRecebidos: criarEmailRecebidoRepositoryLocal(),
    solicitacoes: criarSolicitacaoRepositoryLocal(),
    orcamentos: criarOrcamentoRepositoryLocal(),
    emailsEnviados: criarEmailEnviadoRepositoryLocal(),
    pedidos: criarPedidoRepositoryLocal(),
  };
}
