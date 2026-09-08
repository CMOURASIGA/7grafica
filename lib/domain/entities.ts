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
  /**
   * SPEC 06: estado operacional atual — distinto de `ativo` (que e sobre o
   * cadastro existir). Default "disponivel" na criacao.
   */
  situacao: SituacaoEquipamento;
  /**
   * SPEC 06: quantos Trabalhos este equipamento processa ao mesmo tempo.
   * MVP assume 1 na maioria dos casos, mas o modelo ja aceita >1 para
   * equipamentos que processam lotes/trabalhos em paralelo.
   */
  capacidadeSimultanea: number;
};

export type CapacidadeEquipamento = {
  id: string;
  empresaId: string;
  equipamentoId: string;
  formatos: string; // ex.: "A4, A3, Oficio" — lista separada por virgula, comparada sem diferenciar maiusculas/minusculas
  corPB: "cor" | "pb" | "ambos";
  duplex: boolean;
  /** SPEC 06: materiais compativeis (ids de Material). Lista vazia = sem restricao de material. */
  materiaisCompativeisIds: string[];
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

// --- SPEC 05: Pedidos, Trabalhos e Kanban ----------------------------------
//
// Regra de dominio (registrada aqui por decisao de produto): situacao
// financeira e situacao operacional sao independentes. Um Pedido pode ter
// Trabalhos em producao mesmo com saldo pendente (ver Recebimento acima) —
// nao existe regra automatica "saldo = 0 -> libera producao". Uma politica
// de bloqueio, se vier a existir, sera parametrizavel numa spec futura.
//
// Pedido e comercial; Trabalho e operacional. Um Pedido pode gerar um ou
// varios Trabalhos, e a decomposicao NAO assume 1 item = 1 trabalho — quem
// atende decide como agrupar/dividir a necessidade real de producao.

export type StatusTrabalho = "aguardando_producao" | "em_producao" | "pausado" | "com_pendencia" | "concluido" | "cancelado";

export type PrioridadeTrabalho = "normal" | "alta" | "urgente";

/**
 * Copia congelada de uma etapa de workflow no momento em que o Trabalho e
 * criado. Nunca e resolvida de volta ao cadastro vivo — se alguem editar o
 * Workflow ou a Etapa original depois, este snapshot permanece intacto.
 */
export type EtapaSnapshot = {
  id: string;
  ordem: number;
  nome: string;
  tipo: TipoEtapa;
};

export type WorkflowSnapshot = {
  /** Id do workflow de cadastro na hora do snapshot — so informativo, nunca redereferenciado. */
  workflowId: string;
  nome: string;
  etapas: EtapaSnapshot[];
};

export type Trabalho = {
  id: string;
  empresaId: string;
  /** Unico por empresa, formato TRAB-0001. */
  codigo: string;
  pedidoId: string;
  /** Snapshot do cliente do pedido no momento da criacao (null = consumidor nao identificado). */
  clienteId: string | null;
  /** Copiados do item de origem no Pedido — congelados, nao voltam a resolver o cadastro de servico/material. */
  descricao: string;
  quantidade: number;
  servicoId: string | null;
  materialId: string | null;
  acabamentos: string | null;
  prazo: string | null;
  prioridade: PrioridadeTrabalho;
  situacao: StatusTrabalho;
  responsavelUsuarioId: string | null;
  observacoes: string | null;
  /** Metadado de procedencia do Pedido — "email" e "balcao" nunca tem implementacao de producao diferente. */
  origem: OrigemPedido;
  workflow: WorkflowSnapshot;
  /** Aponta para um id dentro de workflow.etapas — nunca para o cadastro vivo. */
  etapaAtualId: string;
  /**
   * SPEC 06: formato de impressao/producao exigido (ex.: "A3", "A4") —
   * usado pela regra de compatibilidade de equipamento. Null quando o
   * Trabalho nao depende de formato (etapas so humanas, por exemplo).
   */
  formato: string | null;
  /**
   * SPEC 06: categoria de equipamento que a etapa automatica/hibrida deste
   * Trabalho exige (ex.: "impressora"). Null quando nenhuma etapa do
   * workflow usa equipamento (workflow so humano).
   */
  tipoEquipamentoNecessario: TipoEquipamento | null;
  criadoEm: string;
  concluidoEm: string | null;
};

// --- SPEC 06: Producao e Equipamentos --------------------------------------
//
// Trabalho passa a representar COMO a producao sera executada, nao so um
// card percorrendo etapas. Etapas "automatica"/"hibrida" (ver TipoEtapa)
// podem exigir um Equipamento; etapas "humana" nunca associam equipamento.
// Ponto futuro de produto (registrado, NAO desenvolvido nesta spec): uma
// visao consolidada da producao quando existirem simultaneamente Trabalhos
// de workflows diferentes.

/**
 * "disponivel"/"em_uso" sao estados operacionais normais; "indisponivel" e
 * "manutencao" bloqueiam NOVAS alocacoes. Independente do campo `ativo`
 * (que e sobre o cadastro existir/estar habilitado, nao sobre a maquina
 * estar fisicamente pronta agora).
 */
export type SituacaoEquipamento = "disponivel" | "em_uso" | "indisponivel" | "manutencao";

export type SituacaoAlocacaoEquipamento = "aguardando" | "preparacao" | "em_execucao" | "pausada" | "concluida" | "cancelada";

/**
 * Uma execucao de uma etapa (automatica/hibrida) de um Trabalho em um
 * Equipamento especifico. Nunca apagada — uma realocacao encerra esta
 * (situacao "cancelada", com motivoRealocacao) e cria uma NOVA linha
 * apontando de volta via alocacaoAnteriorId, preservando o historico
 * completo de qual equipamento fez o que.
 */
export type AlocacaoEquipamento = {
  id: string;
  empresaId: string;
  trabalhoId: string;
  /** Aponta para um id dentro do workflow.etapas do Trabalho — nunca para o cadastro vivo. */
  etapaId: string;
  equipamentoId: string;
  /** Quem executa/acompanha — obrigatorio em etapas hibridas, opcional em automaticas puras. */
  operadorUsuarioId: string | null;
  situacao: SituacaoAlocacaoEquipamento;
  inicioPrevisto: string | null;
  inicioReal: string | null;
  terminoReal: string | null;
  /** Preenchido sempre que a alocacao e pausada. */
  motivoPausa: string | null;
  /** Preenchido apenas na alocacao ENCERRADA por realocacao (situacao "cancelada"). */
  motivoRealocacao: string | null;
  /** Se esta alocacao nasceu de uma realocacao, aponta para a alocacao substituida. */
  alocacaoAnteriorId: string | null;
  /**
   * true quando o equipamento ficou indisponivel/manutencao enquanto esta
   * alocacao ainda estava ativa — nunca movida ou apagada silenciosamente,
   * fica sinalizada ate uma decisao humana (retomar quando o equipamento
   * voltar, ou realocar para outro equipamento compativel).
   */
  precisaDecisaoHumana: boolean;
  criadaPorUsuarioId: string;
  criadoEm: string;
  atualizadoEm: string;
};

/** Motivo determinístico de compatibilidade/incompatibilidade de um Equipamento com um Trabalho. */
export type MotivoCompatibilidadeEquipamento = { tipo: "formato" | "material" | "situacao" | "tipo_equipamento"; mensagem: string };

export type AvaliacaoCompatibilidadeEquipamento = {
  equipamentoId: string;
  compativel: boolean;
  motivos: MotivoCompatibilidadeEquipamento[];
};
