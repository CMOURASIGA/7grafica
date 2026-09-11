-- RLS: nenhuma tabela desta SPEC fica acessivel sem policy explicita.
-- Regra do projeto: isolamento por empresa desde o dia 1, nao deixado para depois.

alter table public.empresas enable row level security;
alter table public.usuarios_perfil enable row level security;
alter table public.empresa_usuarios enable row level security;
alter table public.papel_permissoes enable row level security;
alter table public.feature_flags enable row level security;
alter table public.eventos_auditoria enable row level security;

-- empresas -------------------------------------------------------------
create policy empresas_select on public.empresas
  for select
  using (id in (select public.empresas_do_usuario()));

create policy empresas_update on public.empresas
  for update
  using (
    public.usuario_tem_permissao(id, 'gerenciar_empresa')
    or public.usuario_tem_permissao(id, 'gerenciar_whitelabel')
  )
  with check (
    public.usuario_tem_permissao(id, 'gerenciar_empresa')
    or public.usuario_tem_permissao(id, 'gerenciar_whitelabel')
  );

-- criacao de empresa e provisionamento (fora do fluxo de usuario comum):
-- feita pela service role (onboarding), por isso nao ha policy de insert
-- para usuarios autenticados nesta SPEC.

-- usuarios_perfil --------------------------------------------------------
create policy usuarios_perfil_select on public.usuarios_perfil
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.empresa_usuarios mine
      join public.empresa_usuarios their on their.empresa_id = mine.empresa_id
      where mine.usuario_id = auth.uid()
        and mine.ativo = true
        and their.usuario_id = usuarios_perfil.id
        and their.ativo = true
    )
  );

create policy usuarios_perfil_insert_self on public.usuarios_perfil
  for insert
  with check (id = auth.uid());

create policy usuarios_perfil_update_self on public.usuarios_perfil
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- empresa_usuarios ---------------------------------------------------------
create policy empresa_usuarios_select on public.empresa_usuarios
  for select
  using (empresa_id in (select public.empresas_do_usuario()));

create policy empresa_usuarios_write on public.empresa_usuarios
  for all
  using (public.usuario_tem_permissao(empresa_id, 'gerenciar_usuarios'))
  with check (public.usuario_tem_permissao(empresa_id, 'gerenciar_usuarios'));

-- papel_permissoes: leitura publica para autenticados (matriz nao e segredo,
-- e necessaria para a UI decidir o que mostrar); escrita restrita a service role.
create policy papel_permissoes_select on public.papel_permissoes
  for select
  to authenticated
  using (true);

-- feature_flags ------------------------------------------------------------
create policy feature_flags_select on public.feature_flags
  for select
  using (empresa_id is null or empresa_id in (select public.empresas_do_usuario()));

create policy feature_flags_write on public.feature_flags
  for all
  using (empresa_id is not null and public.usuario_tem_permissao(empresa_id, 'gerenciar_feature_flags'))
  with check (empresa_id is not null and public.usuario_tem_permissao(empresa_id, 'gerenciar_feature_flags'));

-- eventos_auditoria ----------------------------------------------------------
create policy eventos_auditoria_select on public.eventos_auditoria
  for select
  using (public.usuario_tem_permissao(empresa_id, 'ver_auditoria'));

create policy eventos_auditoria_insert on public.eventos_auditoria
  for insert
  with check (
    empresa_id in (select public.empresas_do_usuario())
    and (usuario_id is null or usuario_id = auth.uid())
  );

-- Sem policy de update/delete em eventos_auditoria: trilha imutavel.
