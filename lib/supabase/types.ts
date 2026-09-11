// Tipos manuais alinhados as migrations de supabase/migrations/. Quando um
// projeto Supabase real estiver provisionado, substituir por
// `supabase gen types typescript` e manter este arquivo como fallback do
// schema da Foundation (empresas, usuarios, papeis, auditoria, feature flags).

export type Papel = "admin" | "gerente" | "atendente" | "operador";

export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_destaque: string | null;
  ativo: boolean;
  criado_em: string;
};

export type UsuarioPerfil = {
  id: string; // = auth.users.id
  nome: string;
  email: string | null;
  avatar_url: string | null;
  mfa_habilitado: boolean;
  criado_em: string;
};

export type EmpresaUsuario = {
  id: string;
  empresa_id: string;
  usuario_id: string;
  papel: Papel;
  ativo: boolean;
  criado_em: string;
};

export type FeatureFlag = {
  id: string;
  empresa_id: string | null;
  chave: string;
  habilitado: boolean;
  descricao: string | null;
};

export type EventoAuditoria = {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  criado_em: string;
};

export type Database = {
  public: {
    Tables: {
      empresas: { Row: Empresa; Insert: Partial<Empresa>; Update: Partial<Empresa> };
      usuarios_perfil: { Row: UsuarioPerfil; Insert: Partial<UsuarioPerfil>; Update: Partial<UsuarioPerfil> };
      empresa_usuarios: { Row: EmpresaUsuario; Insert: Partial<EmpresaUsuario>; Update: Partial<EmpresaUsuario> };
      feature_flags: { Row: FeatureFlag; Insert: Partial<FeatureFlag>; Update: Partial<FeatureFlag> };
      eventos_auditoria: { Row: EventoAuditoria; Insert: Partial<EventoAuditoria>; Update: Partial<EventoAuditoria> };
    };
  };
};
