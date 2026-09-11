# SPEC 04 - Balcao, PDV e Caixa

**Status: CONCLUIDA E VALIDADA**

## Objetivo
Atender demandas presenciais, gerar o mesmo Pedido do fluxo comercial, registrar recebimentos e controlar caixa sem dependencia bancaria.

## PDV entregue

Fluxo `/pdv`: identificar cliente existente, cadastro rapido ou consumidor nao identificado -> servicos/quantidade/material/acabamento -> confirmar Pedido -> registrar recebimento -> comprovante.

Busca de cliente por nome, CPF/CNPJ, telefone ou e-mail. `Consumidor nao identificado` nao cria registro em Clientes.

## Pedido e recebimentos

- Pedido e o mesmo conceito independentemente da origem.
- `origem: email | balcao` e somente metadado.
- Pedido possui **1:N Recebimentos**.
- Nao existe booleano `pago` como fonte de verdade.
- Valor recebido = soma dos recebimentos.
- Saldo pendente = total do Pedido - soma dos recebimentos.
- Pagamento parcial/sinal e complementacao posterior sao suportados.
- Dinheiro calcula troco.
- Situacao financeira e situacao operacional sao independentes; saldo zero nao libera producao automaticamente.

## Caixa

- Abertura e fechamento.
- Entradas/saidas manuais autorizadas separadas de recebimentos.
- Resumo por forma de pagamento.
- Saldo em dinheiro separado de cartao/Pix/etc.
- Ticket medio e historico.

## Comprovante

Pagina publica `/portal/pedido/[token]` com QR Code/token. Usar sempre `Comprovante do Pedido` ou `Comprovante de Atendimento`; nunca `cupom fiscal`.

## RBAC

- `PDV_OPERAR`: admin, gerente e atendente.
- `CAIXA_GERENCIAR`: admin e gerente.
- Operador nao altera caixa/recebimentos.
- Enforcement na camada de repositorio/autorizacao.

## Limitacao do MVP

QR/link publico permanece limitado ao mesmo navegador por causa do LocalStorage. Ver `docs/MVP-LOCALSTORAGE.md`.

## Criterio de aceite atingido

Venda imediata, cliente identificado com sinal/saldo, cadastro rapido, Pix registrado, multiplos recebimentos e fechamento de caixa foram validados. A SPEC 04 esta encerrada.
