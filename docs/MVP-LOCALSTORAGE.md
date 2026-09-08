# MVP limitation — persistência em LocalStorage

Enquanto o Supabase definitivo não é provisionado, o 7Grafica roda com o
adapter `lib/repositories/local/*`: todos os dados (empresas, usuários,
cadastros, solicitações, orçamentos, pedidos, caixa, recebimentos) vivem no
`localStorage` do navegador que os criou. Isso é uma decisão deliberada da
estratégia local-first para validar o produto antes de existir infraestrutura
real — não é um bug, mas tem uma consequência que precisa ficar clara para
quem usa ou avalia o sistema.

## O que isso significa na prática

- **Nada é compartilhado entre dispositivos ou navegadores.** Um pedido
  criado no Chrome do computador do balcão não aparece no celular do
  entregador, nem em outro navegador do mesmo computador.
- **Os "links seguros" e QR Codes públicos** (`/portal/orcamento/[token]`,
  `/portal/pedido/[token]` e, desde a SPEC 07, `/portal/arte/[token]` para
  aprovação pública de arte) só resolvem **no mesmo navegador/perfil** que
  gerou o orçamento, pedido ou arquivo. Abrir o link em uma aba nova do
  mesmo navegador funciona (é o que os testes automatizados e a validação
  manual desta fase fazem); abrir em outro navegador, computador ou celular
  real mostra "link inválido ou expirado", porque os dados simplesmente não
  existem ali.
- **Isso não deve ser interpretado como compartilhamento real entre
  dispositivos.** Antes de qualquer demonstração para terceiros ou uso em
  produção, o Supabase definitivo precisa estar no ar.

## O que muda quando o Supabase definitivo entrar

A camada de repositórios (`lib/repositories/types.ts`) já isola UI e regra de
negócio da persistência — a troca do adapter LocalStorage por um adapter
Supabase não deve exigir mudança de tela nenhuma. Dois pontos, porém,
**exigem atenção arquitetural própria** nessa migração (não são apenas
"trocar o adapter"):

1. **Token público revogável e validado no servidor.** `crypto.randomUUID()`
   é adequado para o mock (não sequencial, imprevisível), mas no ambiente
   definitivo a posse do token não pode ser a única barreira. O acesso via
   `/portal/orcamento/[token]`, `/portal/pedido/[token]` e
   `/portal/arte/[token]` precisa ser validado por uma policy/RPC no
   backend, com possibilidade real de revogar um token (ex.: reenvio de
   orçamento, pedido cancelado, arte substituída por nova versão) sem
   depender de o cliente "esquecer" o link antigo.

2. **O adapter público não pode ser um cliente genérico.** Hoje a página
   pública usa `useRepositories()` (o bundle "cru", sem o proxy de RBAC de
   `lib/repositories/authorization.ts`) porque, localmente, não há como um
   token vazar acesso a outros registros — tudo está no mesmo navegador de
   qualquer forma. Isso **não pode se repetir no adapter Supabase**: a
   implementação pública para Supabase deve expor uma consulta restrita
   (RLS por token, ou uma Edge Function/RPC dedicada) que devolve **apenas**
   o orçamento/pedido daquele token específico — nunca um repositório capaz
   de consultar outros registros da empresa.

Nenhum destes dois pontos deve ser resolvido com um backend provisório só
para isso. Eles ficam registrados aqui como requisito de design para quando
o projeto Supabase definitivo for provisionado.

## Arquivos (SPEC 07): metadados, nunca binário

A entidade `Arquivo` (`lib/domain/entities.ts`) guarda nome, extensão,
mimeType, tamanho e metadados técnicos (páginas, dimensões) — nunca o
conteúdo binário do arquivo em si. O preflight (`lib/domain/preflight.ts`)
roda sobre esses metadados simulados, não sobre um arquivo real. Isso é
deliberado: LocalStorage não é lugar para blobs grandes/base64. Quando o
Supabase Storage definitivo existir, o adapter troca (upload real, preflight
lendo o arquivo de verdade), mas o domínio (`Arquivo`, versionamento,
aprovação técnica/cliente, liberação para produção) permanece o mesmo — é
exatamente o que a camada de repositórios foi desenhada para permitir.
