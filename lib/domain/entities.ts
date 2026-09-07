// Entidades de dominio, independentes de persistencia. Tanto o adapter
// LocalStorage (hoje) quanto um futuro adapter Supabase implementam os
// repositorios de lib/repositories/types.ts devolvendo/recebendo estes
// mesmos tipos — UI e regra de negocio nunca importam nada de
// lib/storage/* ou lib/supabase/* diretamente.

export type Papel = "admin" | "gerente" | "atendente" | "operador";

// --- Foundation ------------------------------------------------------------

export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  corPrimaria: string | null;
  corDestaque: string | null;
  ativo: boolean;
  criadoEm: string;
};

export type UsuarioPerfil = {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  mfaHabilitado: boolean;
  criadoEm: string;
};

export type EmpresaUsuario = {
  id: string;
  empresaId: string;
  usuarioId: string;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
};

export type FeatureFlag = {
  id: string;
  empresaId: string | null;
  chave: string;
  habilitado: boolean;
  descricao: string | null;
};

export type EventoAuditoria = {
  id: string;
  empresaId: string;
  usuarioId: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  dadosAntes: Record<string, unknown> | null;
  dadosDepois: Record<string, unknown> | null;
  criadoEm: string;
};

// --- SPEC 02: Cadastros mestres --------------------------------------------

export type TipoPessoa = "PF" | "PJ";

export type Cliente = {
  id: string;
  empresaId: string;
  tipo: TipoPessoa;
  nome: string;
  documento: string | null; // CPF ou CNPJ, sem mascara
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
};

export type Contato = {
  id: string;
  empresaId: string;
  clienteId: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  principal: boolean;
  ativo: boolean;
};

export type EmailContato = {
  id: string;
  empresaId: string;
  contatoId: string;
  email: string;
  principal: boolean;
};

export type Fornecedor = {
  id: string;
  empresaId: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};

export type CategoriaServico = {
  id: string;
  empresaId: string;
  nome: string;
};

export type Servico = {
  id: string;
  empresaId: string;
  categoriaId: string | null;
  nome: string;
  descricao: string | null;
  precoBase: number;
  ativo: boolean;
};

export type UnidadeMedida = {
  id: string;
  empresaId: string;
  nome: string; // "Resma", "Folha", "Metro quadrado", "Litro"
  sigla: string; // "rm", "fl", "m2", "L"
};

export type Material = {
  id: string;
  empresaId: string;
  nome: string; // papel, capa, espiral, lona, vinil, toner, tinta...
  unidadeCompraId: string;
  unidadeConsumoId: string;
  ativo: boolean;
};

export type ConversaoUnidade = {
  id: string;
  empresaId: string;
  materialId: string;
  /** Quantas unidades de consumo equivalem a 1 unidade de compra. Ex.: 1 resma = 500 folhas -> fator 500. */
  fator: number;
};

export type TipoEquipamento = "impressora" | "guilhotina" | "encadernadora" | "laminadora" | "outro";

export type Equipamento = {
  id: string;
  empresaId: string;
  nome: string;
  tipo: TipoEquipamento;
  ativo: boolean;
};

export type CapacidadeEquipamento = {
  id: string;
  empresaId: string;
  equipamentoId: string;
  formatos: string; // ex.: "A4, A3, Oficio"
  corPB: "cor" | "pb" | "ambos";
  duplex: boolean;
  observacoes: string | null;
};

export type FormaPagamento = {
  id: string;
  empresaId: string;
  nome: string; // Dinheiro, Pix, Cartao debito, Cartao credito, Boleto...
  ativo: boolean;
};

export type Workflow = {
  id: string;
  empresaId: string;
  nome: string;
  categoriaServicoId: string | null;
  ativo: boolean;
};

export type TipoEtapa = "humana" | "automatica" | "hibrida";

export type EtapaWorkflow = {
  id: string;
  empresaId: string;
  workflowId: string;
  ordem: number;
  nome: string;
  tipo: TipoEtapa;
};

// --- SPEC 03: Entrada por E-mail e Orcamentos ------------------------------

export type StatusEmailRecebido = "novo" | "vinculado" | "ignorado";

export type EmailRecebido = {
  id: string;
  empresaId: string;
  remetente: string;
  assunto: string;
  corpo: string;
  anexos: { nome: string }[];
  recebidoEm: string;
  /** Preenchido quando o remetente bate com um e-mail de contato cadastrado (busca exata). */
  clienteId: string | null;
  contatoId: string | null;
  solicitacaoId: string | null;
  status: StatusEmailRecebido;
};

export type StatusSolicitacao = "nova" | "em_analise" | "orcamento_criado" | "encerrada";

export type Solicitacao = {
  id: string;
  empresaId: string;
  /** Unico canal implementado nesta SPEC. balcao/portal chegam nas specs 04/10 sem exigir mudanca de modelo. */
  origem: "email";
  emailOrigemId: string | null;
  /** Nulo = "Cliente nao identificado" — nunca criado automaticamente (regra de produto). */
  clienteId: string | null;
  contatoId: string | null;
  assunto: string;
  descricao: string;
  status: StatusSolicitacao;
  criadaEm: string;
};

export type StatusOrcamento =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "alteracao_solicitada"
  | "rejeitado"
  | "expirado"
  | "cancelado";

export type MotivoRejeicaoOrcamento =
  | "preco_alto"
  | "prazo_incompativel"
  | "nao_precisa_mais"
  | "concorrencia"
  | "outro";

export type OrcamentoItem = {
  id: string;
  descricao: string;
  quantidade: number;
  servicoId: string | null;
  materialId: string | null;
  acabamentos: string | null;
  precoUnitario: number;
};

export type Orcamento = {
  id: string;
  empresaId: string;
  solicitacaoId: string;
  clienteId: string | null;
  /** Unico dentro da empresa, formato ORC-0001. */
  numero: string;
  /** V1, V2, V3... — nova versao criada a partir de alteracao solicitada. */
  versao: number;
  /** Encadeia as versoes do mesmo orcamento comercial. Na V1, aponta para o proprio id. */
  orcamentoOrigemId: string;
  itens: OrcamentoItem[];
  prazoEntregaDias: number | null;
  validadeAte: string | null;
  observacoes: string | null;
  valorTotal: number;
  status: StatusOrcamento;
  /** Token nao sequencial (crypto.randomUUID) — requisito de seguranca da Foundation. */
  tokenAcompanhamento: string;
  justificativaCliente: string | null;
  motivoRejeicao: MotivoRejeicaoOrcamento | null;
  criadoEm: string;
  enviadoEm: string | null;
  decididoEm: string | null;
};

export type EmailEnviado = {
  id: string;
  empresaId: string;
  orcamentoId: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  link: string;
  enviadoEm: string;
};

// --- SPEC 04: Balcao, PDV e Caixa ------------------------------------------
//
// Pedido e o MESMO conceito comercial nasca de onde nascer: e-mail/orcamento
// aprovado (SPEC 03) ou atendimento de balcao (SPEC 04). "origem" so marca a
// procedencia; nenhuma tela ou regra de negocio das specs futuras (producao,
// financeiro) deve precisar saber de onde o pedido veio.
//
// Pagamento e modelado como Pedido 1:N Recebimento (nunca um booleano
// "pago"): um pedido pode ter zero, um ou varios recebimentos (ex.: sinal +
// saldo na retirada), e "valor recebido"/"saldo pendente" sao sempre
// calculados a partir da soma dos recebimentos — nunca armazenados, para
// nao correrem o risco de ficar dessincronizados.

export type OrigemPedido = "email" | "balcao";

/**
 * "concluido" = atendimento simples finalizado e entregue no proprio balcao
 * (sem produção). "aguardando_producao" = pedido criado, aguardando a
 * SPEC 05 (Trabalhos/Kanban) para decompor e executar. Este campo e sobre
 * ENTREGA, nao sobre pagamento — um pedido pode estar concluido com saldo
 * pendente, ou aguardando producao já totalmente pago.
 */
export type StatusEntregaPedido = "aguardando_producao" | "concluido" | "cancelado";

export type Pedido = {
  id: string;
  empresaId: string;
  /** Nulo = "Consumidor nao identificado" — condicao comercial do atendimento, nunca um registro em Cliente. */
  clienteId: string | null;
  origem: OrigemPedido;
  /** So preenchido quando origem = "email" (orcamento aprovado). */
  orcamentoId: string | null;
  /** Unico por empresa, formato PED-0001. */
  numero: string;
  itens: OrcamentoItem[];
  valorTotal: number;
  statusEntrega: StatusEntregaPedido;
  /** Token nao sequencial para o comprovante/QR Code publico — mesma limitacao de MVP do orcamento (ver docs/MVP-LOCALSTORAGE.md). */
  tokenAcompanhamento: string;
  criadoEm: string;
  concluidoEm: string | null;
};

export type StatusCaixa = "aberto" | "fechado";

export type Caixa = {
  id: string;
  empresaId: string;
  status: StatusCaixa;
  abertoPorUsuarioId: string;
  abertoEm: string;
  valorAberturaDinheiro: number;
  observacoesAbertura: string | null;
  fechadoPorUsuarioId: string | null;
  fechadoEm: string | null;
  observacoesFechamento: string | null;
};

export type TipoMovimentoCaixa = "entrada" | "saida";

/** Entradas/saidas manuais autorizadas (sangria, reforco, pequenas despesas) — nunca um recebimento de pedido. */
export type MovimentoCaixaManual = {
  id: string;
  empresaId: string;
  caixaId: string;
  tipo: TipoMovimentoCaixa;
  valor: number;
  motivo: string;
  registradoPorUsuarioId: string;
  registradoEm: string;
};

export type Recebimento = {
  id: string;
  empresaId: string;
  pedidoId: string;
  /** Caixa aberto no momento do registro — recebimento de balcao sempre exige caixa aberto. */
  caixaId: string;
  formaPagamentoId: string;
  valor: number;
  /** Só relevante quando a forma de pagamento é dinheiro (calculo de troco). */
  valorEntregueDinheiro: number | null;
  troco: number | null;
  registradoPorUsuarioId: string;
  registradoEm: string;
};
