-- Seed da matriz de permissoes por papel. Mantida em espelho com
-- lib/rbac.ts (MATRIZ_PAPEIS) — qualquer mudanca deve ser feita nos dois
-- lugares ate existir uma tela de administracao de papeis (fora do escopo
-- da Foundation).

insert into public.papel_permissoes (papel, permissao) values
  ('admin', 'gerenciar_empresa'),
  ('admin', 'gerenciar_usuarios'),
  ('admin', 'gerenciar_whitelabel'),
  ('admin', 'gerenciar_feature_flags'),
  ('admin', 'ver_auditoria'),
  ('gerente', 'gerenciar_usuarios'),
  ('gerente', 'ver_auditoria')
on conflict (papel, permissao) do nothing;
