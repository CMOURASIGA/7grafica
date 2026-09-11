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

A entidade `Arquivo` guarda metadados e uma referencia controlada `mock://arquivos/<uuid>` por nova versao. Nenhum binario, base64 ou object URL e persistido.

O seletor de arquivo le PDFs em memoria com `pdf-lib`: numero de paginas, CropBox, rotacao, dimensoes em mm, orientacao, formato aproximado, tamanho e MIME. Limite da leitura automatica: 25 MB. PDFs invalidos, protegidos ou com dimensoes diferentes entre paginas sinalizam falha explicita. O formulario do Trabalho permite registrar metadados manualmente; essa informacao depende da conferencia humana. Nao e preflight profissional.

Para outros formatos, sao lidos nome, extensao, tamanho e MIME; paginas e dimensoes permanecem desconhecidas ate conferencia. O preflight deterministico sinaliza divergencias e metadados incompletos. O conteudo continua guardado externamente, inclusive para a conferencia do cliente antes de aprovar.

Novos Trabalhos congelam o requisito de arquivo do Servico. Registros legados sem esse campo continuam usando o requisito do Servico como compatibilidade, sem reset do dataset. Versoes anteriores e seus pareceres permanecem no historico. Ao receber nova versao, a anterior fica substituida: a referencia de producao anterior nao e trocada implicitamente, mas seu uso fica bloqueado ate liberacao explicita de versao apta.

O reenvio para aprovacao gera novo token e invalida o anterior. Operador consulta apenas a versao explicitamente liberada e apta de Trabalhos sob sua responsabilidade. O RBAC do MVP e uma validacao funcional local, nao uma fronteira de seguranca contra manipulacao do proprio navegador. O adapter remoto futuro devera aplicar essas regras no servidor.
