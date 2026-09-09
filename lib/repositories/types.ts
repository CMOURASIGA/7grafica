// Portas (interfaces) da camada de persistencia. UI e regra de negocio
// dependem apenas destes tipos — nunca de lib/storage/* (LocalStorage) nem
// de lib/supabase/* diretamente. Isso e o que permite trocar o adapter
// LocalStorage por um adapter Supabase mais tarde sem reescrever telas.
//
// Convencao: todo metodo e assincrono, mesmo o adapter local sendo sincrono
// por baixo — assim o call-site (componentes, hooks) ja fica correto para
// quando o adapter real fizer round-trip de rede.

import type {
  AlocacaoEquipamento,
  Arquivo,
  AvaliacaoCompatibilidadeEquipamento,
  Caixa,
  CapacidadeEquipamento,
  CategoriaServico,
  Cliente,
  Contato,
  ConversaoUnidade,
  EmailContato,
  EmailEnviado,
  EmailRecebido,
  Empresa,
  EmpresaUsuario,
  Equipamento,
  EtapaWorkflow,
  EventoAuditoria,
  FeatureFlag,
  Fornecedor,
  FormaPagamento,
  Material,
  MotivoRejeicaoOrcamento,
  MovimentoCaixaManual,
  Orcamento,
  OrcamentoItem,
  OrigemArquivo,
  OrigemPedido,
  Papel,
  Pedido,
  PrioridadeTrabalho,
  Recebimento,
  Servico,
  SituacaoEquipamento,
  Solicitacao,
  StatusEntregaPedido,
  Trabalho,
  TipoArquivo,
  TipoEquipamento,
  UnidadeMedida,
  UsuarioPerfil,
  Workflow,
} from "@/lib/domain/entities";

export type CrudRepository<T, TCriar, TAtualizar = Partial<TCriar>> = {
  listar(empresaId: string): Promise<T[]>;
  obter(id: string): Promise<T | null>;
  criar(dados: TCriar): Promise<T>;
  atualizar(id: string, dados: TAtualizar): Promise<T>;
  remover(id: string): Promise<void>;
};

// --- Foundation --------------------------------------------------------

export type EmpresaRepository = {
  obter(id: string): Promise<Empresa | null>;
  atualizar(id: string, dados: Partial<Omit<Empresa, "id" | "criadoEm">>): Promise<Empresa>;
};

export type VinculoComPerfil = EmpresaUsuario & { perfil: UsuarioPerfil | null };

export type UsuarioRepository = {
  obterPerfil(id: string): Promise<UsuarioPerfil | null>;
  listarPorEmpresa(empresaId: string): Promise<VinculoComPerfil[]>;
  alterarPapel(vinculoId: string, papel: Papel): Promise<void>;
  definirAtivo(vinculoId: string, ativo: boolean): Promise<void>;
};

export type SessaoAtual = {
  usuario: UsuarioPerfil;
  vinculos: EmpresaUsuario[];
  empresaAtiva: (Empresa & { papel: Papel }) | null;
};

export type SessaoRepository = {
  obterAtual(): Promise<SessaoAtual | null>;
  entrar(email: string, senha: string): Promise<SessaoAtual>;
  sair(): Promise<void>;
};

export type AuditoriaRepository = {
  listar(empresaId: string, limite?: number): Promise<EventoAuditoria[]>;
  registrar(evento: Omit<EventoAuditoria, "id" | "criadoEm">): Promise<void>;
};

export type FeatureFlagRepository = CrudRepository<FeatureFlag, Omit<FeatureFlag, "id">>;

// --- SPEC 02: Cadastros --------------------------------------------------

export type ClienteRepository = CrudRepository<Cliente, Omit<Cliente, "id" | "criadoEm">> & {
  /** Indexado por e-mail: varre contatos/e-mails do cliente para localizacao rapida (ex.: ingestao de e-mail, PDV). */
  buscarPorEmail(empresaId: string, email: string): Promise<Cliente | null>;
  buscarPorDocumento(empresaId: string, documento: string): Promise<Cliente | null>;
  /** Busca rapida por nome, documento, telefone ou e-mail (contatos) — usada no PDV para achar o cliente em um unico campo. */
  buscarRapido(empresaId: string, texto: string): Promise<Cliente[]>;
};

export type ContatoRepository = CrudRepository<Contato, Omit<Contato, "id">> & {
  listarPorCliente(clienteId: string): Promise<Contato[]>;
};

export type EmailContatoRepository = CrudRepository<EmailContato, Omit<EmailContato, "id">> & {
  listarPorContato(contatoId: string): Promise<EmailContato[]>;
  buscarPorEmail(empresaId: string, email: string): Promise<EmailContato | null>;
};

export type FornecedorRepository = CrudRepository<Fornecedor, Omit<Fornecedor, "id">>;
export type CategoriaServicoRepository = CrudRepository<CategoriaServico, Omit<CategoriaServico, "id">>;
export type ServicoRepository = CrudRepository<Servico, Omit<Servico, "id">>;
export type UnidadeMedidaRepository = CrudRepository<UnidadeMedida, Omit<UnidadeMedida, "id">>;
export type MaterialRepository = CrudRepository<Material, Omit<Material, "id">>;
export type ConversaoUnidadeRepository = CrudRepository<ConversaoUnidade, Omit<ConversaoUnidade, "id">> & {
  listarPorMaterial(materialId: string): Promise<ConversaoUnidade[]>;
};
export type EquipamentoRepository = CrudRepository<Equipamento, Omit<Equipamento, "id">> & {
  /**
   * SPEC 06: muda a situacao operacional (nao o cadastro `ativo`). Quando a
   * nova situacao e "indisponivel"/"manutencao", qualquer AlocacaoEquipamento
   * ativa deste equipamento e sinalizada (`precisaDecisaoHumana = true`) —
   * nunca movida ou apagada silenciosamente.
   */
  atualizarSituacao(equipamentoId: string, usuarioId: string, novaSituacao: SituacaoEquipamento): Promise<Equipamento>;
};
export type CapacidadeEquipamentoRepository = CrudRepository<CapacidadeEquipamento, Omit<CapacidadeEquipamento, "id">> & {
  listarPorEquipamento(equipamentoId: string): Promise<CapacidadeEquipamento[]>;
};
export type FormaPagamentoRepository = CrudRepository<FormaPagamento, Omit<FormaPagamento, "id">>;
export type WorkflowRepository = CrudRepository<Workflow, Omit<Workflow, "id">>;
export type EtapaWorkflowRepository = CrudRepository<EtapaWorkflow, Omit<EtapaWorkflow, "id">> & {
  listarPorWorkflow(workflowId: string): Promise<EtapaWorkflow[]>;
};

// --- SPEC 03: Entrada por E-mail e Orcamentos ------------------------------

export type EmailRecebidoRepository = CrudRepository<EmailRecebido, Omit<EmailRecebido, "id">>;

export type SolicitacaoRepository = CrudRepository<Solicitacao, Omit<Solicitacao, "id" | "criadaEm">>;

export type DecisaoOrcamento = "aprovado" | "alteracao_solicitada" | "rejeitado";

export type OrcamentoRepository = CrudRepository<
  Orcamento,
  Omit<
    Orcamento,
    | "id"
    | "criadoEm"
    | "numero"
    | "tokenAcompanhamento"
    | "orcamentoOrigemId"
    | "status"
    | "enviadoEm"
    | "decididoEm"
    | "justificativaCliente"
    | "motivoRejeicao"
  >
> & {
  buscarPorToken(token: string): Promise<Orcamento | null>;
  listarPorSolicitacao(solicitacaoId: string): Promise<Orcamento[]>;
  /** Marca como enviado, gera o link de acompanhamento e grava o log em EmailEnviado. */
  enviarPorEmail(orcamentoId: string, destinatario: string): Promise<{ orcamento: Orcamento; link: string }>;
  /** Cria a V2/V3... a partir da versao anterior (copia itens), preservando orcamentoOrigemId. */
  criarNovaVersao(orcamentoAnteriorId: string): Promise<Orcamento>;
  /**
   * Acesso publico (via token, sem sessao) usado pela pagina de decisao do
   * cliente. So aceita transicao a partir de "enviado" — nao e um
   * atualizar() generico exposto ao publico.
   */
  registrarDecisaoPublica(
    token: string,
    decisao: DecisaoOrcamento,
    detalhe?: { justificativa?: string; motivo?: MotivoRejeicaoOrcamento },
  ): Promise<Orcamento>;
};

export type EmailEnviadoRepository = {
  listarPorOrcamento(orcamentoId: string): Promise<EmailEnviado[]>;
};

export type PedidoRepository = {
  listar(empresaId: string): Promise<Pedido[]>;
  obter(id: string): Promise<Pedido | null>;
  buscarPorToken(token: string): Promise<Pedido | null>;
  /** Origem "email": sempre a partir de um Orcamento aprovado (regra de produto), idempotente. */
  criarAPartirDeOrcamentoAprovado(orcamentoId: string): Promise<Pedido>;
  /** Origem "balcao": atendimento de PDV, com ou sem cliente identificado. */
  criarAtendimentoBalcao(dados: {
    empresaId: string;
    clienteId: string | null;
    itens: OrcamentoItem[];
    valorTotal: number;
    statusEntrega: StatusEntregaPedido;
  }): Promise<Pedido>;
  marcarConcluido(pedidoId: string): Promise<Pedido>;
};

// --- SPEC 04: Balcao, PDV e Caixa ------------------------------------------

export type ResumoCaixa = {
  caixa: Caixa;
  totalPorFormaPagamento: { formaPagamentoId: string; nomeFormaPagamento: string; total: number }[];
  totalRecebido: number;
  totalEntradasManuais: number;
  totalSaidasManuais: number;
  /** Saldo fisico esperado em dinheiro: abertura + recebimentos em dinheiro + entradas - saidas manuais. */
  saldoDinheiroEsperado: number;
  quantidadePedidosAtendidos: number;
  ticketMedio: number;
};

export type CaixaRepository = {
  obterAberto(empresaId: string): Promise<Caixa | null>;
  listar(empresaId: string): Promise<Caixa[]>;
  obter(id: string): Promise<Caixa | null>;
  abrir(dados: { empresaId: string; usuarioId: string; valorAberturaDinheiro: number; observacoes: string | null }): Promise<Caixa>;
  fechar(caixaId: string, dados: { usuarioId: string; observacoes: string | null }): Promise<Caixa>;
  obterResumo(caixaId: string): Promise<ResumoCaixa>;
};

export type MovimentoCaixaManualRepository = {
  listarPorCaixa(caixaId: string): Promise<MovimentoCaixaManual[]>;
  criar(dados: Omit<MovimentoCaixaManual, "id" | "registradoEm">): Promise<MovimentoCaixaManual>;
};

export type RecebimentoRepository = {
  listarPorPedido(pedidoId: string): Promise<Recebimento[]>;
  /** Calcula troco automaticamente quando a forma de pagamento e dinheiro e valorEntregueDinheiro e informado. */
  criar(dados: Omit<Recebimento, "id" | "registradoEm" | "troco">): Promise<Recebimento>;
};

export type Repositories = {
  empresas: EmpresaRepository;
  usuarios: UsuarioRepository;
  sessao: SessaoRepository;
  auditoria: AuditoriaRepository;
  featureFlags: FeatureFlagRepository;
  clientes: ClienteRepository;
  contatos: ContatoRepository;
  emailsContato: EmailContatoRepository;
  fornecedores: FornecedorRepository;
  categoriasServico: CategoriaServicoRepository;
  servicos: ServicoRepository;
  unidadesMedida: UnidadeMedidaRepository;
  materiais: MaterialRepository;
  conversoesUnidade: ConversaoUnidadeRepository;
  equipamentos: EquipamentoRepository;
  capacidadesEquipamento: CapacidadeEquipamentoRepository;
  formasPagamento: FormaPagamentoRepository;
  workflows: WorkflowRepository;
  etapasWorkflow: EtapaWorkflowRepository;

  emailsRecebidos: EmailRecebidoRepository;
  solicitacoes: SolicitacaoRepository;
  orcamentos: OrcamentoRepository;
  emailsEnviados: EmailEnviadoRepository;
  pedidos: PedidoRepository;

  caixa: CaixaRepository;
  movimentosCaixaManual: MovimentoCaixaManualRepository;
  recebimentos: RecebimentoRepository;

  trabalhos: TrabalhoRepository;

  alocacoesEquipamento: AlocacaoEquipamentoRepository;

  arquivos: ArquivoRepository;
};

// --- SPEC 05: Pedidos, Trabalhos e Kanban -----------------------------------

export type DadosNovoTrabalho = {
  empresaId: string;
  pedidoId: string;
  clienteId: string | null;
  descricao: string;
  quantidade: number;
  servicoId: string | null;
  materialId: string | null;
  acabamentos: string | null;
  prazo: string | null;
  prioridade: PrioridadeTrabalho;
  responsavelUsuarioId: string | null;
  observacoes: string | null;
  origem: OrigemPedido;
  /** Id do workflow de cadastro a snapshotar — o repositorio copia nome/etapas na hora da criacao. */
  workflowId: string;
  /** SPEC 06: formato exigido pela producao (ex.: "A3"). Null quando o workflow so tem etapas humanas. */
  formato: string | null;
  /** SPEC 06: categoria de equipamento exigida pelas etapas automatica/hibrida do workflow, se houver. */
  tipoEquipamentoNecessario: TipoEquipamento | null;
};

export type TrabalhoRepository = {
  listar(empresaId: string): Promise<Trabalho[]>;
  obter(id: string): Promise<Trabalho | null>;
  listarPorPedido(pedidoId: string): Promise<Trabalho[]>;
  /** Cria com snapshot do Workflow/Etapas — nunca reaproveita snapshot de outro Trabalho. */
  criar(dados: DadosNovoTrabalho): Promise<Trabalho>;
  atribuirResponsavel(trabalhoId: string, usuarioId: string, responsavelUsuarioId: string | null): Promise<Trabalho>;
  /**
   * Move o Trabalho para a etapa `etapaId` do proprio snapshot. Avanco de
   * uma etapa e livre; qualquer retrocesso exige `motivo`; pular etapas
   * (avancar mais de uma posicao) e sempre bloqueado.
   */
  mover(trabalhoId: string, usuarioId: string, etapaId: string, motivo?: string): Promise<Trabalho>;
  /** So permitido quando a etapa atual e a ultima do snapshot. */
  concluir(trabalhoId: string, usuarioId: string): Promise<Trabalho>;
  pausar(trabalhoId: string, usuarioId: string, motivo: string): Promise<Trabalho>;
  registrarPendencia(trabalhoId: string, usuarioId: string, motivo: string): Promise<Trabalho>;
  /** Volta a "em_producao" a partir de pausado ou com_pendencia. */
  retomar(trabalhoId: string, usuarioId: string): Promise<Trabalho>;
  cancelar(trabalhoId: string, usuarioId: string, motivo: string): Promise<Trabalho>;
  /**
   * SPEC 07: fixa a referencia EXPLICITA de qual Arquivo (versao especifica)
   * esta liberado para producao — nunca implicito/"ultimo enviado". Exige
   * aprovacao tecnica sempre, e aprovacao do cliente quando o arquivo for
   * do tipo "arte".
   */
  liberarArquivoParaProducao(trabalhoId: string, arquivoId: string, usuarioId: string): Promise<Trabalho>;
};

// --- SPEC 06: Producao e Equipamentos ---------------------------------------

export type DadosNovaAlocacaoEquipamento = {
  empresaId: string;
  trabalhoId: string;
  etapaId: string;
  equipamentoId: string;
  operadorUsuarioId: string | null;
  inicioPrevisto: string | null;
};

export type AlocacaoEquipamentoRepository = {
  listar(empresaId: string): Promise<AlocacaoEquipamento[]>;
  obter(id: string): Promise<AlocacaoEquipamento | null>;
  listarPorTrabalho(trabalhoId: string): Promise<AlocacaoEquipamento[]>;
  listarPorEquipamento(equipamentoId: string): Promise<AlocacaoEquipamento[]>;
  /**
   * Avalia, de forma deterministica (sem IA), quais equipamentos ativos sao
   * compativeis com o Trabalho — formato, material e situacao do
   * equipamento — e explica o motivo de cada incompatibilidade.
   */
  avaliarCompatibilidade(trabalhoId: string): Promise<AvaliacaoCompatibilidadeEquipamento[]>;
  /**
   * Cria a alocacao (situacao inicial "aguardando"). Bloqueia quando o
   * equipamento e incompativel, esta indisponivel/manutencao, ou ja atingiu
   * sua capacidadeSimultanea de alocacoes ativas.
   */
  criar(dados: DadosNovaAlocacaoEquipamento, usuarioId: string): Promise<AlocacaoEquipamento>;
  iniciarPreparacao(alocacaoId: string, usuarioId: string): Promise<AlocacaoEquipamento>;
  iniciar(alocacaoId: string, usuarioId: string): Promise<AlocacaoEquipamento>;
  pausar(alocacaoId: string, usuarioId: string, motivo: string): Promise<AlocacaoEquipamento>;
  retomar(alocacaoId: string, usuarioId: string): Promise<AlocacaoEquipamento>;
  concluir(alocacaoId: string, usuarioId: string): Promise<AlocacaoEquipamento>;
  /**
   * Encerra a alocacao atual (situacao "cancelada", com motivoRealocacao) e
   * cria uma nova em outro equipamento compativel, preservando o historico
   * via alocacaoAnteriorId. Nunca move nem apaga a alocacao original.
   */
  realocar(alocacaoId: string, usuarioId: string, novoEquipamentoId: string, motivo: string): Promise<AlocacaoEquipamento>;
};

// --- SPEC 07: Arquivos e Arte -----------------------------------------------

export type DadosMetadadosArquivo = {
  comentarioVersao?: string | null;
  briefing?: string | null;
  nome: string;
  extensao: string;
  mimeType: string;
  tamanhoBytes: number;
  /** Metadados tecnicos simulados do arquivo mockado (o MVP nao guarda binario) — usados pelo preflight. */
  paginas: number | null;
  larguraMm: number | null;
  alturaMm: number | null;
};

export type DadosReceberArquivo = DadosMetadadosArquivo & {
  exigeAprovacaoCliente?: boolean;
  empresaId: string;
  solicitacaoId: string | null;
  pedidoId: string | null;
  trabalhoId: string | null;
  tipo: TipoArquivo;
  origem: OrigemArquivo;
  /** Null quando origem = "portal_cliente" (cliente nao e um usuario interno). */
  enviadoPorUsuarioId: string | null;
};

export type ArquivoRepository = {
  listar(empresaId: string): Promise<Arquivo[]>;
  obter(id: string): Promise<Arquivo | null>;
  listarPorTrabalho(trabalhoId: string): Promise<Arquivo[]>;
  listarPorPedido(pedidoId: string): Promise<Arquivo[]>;
  listarPorSolicitacao(solicitacaoId: string): Promise<Arquivo[]>;
  /** Historico completo de versoes do mesmo arquivo logico, mais antiga primeiro. */
  listarVersoes(grupoArquivoId: string): Promise<Arquivo[]>;
  vincularTrabalho(arquivoId: string, trabalhoId: string, usuarioId: string): Promise<Arquivo>;
  buscarPorTokenAprovacaoPublica(token: string): Promise<Arquivo | null>;
  /** Cria a versao 1 de um novo arquivo logico e roda o preflight automaticamente. */
  receber(dados: DadosReceberArquivo, usuarioId: string | null): Promise<Arquivo>;
  /**
   * Cria uma NOVA versao dentro do mesmo grupo (nunca sobrescreve): marca a
   * versao anterior como "substituido" e roda o preflight na nova.
   */
  criarNovaVersao(grupoArquivoId: string, dados: DadosMetadadosArquivo, usuarioId: string | null): Promise<Arquivo>;
  /** Re-roda o preflight (ex.: apos editar requisitos do Servico) — idempotente. */
  reanalisar(arquivoId: string, usuarioId?: string | null): Promise<Arquivo>;
  aprovarTecnicamente(arquivoId: string, usuarioId: string, comentario: string | null): Promise<Arquivo>;
  rejeitarTecnicamente(arquivoId: string, usuarioId: string, comentario: string | null): Promise<Arquivo>;
  /** Gera (ou reaproveita) o token publico e muda a situacao para aguardando o cliente. */
  enviarParaAprovacaoCliente(arquivoId: string, usuarioId: string): Promise<Arquivo>;
  /** Usado pela pagina publica (sem RBAC) — decisao do cliente via token. */
  registrarDecisaoPublicaCliente(
    token: string,
    decisao: "aprovado" | "alteracao_solicitada" | "rejeitado",
    comentario: string | null,
  ): Promise<Arquivo>;
};
