# CHECKPOINT SPEC 08 - ESTOQUE E COMPRAS

Data: 09/09/2026.
Status: implementada, verificacoes tecnicas aprovadas, aguardando validacao do usuario.
Branch: `claude/7grafica-foundation-setup-qrpydv`.

**Nao iniciar a SPEC 09 sem validacao do usuario. SPECs 01 a 07 permanecem concluidas/validadas.**

## Arquitetura e dominio

A implementacao preserva a arquitetura local-first e o dataset existente. A UI usa os contratos de repositorio, com adapter em `lib/repositories/local/*` e autorizacao no proxy central. O agregado de estoque e compras e persistido por empresa, com gravacao confirmada e operacoes idempotentes.

O saldo distingue estoque fisico, reservado e disponivel. Conversoes sao registradas como snapshot no pedido e no recebimento, evitando alteracoes retroativas. Movimentos suportados: entrada, saida, reserva, consumo, perda e ajuste. Quantidades negativas, consumo acima da reserva e operacoes que invadam reservas de outros Trabalhos sao bloqueados.

## Estoque e integracao com Trabalhos

- Configuracao por material, unidade operacional, conversao e estoque minimo.
- Saldo e alertas abaixo do minimo.
- Previsao e reserva por Trabalho.
- Consumo real e perda vinculados ao Trabalho, com comparativo previsto x realizado.
- Historico de movimentos e trilha de auditoria.
- Materiais com historico nao podem ser excluidos nem ter empresa/unidades alteradas; podem ser inativados.

## Compras e recebimentos

Fluxo implementado: necessidade, cotacao opcional, pedido de compra, fornecedor, recebimento parcial ou total, entrada automatica no estoque e criacao de conta a pagar aberta. Documento de recebimento duplicado no mesmo pedido e bloqueado. A liquidacao financeira permanece fora deste escopo e pertence a SPEC 09.

## Toner e tinta

Cartucho/toner e tratado como item inteiro de estoque, sem controle por ml. A troca registra saida vinculada ao equipamento e permite calcular custo estimado por pagina a partir do custo do cartucho e do rendimento informado.

## RBAC e auditoria

Admin e Gerente gerenciam estoque e compras. Operador consulta estoque e pode registrar apenas consumo/perda em Trabalho proprio. Empresa, usuario autor e escopo do Trabalho sao validados na camada de repositorios, independentemente da UI. Eventos de configuracao, compra, recebimento, movimentacao e custo por pagina entram na auditoria consolidada.

## Verificacao executada

- `npm run typecheck`: aprovado.
- `npm run lint`: zero erros; cinco avisos preexistentes sobre `<img>`.
- `npm test`: 105 testes aprovados em 14 arquivos.
- `npm run build`: aprovado, incluindo as rotas `/estoque` e `/compras`.
- `git diff --check`: aprovado.
- Playwright esta configurado para desktop, tablet e mobile e o fluxo da SPEC 08 foi adicionado. A repeticao final no ambiente atual nao iniciou o Chromium porque o executavel temporario havia sido removido; os nove casos falharam no `browserType.launch`, antes de executar a aplicacao. Portanto, este checkpoint nao apresenta essa tentativa como validacao funcional aprovada. Em ambiente com Chromium: `npx playwright install chromium` e `npm run test:e2e`.

## Regressao e limites

Nenhum comportamento consolidado das SPECs 01 a 07 foi reimplementado. As alteracoes transversais limitam-se aos contratos de repositorio, RBAC, auditoria, navegacao e integracao de consumo no Trabalho. CI independente continua ausente, conforme o aceite da SPEC 07.

O MVP nao realiza sugestao automatica de compra, conciliacao bancaria, baixa de conta a pagar, controle de tinta por volume nem integracao remota. Esses pontos nao fazem parte da SPEC 08.

## Roteiro de validacao do usuario

1. Configurar uma resma como 500 folhas e definir estoque minimo.
2. Criar um pedido de duas resmas e receber apenas uma; conferir entrada de 500 folhas e conta a pagar aberta.
3. Em um Trabalho, prever e reservar folhas; registrar consumo e perda; conferir previsto x real.
4. Validar que o disponivel preserva reservas de outros Trabalhos e que saldo negativo e bloqueado.
5. Registrar troca de toner vinculada ao equipamento e conferir custo estimado por pagina.
6. Entrar como Operador e validar consulta, consumo/perda apenas em Trabalho proprio e ausencia de gestao de compras.
7. Recarregar a pagina e conferir persistencia do saldo, movimentos, pedido, recebimento e auditoria.

**Checkpoint entregue. Aguardar validacao. SPEC 09 nao iniciada.**
