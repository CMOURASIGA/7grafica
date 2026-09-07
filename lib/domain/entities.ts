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
