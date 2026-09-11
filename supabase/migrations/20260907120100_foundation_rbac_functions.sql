-- Funcoes auxiliares de RBAC/RLS. security definer + search_path fixo para
-- evitar que policies fiquem lentas com subqueries repetidas e para blindar
-- contra hijack de search_path.

create or replace function public.empresas_do_usuario()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id
  from public.empresa_usuarios
  where usuario_id = auth.uid()
    and ativo = true;
$$;

comment on function public.empresas_do_usuario() is 'Empresas ativas do usuario autenticado. Base de toda policy de isolamento multiempresa.';

create or replace function public.usuario_tem_permissao(p_empresa_id uuid, p_permissao text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.empresa_usuarios eu
    join public.papel_permissoes pp on pp.papel = eu.papel
    where eu.usuario_id = auth.uid()
      and eu.empresa_id = p_empresa_id
      and eu.ativo = true
      and pp.permissao = p_permissao
  );
$$;

comment on function public.usuario_tem_permissao(uuid, text) is 'RBAC: usuario autenticado tem a permissao informada na empresa informada?';
