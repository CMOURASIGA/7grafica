# CHECKPOINT SPEC 10 - PORTAL DO CLIENTE

Data: 10/09/2026.
Status: concluida e validada pelo usuario.
Branch: `claude/7grafica-foundation-setup-qrpydv`.

Validada diretamente na branch pelo usuario no commit `882ce6177901ebb077e1935783f283f83b27d839`. SPEC 11 autorizada. As ressalvas de Chromium, CI independente e autenticacao de producao permanecem registradas.

## Arquitetura e seguranca

O Portal e uma camada de consulta sobre os dominios existentes. Nao recria Cliente, Pedido, Recebimento, Caixa, Estoque, `ContaPagarCompra`, Financeiro, Orcamento, Trabalho ou Arquivo.

Foram separados dois contratos:

- `portalClienteGestao`, interno e protegido por RBAC, emite e revoga convites e tokens de Pedido.
- `portalCliente`, publico, executa ativacao, login, sessao e consultas estritamente limitadas pela conta ou token.

Tokens usam 24 bytes aleatorios, representados por 48 caracteres hexadecimais, sem IDs sequenciais. Convites e links possuem validade entre 1 e 90 dias e podem ser revogados. Um novo convite pendente revoga convites anteriores do mesmo Cliente. Convite e de uso unico. Senhas sao armazenadas como hash SHA-256 no adapter local, nunca em texto puro. Sessao do portal expira em sete dias.

Como o MVP continua local-first, conta, sessao e token funcionam somente no navegador/perfil/origem que possui o dataset. Essa limitacao permanece documentada e nao equivale a uma autenticacao remota pronta para producao.

O hash SHA-256 evita senha em texto puro no prototipo local, mas nao substitui um provedor de identidade com algoritmo adaptativo, MFA, recuperacao e protecao contra tentativas. Antes de producao, contas e sessoes devem migrar para o Supabase Auth previsto na Foundation.

## Modos de acesso

### Conta autenticada

Admin/Gerente gera convite para um e-mail previamente cadastrado em um Contato ativo do Cliente. O contato ativa a conta com senha e passa a ver Pedidos anteriores e atuais vinculados ao mesmo `clienteId`.

### Link de Pedido

Admin/Gerente emite link temporario para um Pedido especifico. O token permite somente a projecao desse Pedido. O comprovante legado das SPECs 03/04 continua compativel para nao quebrar links ja emitidos; novos links gerenciados pela SPEC 10 usam expiracao e revogacao.

## Portal entregue

- `/portal-clientes`: gestao interna de convites, links, validade e revogacao.
- `/portal/acesso`: login ou ativacao por convite.
- `/portal/cliente`: Pedidos ativos, historico, situacao, etapa/previsao dos Trabalhos, arquivos explicitamente liberados, Orcamentos, pagamentos e saldo.
- `/portal/pedido/[token]`: aceita o novo token temporario e preserva comprovantes legados.
- Orcamentos enviados podem ser abertos no fluxo de aprovacao ja consolidado.
- Entrega exibe apenas o estado atualmente existente no Pedido. Detalhamento logistico pertence a SPEC 11 e nao foi antecipado.

Somente arquivos referenciados por `Trabalho.arquivoLiberadoId` sao apresentados. Rascunhos de Orcamento e arquivos pendentes, substituidos ou nao liberados nao entram na projecao autenticada.

## RBAC e auditoria

Admin e Gerente gerenciam convites e tokens. Atendente e Operador nao acessam a gestao. O proxy central valida empresa ativa e substitui o autor informado pelo usuario da sessao. Criacao/revogacao de convite, criacao/revogacao de token e ativacao de conta entram na auditoria consolidada.

## Alteracoes transversais justificadas

1. Roadmap, SPEC e checkpoint da SPEC 09 atualizados com o aceite do usuario.
2. Novo repository adicionado ao seam central e nova permissao `PORTAL_CLIENTE_GERENCIAR` no RBAC.
3. Auditoria consolidada passou a incluir eventos do Portal.
4. O comprovante de Pedido passou a resolver primeiro o token temporario da SPEC 10, mantendo fallback do token legado para preservar a SPEC 04.
5. Navegacao interna recebeu a gestao do Portal.

Nenhuma regra financeira, operacional, de estoque ou de producao foi reimplementada.

## Verificacao

- TypeScript sem emissao: aprovado.
- ESLint: zero erros; cinco avisos preexistentes sobre `<img>`.
- Vitest: 113 testes aprovados em 16 arquivos.
- Build Next.js 15.5.25: aprovado, incluindo `/portal-clientes`, `/portal/acesso` e `/portal/cliente`.
- `git diff --check`: aprovado.
- Fluxo Playwright da SPEC 10 configurado para desktop, tablet e mobile. A tentativa final descobriu 15 casos no total, mas todos pararam em `browserType.launch`, antes de abrir a aplicacao, porque o executavel do Chromium nao esta instalado.
- A divida conhecida permanece: Chromium indisponivel e CI independente ausente. Executar `npx playwright install chromium` e a suite integral antes de homologacao/producao.

## Roteiro de validacao do usuario

1. Entrar como Gerente em `/portal-clientes`.
2. Gerar convite para um e-mail cadastrado do Cliente e ativar a conta com senha de oito ou mais caracteres.
3. Conferir que a conta apresenta somente Pedidos, Orcamentos e arquivos liberados daquele Cliente, incluindo historico anterior.
4. Sair e entrar novamente com e-mail e senha.
5. Gerar link para um Pedido, abrir e conferir que somente esse recurso e apresentado.
6. Revogar o link e confirmar que ele deixa de resolver.
7. Conferir pagamentos, saldo, etapa/previsao, arquivo liberado e acesso a Orcamento enviado.
8. Entrar como Atendente e Operador e confirmar ausencia da gestao de Portal.
9. Conferir eventos em `/auditoria`.

**SPEC 10 concluida/validada. SPEC 11 autorizada.**
