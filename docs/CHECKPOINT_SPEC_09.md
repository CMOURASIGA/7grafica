# CHECKPOINT SPEC 09 - FINANCEIRO OPERACIONAL

Data: 10/09/2026.
Status: implementada, verificacoes tecnicas aprovadas, aguardando validacao do usuario.
Branch: `claude/7grafica-foundation-setup-qrpydv`.

**Nao iniciar a SPEC 10 sem validacao do usuario. SPECs 01 a 08 permanecem concluidas/validadas.**

## Integracao com o dominio consolidado

A SPEC 09 nao criou Pedidos, Recebimentos, Caixa ou titulos de compra paralelos. Contas a receber sao projecoes calculadas sobre `Pedido` e seus `Recebimento` 1:N da SPEC 04. A liquidacao de compra referencia diretamente a `ContaPagarCompra` gerada no recebimento da SPEC 08, preservando o titulo de origem.

Situacoes financeira e operacional do Pedido continuam independentes. Uma baixa financeira nao move Trabalho, Kanban, arquivo, producao ou entrega.

## Recursos entregues

- Nova tela `/financeiro` no shell existente.
- Visoes por dia, sete dias, mes e periodo personalizado.
- Total recebido, despesas pagas, resultado de caixa e ticket medio.
- Recebimentos agrupados por forma de pagamento.
- Quantidade de Pedidos pagos e pendentes/parciais.
- Contas a receber derivadas, com saldo e situacao calculados.
- Contas a pagar unificadas para compras e despesas operacionais.
- Cadastro e baixa de despesas, com competencia, vencimento, categoria, fornecedor e vinculo opcional ao Pedido.
- Baixa interna das contas de compra existentes.
- Resultado por Pedido: valor, recebido, saldo a receber, despesas diretamente vinculadas e resultado de caixa.
- Saidas manuais do Caixa entram como despesas pagas nos indicadores do periodo.

O resultado exibido e gerencial de caixa, nao margem contabil: recebimentos menos pagamentos no periodo. O resultado por Pedido considera recebimentos menos despesas diretamente vinculadas e declara essa limitacao na interface.

## Arquitetura, RBAC e auditoria

Persistencia local-first por empresa em agregado versionado `financeiro_v1`, acessado somente pelas interfaces de repositorio. Operacoes de criacao e baixa usam `operacaoId` para idempotencia e gravacao confirmada. O proxy central valida empresa ativa e substitui o autor informado pelo usuario da sessao.

Admin e Gerente consultam e gerenciam o financeiro. Atendente e Operador nao acessam o modulo financeiro. Criacao, baixa e cancelamento geram eventos na auditoria consolidada.

## Alteracoes transversais justificadas

As SPECs 01 a 08 nao tiveram regras consolidadas reimplementadas. As alteracoes transversais foram limitadas a:

1. Registrar a aprovacao da SPEC 08 no roadmap, na SPEC e no checkpoint.
2. Adicionar as permissoes `FINANCEIRO_CONSULTAR` e `FINANCEIRO_GERENCIAR` ao RBAC central.
3. Expor o novo repository no seam `Repositories` e incluir seus eventos na auditoria consolidada.
4. Adicionar `/financeiro` a navegacao e ao titulo do shell.

`ContaPagarCompra` permaneceu como fonte do titulo de origem. O novo agregado guarda apenas o registro de liquidacao que a referencia.

## Verificacao executada

- TypeScript sem emissao: aprovado.
- ESLint: zero erros; cinco avisos preexistentes sobre `<img>`.
- Vitest: 109 testes aprovados em 15 arquivos na verificacao anterior ao fechamento do checkpoint; a bateria final deve manter ou superar esse total.
- Build Next.js 15.5.25: aprovado, incluindo `/financeiro`.
- `git diff --check`: aprovado na verificacao anterior ao fechamento do checkpoint.
- Fluxo Playwright da SPEC 09 configurado para desktop, tablet e mobile. A tentativa final descobriu 12 casos no total, mas todos pararam em `browserType.launch`, antes de abrir a aplicacao, porque o executavel do Chromium nao esta instalado. A divida de infraestrutura registrada na SPEC 08 permanece. Executar `npx playwright install chromium` e a suite completa antes de homologacao/producao.
- CI independente continua ausente.

## Fora do MVP

Sem conciliacao bancaria, adquirente, Pix API, integracao bancaria, emissao de NF-e/NFS-e, contabilidade fiscal, DRE contabil ou baixa automatica por extrato.

## Roteiro de validacao do usuario

1. Abrir `/financeiro` como Gerente e alternar dia, sete dias, mes e periodo personalizado.
2. Conferir contas a receber contra os recebimentos já registrados nos Pedidos.
3. Criar uma despesa sem Pedido e outra vinculada a um Pedido.
4. Baixar uma despesa e conferir indicadores, conta paga e persistencia apos recarga.
5. Receber uma compra em `/compras`, voltar ao Financeiro e baixar exatamente o titulo criado pela SPEC 08.
6. Conferir o resultado por Pedido e a explicacao de resultado de caixa.
7. Entrar como Atendente e Operador e confirmar ausencia de acesso ao modulo.
8. Conferir os eventos financeiros em `/auditoria`.

**Checkpoint entregue. Aguardar validacao. SPEC 10 nao iniciada.**

## Aceite posterior do usuario

SPEC 09 CONCLUIDA / VALIDADA em 10/09/2026. Arquitetura, integracao com Pedido/Recebimento/Caixa/Compras, resultado de caixa, resultado por Pedido, RBAC e isolamento aprovados. A `ContaPagarCompra` permanece como titulo original e a SPEC 09 registra somente sua liquidacao.

Ressalvas mantidas: Chromium indisponivel, E2E nao executado com sucesso e CI independente ausente. O sistema nao deve seguir para homologacao/producao antes de resolver essas dividas. SPEC 10 autorizada sobre os repositories consolidados das SPECs 01 a 09.
