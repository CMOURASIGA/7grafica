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
  FormaPagamento,
  Fornecedor,
  Material,
  Orcamento,
  Pedido,
  Servico,
  Solicitacao,
  UnidadeMedida,
  UsuarioPerfil,
  Workflow,
} from "@/lib/domain/entities";

// Dados de demonstracao da "Grafica Nova Era" — uma unica empresa, com
// entidades cruzadas por id estavel para que as proximas SPECs (PDV,
// orcamento, pedido, kanban, portal) reaproveitem os MESMOS clientes,
// servicos e materiais em vez de criar mocks isolados por tela.

export const EMPRESA_DEMO_ID = "empresa-1";

// Marca simples via SVG inline (data URI): prova que whitelabel funciona
// offline, sem depender de rede para uma URL externa.
const LOGO_DEMO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="18" fill="#7a1f2b"/><text x="60" y="70" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#f4d35e" text-anchor="middle">GNE</text></svg>`,
  );

export const empresasSeed: Empresa[] = [
  {
    id: EMPRESA_DEMO_ID,
    nome: "Grafica Nova Era",
    slug: "grafica-nova-era",
    logoUrl: LOGO_DEMO,
    corPrimaria: "#7a1f2b",
    corDestaque: "#f4d35e",
    ativo: true,
    criadoEm: "2026-01-06T09:00:00.000Z",
  },
];

export const usuariosPerfilSeed: UsuarioPerfil[] = [
  { id: "usuario-admin", nome: "Ana Diretoria", email: "admin@graficanovaera.com.br", avatarUrl: null, mfaHabilitado: false, criadoEm: "2026-01-06T09:00:00.000Z" },
  { id: "usuario-gerente", nome: "Bruno Gerente", email: "gerente@graficanovaera.com.br", avatarUrl: null, mfaHabilitado: false, criadoEm: "2026-01-06T09:00:00.000Z" },
  { id: "usuario-atendente", nome: "Carla Atendimento", email: "atendente@graficanovaera.com.br", avatarUrl: null, mfaHabilitado: false, criadoEm: "2026-01-06T09:00:00.000Z" },
  { id: "usuario-operador", nome: "Diego Producao", email: "operador@graficanovaera.com.br", avatarUrl: null, mfaHabilitado: false, criadoEm: "2026-01-06T09:00:00.000Z" },
];

export const empresaUsuariosSeed: EmpresaUsuario[] = [
  { id: "vinculo-admin", empresaId: EMPRESA_DEMO_ID, usuarioId: "usuario-admin", papel: "admin", ativo: true, criadoEm: "2026-01-06T09:00:00.000Z" },
  { id: "vinculo-gerente", empresaId: EMPRESA_DEMO_ID, usuarioId: "usuario-gerente", papel: "gerente", ativo: true, criadoEm: "2026-01-06T09:00:00.000Z" },
  { id: "vinculo-atendente", empresaId: EMPRESA_DEMO_ID, usuarioId: "usuario-atendente", papel: "atendente", ativo: true, criadoEm: "2026-01-06T09:00:00.000Z" },
  { id: "vinculo-operador", empresaId: EMPRESA_DEMO_ID, usuarioId: "usuario-operador", papel: "operador", ativo: true, criadoEm: "2026-01-06T09:00:00.000Z" },
];

/** Senha unica de demonstracao para todos os usuarios seedados. */
export const SENHA_DEMO = "demo123";

export const credenciaisDemoSeed = usuariosPerfilSeed.map((usuario) => ({
  usuarioId: usuario.id,
  email: usuario.email,
  senha: SENHA_DEMO,
}));

// --- Cadastros (SPEC 02) ---------------------------------------------------

export const clientesSeed: Cliente[] = [
  { id: "cliente-1", empresaId: EMPRESA_DEMO_ID, tipo: "PJ", nome: "Padaria Sabor & Cia LTDA", documento: "12.345.678/0001-90", observacoes: "Cliente recorrente — pedidos mensais de embalagens.", ativo: true, criadoEm: "2026-01-10T12:00:00.000Z" },
  { id: "cliente-2", empresaId: EMPRESA_DEMO_ID, tipo: "PJ", nome: "Studio Fitness Corpo Ativo", documento: "98.765.432/0001-10", observacoes: null, ativo: true, criadoEm: "2026-01-12T12:00:00.000Z" },
  { id: "cliente-3", empresaId: EMPRESA_DEMO_ID, tipo: "PF", nome: "Juliana Prado", documento: "123.456.789-00", observacoes: "Convites de casamento.", ativo: true, criadoEm: "2026-01-15T12:00:00.000Z" },
  { id: "cliente-4", empresaId: EMPRESA_DEMO_ID, tipo: "PJ", nome: "Escola Municipal Vila Nova", documento: "11.222.333/0001-44", observacoes: "Material didatico e faixas de evento.", ativo: true, criadoEm: "2026-01-20T12:00:00.000Z" },
  { id: "cliente-5", empresaId: EMPRESA_DEMO_ID, tipo: "PF", nome: "Ricardo Almeida", documento: "987.654.321-00", observacoes: null, ativo: true, criadoEm: "2026-02-02T12:00:00.000Z" },
];

export const contatosSeed: Contato[] = [
  { id: "contato-1", empresaId: EMPRESA_DEMO_ID, clienteId: "cliente-1", nome: "Fernanda Souza", cargo: "Compras", telefone: "(11) 98888-1010", principal: true, ativo: true },
  { id: "contato-2", empresaId: EMPRESA_DEMO_ID, clienteId: "cliente-2", nome: "Marcos Lima", cargo: "Socio", telefone: "(11) 97777-2020", principal: true, ativo: true },
  { id: "contato-3", empresaId: EMPRESA_DEMO_ID, clienteId: "cliente-3", nome: "Juliana Prado", cargo: null, telefone: "(11) 96666-3030", principal: true, ativo: true },
  { id: "contato-4", empresaId: EMPRESA_DEMO_ID, clienteId: "cliente-4", nome: "Secretaria Vila Nova", cargo: "Secretaria escolar", telefone: "(11) 3333-4040", principal: true, ativo: true },
  { id: "contato-5", empresaId: EMPRESA_DEMO_ID, clienteId: "cliente-5", nome: "Ricardo Almeida", cargo: null, telefone: "(11) 95555-5050", principal: true, ativo: true },
];

export const emailsContatoSeed: EmailContato[] = [
  { id: "email-1", empresaId: EMPRESA_DEMO_ID, contatoId: "contato-1", email: "fernanda@saborcia.com.br", principal: true },
  { id: "email-2", empresaId: EMPRESA_DEMO_ID, contatoId: "contato-2", email: "marcos@corpoativo.com", principal: true },
  { id: "email-3", empresaId: EMPRESA_DEMO_ID, contatoId: "contato-3", email: "juliana.prado@gmail.com", principal: true },
  { id: "email-4", empresaId: EMPRESA_DEMO_ID, contatoId: "contato-4", email: "secretaria@vilanova.edu.br", principal: true },
  { id: "email-5", empresaId: EMPRESA_DEMO_ID, contatoId: "contato-5", email: "ricardo.almeida@outlook.com", principal: true },
];

export const fornecedoresSeed: Fornecedor[] = [
  { id: "fornecedor-1", empresaId: EMPRESA_DEMO_ID, nome: "Papelaria Central Distribuidora", documento: "22.333.444/0001-55", telefone: "(11) 4000-1000", email: "vendas@papelariacentral.com.br", ativo: true },
  { id: "fornecedor-2", empresaId: EMPRESA_DEMO_ID, nome: "Grafica Insumos Brasil", documento: "33.444.555/0001-66", telefone: "(11) 4000-2000", email: "comercial@insumosbrasil.com.br", ativo: true },
  { id: "fornecedor-3", empresaId: EMPRESA_DEMO_ID, nome: "Vinil & Cia Adesivos", documento: "44.555.666/0001-77", telefone: "(11) 4000-3000", email: "contato@vinilecia.com.br", ativo: true },
];

export const categoriasServicoSeed: CategoriaServico[] = [
  { id: "categoria-1", empresaId: EMPRESA_DEMO_ID, nome: "Impressao digital" },
  { id: "categoria-2", empresaId: EMPRESA_DEMO_ID, nome: "Comunicacao visual" },
  { id: "categoria-3", empresaId: EMPRESA_DEMO_ID, nome: "Encadernacao e acabamento" },
];

export const servicosSeed: Servico[] = [
  { id: "servico-1", empresaId: EMPRESA_DEMO_ID, categoriaId: "categoria-1", nome: "Cartao de visita 300g (100 unid.)", descricao: "Impressao digital colorida frente e verso.", precoBase: 90, ativo: true },
  { id: "servico-2", empresaId: EMPRESA_DEMO_ID, categoriaId: "categoria-2", nome: "Banner lona 440g (m2)", descricao: "Impressao em lona com ilhoses.", precoBase: 35, ativo: true },
  { id: "servico-3", empresaId: EMPRESA_DEMO_ID, categoriaId: "categoria-3", nome: "Encadernacao espiral", descricao: "Espiral plastico ate 200 folhas.", precoBase: 12, ativo: true },
  { id: "servico-4", empresaId: EMPRESA_DEMO_ID, categoriaId: "categoria-1", nome: "Impressao A4 colorida (unid.)", descricao: null, precoBase: 1.5, ativo: true },
  { id: "servico-5", empresaId: EMPRESA_DEMO_ID, categoriaId: "categoria-2", nome: "Adesivo vinil recortado (m2)", descricao: null, precoBase: 60, ativo: true },
];

export const unidadesMedidaSeed: UnidadeMedida[] = [
  { id: "unidade-resma", empresaId: EMPRESA_DEMO_ID, nome: "Resma", sigla: "rm" },
  { id: "unidade-folha", empresaId: EMPRESA_DEMO_ID, nome: "Folha", sigla: "fl" },
  { id: "unidade-m2", empresaId: EMPRESA_DEMO_ID, nome: "Metro quadrado", sigla: "m2" },
  { id: "unidade-litro", empresaId: EMPRESA_DEMO_ID, nome: "Litro", sigla: "L" },
  { id: "unidade-unidade", empresaId: EMPRESA_DEMO_ID, nome: "Unidade", sigla: "un" },
];

export const materiaisSeed: Material[] = [
  { id: "material-1", empresaId: EMPRESA_DEMO_ID, nome: "Papel Couche 300g", unidadeCompraId: "unidade-resma", unidadeConsumoId: "unidade-folha", ativo: true },
  { id: "material-2", empresaId: EMPRESA_DEMO_ID, nome: "Lona 440g", unidadeCompraId: "unidade-m2", unidadeConsumoId: "unidade-m2", ativo: true },
  { id: "material-3", empresaId: EMPRESA_DEMO_ID, nome: "Tinta CMYK (cartucho)", unidadeCompraId: "unidade-unidade", unidadeConsumoId: "unidade-litro", ativo: true },
  { id: "material-4", empresaId: EMPRESA_DEMO_ID, nome: "Espiral plastico 12mm (pacote 50un)", unidadeCompraId: "unidade-unidade", unidadeConsumoId: "unidade-unidade", ativo: true },
  { id: "material-5", empresaId: EMPRESA_DEMO_ID, nome: "Vinil adesivo brilho", unidadeCompraId: "unidade-m2", unidadeConsumoId: "unidade-m2", ativo: true },
];

export const conversoesUnidadeSeed: ConversaoUnidade[] = [
  { id: "conv-1", empresaId: EMPRESA_DEMO_ID, materialId: "material-1", fator: 500 },
  { id: "conv-2", empresaId: EMPRESA_DEMO_ID, materialId: "material-2", fator: 1 },
  { id: "conv-3", empresaId: EMPRESA_DEMO_ID, materialId: "material-3", fator: 0.5 },
  { id: "conv-4", empresaId: EMPRESA_DEMO_ID, materialId: "material-4", fator: 50 },
  { id: "conv-5", empresaId: EMPRESA_DEMO_ID, materialId: "material-5", fator: 1 },
];

export const equipamentosSeed: Equipamento[] = [
  { id: "equip-1", empresaId: EMPRESA_DEMO_ID, nome: "Impressora Digital HP Indigo", tipo: "impressora", ativo: true },
  { id: "equip-2", empresaId: EMPRESA_DEMO_ID, nome: "Plotter Lona 3.2m", tipo: "impressora", ativo: true },
  { id: "equip-3", empresaId: EMPRESA_DEMO_ID, nome: "Guilhotina Industrial 92cm", tipo: "guilhotina", ativo: true },
  { id: "equip-4", empresaId: EMPRESA_DEMO_ID, nome: "Encadernadora Espiral", tipo: "encadernadora", ativo: true },
];

export const capacidadesEquipamentoSeed: CapacidadeEquipamento[] = [
  { id: "cap-1", empresaId: EMPRESA_DEMO_ID, equipamentoId: "equip-1", formatos: "A4, A3, SRA3", corPB: "ambos", duplex: true, observacoes: null },
  { id: "cap-2", empresaId: EMPRESA_DEMO_ID, equipamentoId: "equip-2", formatos: "Ate 3.2m de largura", corPB: "cor", duplex: false, observacoes: "Impressao solvente." },
  { id: "cap-3", empresaId: EMPRESA_DEMO_ID, equipamentoId: "equip-3", formatos: "Ate 92cm", corPB: "ambos", duplex: false, observacoes: "Corte reto de pilhas ate 8cm de altura." },
  { id: "cap-4", empresaId: EMPRESA_DEMO_ID, equipamentoId: "equip-4", formatos: "A4, A5, Oficio", corPB: "ambos", duplex: false, observacoes: null },
];

export const formasPagamentoSeed: FormaPagamento[] = [
  { id: "fp-1", empresaId: EMPRESA_DEMO_ID, nome: "Dinheiro", ativo: true },
  { id: "fp-2", empresaId: EMPRESA_DEMO_ID, nome: "Pix", ativo: true },
  { id: "fp-3", empresaId: EMPRESA_DEMO_ID, nome: "Cartao de debito", ativo: true },
  { id: "fp-4", empresaId: EMPRESA_DEMO_ID, nome: "Cartao de credito", ativo: true },
  { id: "fp-5", empresaId: EMPRESA_DEMO_ID, nome: "Boleto", ativo: true },
];

export const workflowsSeed: Workflow[] = [
  { id: "workflow-1", empresaId: EMPRESA_DEMO_ID, nome: "Impressao digital padrao", categoriaServicoId: "categoria-1", ativo: true },
  { id: "workflow-2", empresaId: EMPRESA_DEMO_ID, nome: "Comunicacao visual", categoriaServicoId: "categoria-2", ativo: true },
];

export const etapasWorkflowSeed: EtapaWorkflow[] = [
  { id: "etapa-1-1", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-1", ordem: 1, nome: "Recebimento do arquivo", tipo: "humana" },
  { id: "etapa-1-2", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-1", ordem: 2, nome: "Analise tecnica", tipo: "humana" },
  { id: "etapa-1-3", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-1", ordem: 3, nome: "Impressao", tipo: "automatica" },
  { id: "etapa-1-4", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-1", ordem: 4, nome: "Acabamento", tipo: "humana" },
  { id: "etapa-1-5", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-1", ordem: 5, nome: "Conferencia final", tipo: "humana" },
  { id: "etapa-2-1", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-2", ordem: 1, nome: "Aprovacao de arte", tipo: "humana" },
  { id: "etapa-2-2", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-2", ordem: 2, nome: "Impressao plotter", tipo: "automatica" },
  { id: "etapa-2-3", empresaId: EMPRESA_DEMO_ID, workflowId: "workflow-2", ordem: 3, nome: "Acabamento e instalacao", tipo: "hibrida" },
];

// --- SPEC 03: Entrada por E-mail e Orcamentos ------------------------------
//
// Continua o MESMO dataset: os clientes/contatos/servicos/materiais abaixo
// sao os ja seedados acima (cliente-1/contato-1, cliente-2/contato-2,
// servico-1, material-1) — nenhuma massa nova e independente. Um e-mail
// (email-in-3) ja percorreu o fluxo completo ate Pedido, para validar a
// cadeia inteira; os outros dois ficam "em aberto" para o atendente
// processar manualmente (um identificado, um nao identificado).

export const emailsRecebidosSeed: EmailRecebido[] = [
  {
    id: "email-in-1",
    empresaId: EMPRESA_DEMO_ID,
    remetente: "contato@grafitestudio.com.br",
    assunto: "Orcamento para 500 sacolas personalizadas",
    corpo: "Boa tarde, gostaria de um orcamento para 500 sacolas de papel kraft com nossa logo em 1 cor. Podem me passar valores?",
    anexos: [{ nome: "logo-grafite.png" }],
    recebidoEm: "2026-03-01T13:20:00.000Z",
    clienteId: null,
    contatoId: null,
    solicitacaoId: null,
    status: "novo",
  },
  {
    id: "email-in-2",
    empresaId: EMPRESA_DEMO_ID,
    remetente: "marcos@corpoativo.com",
    assunto: "Banners para inauguracao da nova unidade",
    corpo: "Ola! Vamos abrir uma nova unidade e precisamos de 3 banners grandes para a fachada. Consegue me orcar?",
    anexos: [],
    recebidoEm: "2026-03-03T09:05:00.000Z",
    clienteId: "cliente-2",
    contatoId: "contato-2",
    solicitacaoId: null,
    status: "vinculado",
  },
  {
    id: "email-in-3",
    empresaId: EMPRESA_DEMO_ID,
    remetente: "fernanda@saborcia.com.br",
    assunto: "Cartoes de visita novos",
    corpo: "Precisamos renovar os cartoes de visita da equipe de vendas. Pode orcar 200 unidades com verniz localizado?",
    anexos: [{ nome: "arte-cartao-sabor.pdf" }],
    recebidoEm: "2026-02-18T10:00:00.000Z",
    clienteId: "cliente-1",
    contatoId: "contato-1",
    solicitacaoId: "solic-1",
    status: "vinculado",
  },
];

export const solicitacoesSeed: Solicitacao[] = [
  {
    id: "solic-1",
    empresaId: EMPRESA_DEMO_ID,
    origem: "email",
    emailOrigemId: "email-in-3",
    clienteId: "cliente-1",
    contatoId: "contato-1",
    assunto: "Cartoes de visita novos",
    descricao: "Renovacao de 200 cartoes de visita da equipe de vendas, com verniz localizado.",
    status: "orcamento_criado",
    criadaEm: "2026-02-18T10:15:00.000Z",
  },
];

export const orcamentosSeed: Orcamento[] = [
  {
    id: "orc-1",
    empresaId: EMPRESA_DEMO_ID,
    solicitacaoId: "solic-1",
    clienteId: "cliente-1",
    numero: "ORC-0001",
    versao: 1,
    orcamentoOrigemId: "orc-1",
    itens: [
      {
        id: "orc-1-item-1",
        descricao: "Cartao de visita 300g, verniz localizado",
        quantidade: 2,
        servicoId: "servico-1",
        materialId: "material-1",
        acabamentos: "Verniz localizado frente",
        precoUnitario: 90,
      },
    ],
    prazoEntregaDias: 5,
    validadeAte: "2026-03-05T23:59:59.000Z",
    observacoes: "Manter identidade visual atual (logo e cores).",
    valorTotal: 180,
    status: "aprovado",
    tokenAcompanhamento: "demo-token-orc-0001",
    justificativaCliente: null,
    motivoRejeicao: null,
    criadoEm: "2026-02-18T11:00:00.000Z",
    enviadoEm: "2026-02-18T11:05:00.000Z",
    decididoEm: "2026-02-19T08:30:00.000Z",
  },
];

export const emailsEnviadosSeed: EmailEnviado[] = [
  {
    id: "email-out-1",
    empresaId: EMPRESA_DEMO_ID,
    orcamentoId: "orc-1",
    destinatario: "fernanda@saborcia.com.br",
    assunto: "Orcamento ORC-0001 (V1) — 7Grafica",
    corpo: "Seu orcamento esta pronto. Acesse o link para aprovar, pedir ajuste ou recusar: /portal/orcamento/demo-token-orc-0001",
    link: "/portal/orcamento/demo-token-orc-0001",
    enviadoEm: "2026-02-18T11:05:00.000Z",
  },
];

export const pedidosSeed: Pedido[] = [
  {
    id: "pedido-1",
    empresaId: EMPRESA_DEMO_ID,
    clienteId: "cliente-1",
    orcamentoId: "orc-1",
    numero: "PED-0001",
    status: "confirmado",
    criadoEm: "2026-02-19T08:31:00.000Z",
  },
];
