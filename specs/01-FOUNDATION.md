# SPEC 01 - Foundation

**Status: CONCLUIDA E VALIDADA**

## Objetivo
Criar a base tecnica, visual, de seguranca e de extensibilidade do 7Grafica.

## Entregue

- Next.js App Router + TypeScript + Tailwind v4.
- Estrutura Supabase/Postgres preparada com migrations, RLS, RBAC, auditoria e autenticacao por e-mail/senha.
- Nenhuma migration aplicada remotamente: ainda nao existe projeto Supabase definitivo do 7Grafica.
- Shell autenticado responsivo: desktop, tablet e mobile.
- Telas de login, dashboard inicial, configuracoes e auditoria.
- Componentes e tokens alinhados ao 7Commander, removendo referencias especificas a Kairos/7Commander.
- Whitelabel por empresa com logo/cores e fallback Consult Services; nunca usar icone `C` isolado.
- RBAC multiempresa com papeis admin, gerente, atendente e operador.
- Auditoria imutavel preparada.
- Migrations mantidas em `supabase/migrations/` para aplicacao futura.

## Ajuste de estrategia apos a Foundation

O MVP passou a operar em modo **local-first** para permitir validacao funcional antes do provisionamento do Supabase.

- Dataset mockado persistido em LocalStorage.
- `lib/storage/local-storage-client.ts` e o unico ponto que acessa `window.localStorage`.
- Interfaces por agregado em `lib/repositories/types.ts`.
- Adapter em `lib/repositories/local/*`.
- Seam unico em `lib/repositories/index.ts -> getRepositories()`.
- Futuro adapter Supabase devera implementar as mesmas interfaces sem alterar as telas.
- Autenticacao, empresa, papeis e permissoes sao simulados no MVP local.

## Decisoes consolidadas

- Login e-mail/senha e aceitavel para o MVP; SSO pode ser evolucao.
- Usuario pode pertencer a mais de uma empresa; selecao explicita de empresa ativa fica como evolucao. A escolha da primeira vinculada nao deve ser tratada como regra definitiva.
- `usuarios_perfil.email` e dado auxiliar, nunca fonte de autorizacao.
- Modo local e estrategia de MVP/desenvolvimento, nao arquitetura definitiva de producao.
- Service role nunca deve ser exposta ao cliente quando o Supabase entrar.

## Criterio de aceite atingido

Shell, navegacao, whitelabel, responsividade, perfis, base de autorizacao e arquitetura de persistencia foram validados. A SPEC 01 esta encerrada.
