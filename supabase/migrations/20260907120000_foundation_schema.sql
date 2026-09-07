-- SPEC 01 - Foundation
-- Esquema base: empresas (tenants/whitelabel), perfis de usuario, vinculo
-- usuario-empresa com papel (RBAC), matriz de permissoes por papel,
-- feature flags e auditoria imutavel.
--
-- Convencao: nomes de tabela/coluna em portugues, alinhados ao dominio
-- documentado em docs/02-DOMAIN-MODEL.md. Nenhuma tabela de dominio de
-- negocio (Cliente, Pedido, Trabalho etc.) e criada aqui — isso pertence as
-- specs 02+.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- empresas: unidade de isolamento multiempresa/whitelabel.
-- ---------------------------------------------------------------------
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  logo_url text,
  cor_primaria text,
  cor_destaque text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.empresas is 'Tenant/whitelabel. Toda tabela de dominio referencia empresa_id e e isolada por RLS.';

-- ---------------------------------------------------------------------
-- usuarios_perfil: extensao de auth.users com dados de perfil.
-- ---------------------------------------------------------------------
create table if not exists public.usuarios_perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text,
  avatar_url text,
  mfa_habilitado boolean not null default false,
  criado_em timestamptz not null default now()
);

comment on table public.usuarios_perfil is 'Perfil de aplicacao 1:1 com auth.users. mfa_habilitado e a base para 2FA (fluxo completo fica fora da Foundation).';

-- ---------------------------------------------------------------------
-- empresa_usuarios: vinculo N:N usuario<->empresa, com papel (RBAC).
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('admin', 'gerente', 'atendente', 'operador');

create table if not exists public.empresa_usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_usuario not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (empresa_id, usuario_id)
);

create index if not exists empresa_usuarios_usuario_idx on public.empresa_usuarios (usuario_id);
create index if not exists empresa_usuarios_empresa_idx on public.empresa_usuarios (empresa_id);

comment on table public.empresa_usuarios is 'RBAC: um usuario pode pertencer a mais de uma empresa (ex.: equipe Consult Services), cada vinculo com seu papel.';

-- ---------------------------------------------------------------------
-- papel_permissoes: matriz de permissoes por papel (fonte de verdade das
-- policies de RLS). Espelhada em lib/rbac.ts para uso na UI.
-- ---------------------------------------------------------------------
create table if not exists public.papel_permissoes (
  papel public.papel_usuario not null,
  permissao text not null,
  primary key (papel, permissao)
);

-- ---------------------------------------------------------------------
-- feature_flags: chave global (empresa_id null) ou por empresa.
-- ---------------------------------------------------------------------
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas (id) on delete cascade,
  chave text not null,
  habilitado boolean not null default false,
  descricao text,
  unique (empresa_id, chave)
);

comment on table public.feature_flags is 'empresa_id nulo = flag global aplicada a todas as empresas, salvo override por empresa.';

-- ---------------------------------------------------------------------
-- eventos_auditoria: log imutavel (sem policy de update/delete).
-- ---------------------------------------------------------------------
create table if not exists public.eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  dados_antes jsonb,
  dados_depois jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_auditoria_empresa_idx on public.eventos_auditoria (empresa_id, criado_em desc);

comment on table public.eventos_auditoria is 'Trilha de auditoria imutavel: sem UPDATE/DELETE permitido via RLS.';
