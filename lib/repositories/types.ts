// Portas (interfaces) da camada de persistencia. UI e regra de negocio
// dependem apenas destes tipos — nunca de lib/storage/* (LocalStorage) nem
// de lib/supabase/* diretamente. Isso e o que permite trocar o adapter
// LocalStorage por um adapter Supabase mais tarde sem reescrever telas.
//
// Convencao: todo metodo e assincrono, mesmo o adapter local sendo sincrono
// por baixo — assim o call-site (componentes, hooks) ja fica correto para
// quando o adapter real fizer round-trip de rede.

import type {
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
  Orcamento,
  Papel,
  Pedido,
  Servico,
  Solicitacao,
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
export type EquipamentoRepository = CrudRepository<Equipamento, Omit<Equipamento, "id">>;
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
  /** Unica forma de criar um Pedido: sempre a partir de um Orcamento aprovado (regra de produto). */
  criarAPartirDeOrcamentoAprovado(orcamentoId: string): Promise<Pedido>;
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
};
