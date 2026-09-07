# 7Grafica

Plataforma de gestao operacional para graficas.

## Documentacao

- docs/00-PRODUCT-VISION.md
- docs/01-DESIGN-SYSTEM.md
- docs/02-DOMAIN-MODEL.md
- specs/00-ROADMAP.md
- specs/01-FOUNDATION.md
- specs/02-CADASTROS.md
- specs/03-EMAIL-ORCAMENTO.md
- specs/04-PDV-CAIXA.md
- specs/05-PEDIDOS-KANBAN.md
- specs/06-PRODUCAO-EQUIPAMENTOS.md
- specs/07-ARQUIVOS-ARTE.md
- specs/08-ESTOQUE-COMPRAS.md
- specs/09-FINANCEIRO.md
- specs/10-PORTAL-CLIENTE.md
- specs/11-ENTREGA-HISTORICO.md
- specs/12-RELATORIOS-ADMIN.md

## Branches

- main: linha estavel
- develop: desenvolvimento

## Diretriz visual

O 7Grafica deve seguir os componentes, shell e padrao visual atual do 7Commander, inclusive a regra de identidade no canto superior esquerdo adotada nos produtos do HUB Consult Services.

## Rodando localmente

```bash
npm install
npm run dev
```

Nenhuma variavel de ambiente e necessaria. O MVP roda com dados mockados
persistidos em **LocalStorage** — fase de validacao operacional do produto,
antes de provisionar o Supabase definitivo. No primeiro acesso o app semeia
automaticamente uma empresa de demonstracao ("Grafica Nova Era"), 4 usuarios
(um por papel) e os cadastros da SPEC 02. A tela de login lista as
credenciais de demonstracao para preencher com um clique.

Em **Configuracoes** (perfil admin) existe "Restaurar dados de demonstracao"
para descartar qualquer alteracao local e voltar ao conjunto original.

### Arquitetura de persistencia (importante para as proximas SPECs)

Nenhum componente ou pagina acessa `localStorage` ou Supabase diretamente.
Toda leitura/escrita passa por uma camada de repositorios:

```
UI / regra de negocio
        │  usa apenas tipos de lib/repositories/types.ts
        ▼
lib/repositories/index.ts  (getRepositories() — o unico ponto de escolha do adapter)
        │
        ▼
lib/repositories/local/*   (adapter ativo hoje: LocalStorage)
        │
        ▼
lib/storage/local-storage-client.ts  (unico arquivo que toca window.localStorage)
```

Quando o Supabase definitivo for provisionado, um novo
`lib/repositories/supabase/*` implementa as mesmas interfaces de
`lib/repositories/types.ts` e `getRepositories()` passa a devolve-lo — nenhuma
tela, formulario ou regra de negocio precisa mudar. As migrations e a
arquitetura de RLS/RBAC/auditoria da Foundation (`supabase/migrations/`,
`lib/supabase/*`, `lib/auth/session.ts`) continuam no repositorio, prontas
para esse momento, mas não são usadas pelo MVP local — a autenticação atual
é simulada (usuários, empresa, papéis e permissões seedados) só para validar
os fluxos.

**Limitação de MVP a conhecer antes de demonstrar o sistema:** links
públicos por token (`/portal/orcamento/[token]`, `/portal/pedido/[token]`) só
resolvem no mesmo navegador que criou o registro, porque os dados vivem em
LocalStorage. Ver **docs/MVP-LOCALSTORAGE.md** para o detalhe e para os dois
requisitos de design que a migração ao Supabase precisa cumprir (token
público revogável e validado no servidor; adapter público restrito ao
recurso do token, nunca um repositório genérico).

### Documentacao

- docs/00-PRODUCT-VISION.md
- docs/01-DESIGN-SYSTEM.md
- docs/02-DOMAIN-MODEL.md
- docs/MVP-LOCALSTORAGE.md
- specs/00-ROADMAP.md
- specs/01-FOUNDATION.md
- specs/02-CADASTROS.md
- specs/03-EMAIL-ORCAMENTO.md
- specs/04-PDV-CAIXA.md
- specs/05-PEDIDOS-KANBAN.md
- specs/06-PRODUCAO-EQUIPAMENTOS.md
- specs/07-ARQUIVOS-ARTE.md
- specs/08-ESTOQUE-COMPRAS.md
- specs/09-FINANCEIRO.md
- specs/10-PORTAL-CLIENTE.md
- specs/11-ENTREGA-HISTORICO.md
- specs/12-RELATORIOS-ADMIN.md

### Quando o Supabase definitivo for provisionado

```bash
cp .env.example .env.local   # preencha com o projeto Supabase real
```

Aplique `supabase/migrations/` com a Supabase CLI (`supabase db push`) ou MCP.

Scripts:

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` / `npm run typecheck`
- `npm run test` (Vitest)
