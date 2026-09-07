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

## Rodando localmente (SPEC 01 - Foundation)

```bash
npm install
cp .env.example .env.local   # preencha com um projeto Supabase real
npm run dev
```

Sem as variaveis do Supabase preenchidas, o app sobe em "modo local": shell,
navegacao e responsividade funcionam, mas login e dados reais ficam
indisponiveis (aviso visivel na tela). Isso existe para permitir preview do
shell sem segredos — nao e o estado final de nenhuma tela.

Migrations em `supabase/migrations/` criam empresas, perfis de usuario,
vinculo usuario-empresa com papel (RBAC), matriz de permissoes, feature
flags e auditoria, todas com RLS habilitado. Aplique com a Supabase CLI
(`supabase db push`) ou MCP contra um projeto Supabase dedicado ao 7Grafica.

Scripts:

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` / `npm run typecheck`
- `npm run test` (Vitest)
