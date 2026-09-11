# CHECKPOINT MVP LOCAL-FIRST - HARDENING/QA

Data: 10/09/2026.
Status: **ENTREGUE / AGUARDANDO VALIDACAO DO USUARIO**.
Branch: `claude/7grafica-foundation-setup-qrpydv`.
Commit validado pelo CI: `069813292e8d5ac63f6249fb8840d9c120c95f03`.
GitHub Actions: [run 34523055834](https://github.com/CMOURASIGA/7grafica/actions/runs/34523055834).
PR tecnico em rascunho: [#1](https://github.com/CMOURASIGA/7grafica/pull/1), sem merge na `main`.

**SPECs 01 a 12 permanecem concluidas/validadas. Nenhuma SPEC 13, migracao para Supabase, homologacao ou producao esta autorizada por este checkpoint.**

## Escopo executado

- Chromium instalado de forma reproduzivel no Ubuntu do GitHub com `npx playwright install --with-deps chromium`.
- CI independente configurado para push e pull request.
- TypeScript, ESLint, Vitest, build Next.js e Playwright executados automaticamente.
- RBAC e isolamento por empresa reforcados no proxy central dos repositories.
- Responsividade executada em desktop, tablet e mobile.
- Fluxo integral automatizado sobre o mesmo dataset e os repositories consolidados.
- Relatorios, dominios e persistencia local-first existentes foram preservados.

## Resultado automatizado final

| Verificacao | Resultado |
|---|---|
| Instalacao do Chromium | aprovada |
| TypeScript | aprovado |
| ESLint | zero erros; cinco warnings legados de `<img>` |
| Vitest | 125 testes aprovados em 19 arquivos |
| Build Next.js 15.5.25 | aprovado |
| Playwright | 22 aprovados, 2 duplicacoes do fluxo integral ignoradas explicitamente |
| Viewports | desktop 1440x900, tablet 768x1024 e mobile 390x844 |
| Artefatos | relatorio, screenshots e traces publicados pelo CI |
| Status independente | GitHub Actions verde |

Os 21 cenarios acumulados das SPECs foram executados nos tres projetos responsivos. O fluxo integral adicional roda uma vez em desktop; tablet e mobile sao ignorados somente nesse teste duplicado porque a responsividade ja e coberta pelos cenarios dedicados.

## Fluxo integral validado

O Playwright percorreu a mesma cadeia de dados:

`Cliente -> Orcamento aprovado -> Pedido -> Compra/Estoque -> Arquivo -> Producao -> Recebimento/Financeiro -> Entrega -> Portal -> Relatorios`.

O teste confirmou persistencia entre paginas, consumo dos repositories existentes, arquivo liberado, Trabalho concluido, recebimento no Pedido, comprovacao de entrega, acesso do cliente e reflexo no relatorio. Nenhum dominio paralelo foi criado.

## RBAC e isolamento multiempresa

Foram acrescentados testes no nivel do proxy autorizado para confirmar:

- bloqueio de leitura, criacao e atualizacao entre empresas;
- escopo da empresa ativa nos repositories de Empresa, Usuario e Auditoria;
- substituicao do autor de auditoria pelo usuario autenticado;
- acesso do Operador ao resumo logistico sem acesso ao Pedido ou historico financeiro;
- separacao entre Relatorios gerenciais e administracao sensivel de seguranca;
- verificacao de empresa do Trabalho e do Arquivo antes de expor arquivo ao Operador.

O registro de auditoria e a consulta minima de usuarios receberam permissoes tecnicas separadas das permissoes de administracao. Isso permite que repositories auditem operacoes e resolvam responsaveis sem conceder leitura da auditoria empresarial ou gestao de usuarios.

## Regressoes reais encontradas e corrigidas

1. **Entrega do Operador quebrava ao consultar Pedidos.** A tela passou a consumir uma projecao logistica minima do repository de Entrega. O Operador ve o numero do Pedido sem receber o dominio comercial completo ou link para a tela restrita.
2. **Historico consolidado podia expor eventos financeiros ao Operador.** A autorizacao do `historicoPedido` foi restringida aos papeis internos que ja gerenciam Pedidos.
3. **Escopo central tinha lacunas em Empresa, Usuario, Auditoria e CRUD generico.** Foram adicionadas validacoes da empresa ativa antes e depois das operacoes, incluindo protecao de criacao e mutacao por ID.
4. **Tela de Trabalho do Operador tentava ler a auditoria empresarial.** O Operador agora carrega o Trabalho sem consultar a colecao global de auditoria.
5. **Campos de recebimento do Pedido nao tinham associacao acessivel entre label e controle.** `htmlFor` e `id` foram adicionados a forma de pagamento, valor e valor entregue.

Os seletores Playwright ambiguos foram tornados deterministas. Nenhum comportamento consolidado foi alterado para esconder falhas.

## Observacoes e dividas anteriores a producao

- O MVP continua local-first e os links publicos continuam limitados ao armazenamento do navegador.
- Autenticacao e politica de 2FA ainda sao simuladas; Supabase Auth, sessao real e TOTP continuam obrigatorios antes da producao.
- RLS e Storage reais dependem do ciclo futuro de migracao, ainda nao autorizado.
- `npm audit --omit=dev` aponta duas vulnerabilidades transitivas de producao em `postcss` via Next.js, uma moderada e uma alta. A correcao oferecida exige migracao principal para Next.js 16.3.4 e deve ocorrer em ciclo controlado, com repeticao integral desta suite.
- Os cinco warnings de `<img>` permanecem anteriores ao hardening e nao impedem o build.

## Decisao do checkpoint

O ciclo de Hardening/QA esta tecnicamente entregue e possui CI independente verde. O MVP local-first pode seguir para validacao do usuario, mas **ainda nao deve ser classificado como homologavel ou pronto para producao**.

Parar neste ponto. Aguardar validacao expressa antes de qualquer migracao para Supabase, Auth real, RLS, Storage, TOTP/2FA real, ambiente de homologacao ou nova funcionalidade.
