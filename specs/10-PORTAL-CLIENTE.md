# SPEC 10 - Portal do Cliente

Status: **IMPLEMENTADA / CHECKPOINT ENTREGUE / AGUARDANDO VALIDACAO**.

## Objetivo
Permitir acompanhamento simples e seguro.

## Modos de acesso

### Conta autenticada
Cliente/contato entra e visualiza pedidos vinculados.

### Link/token seguro
Permite consultar um pedido especifico sem conta.

## Portal
- pedidos ativos
- historico
- status
- previsao
- arquivos
- orcamentos
- aprovacao
- pagamento
- entrega

## Regras
- cliente comercial pode existir sem conta
- pedido pode existir sem login
- conta pode ser criada posteriormente
- pedidos anteriores vinculados ao cliente podem ser apresentados apos autenticacao conforme regra de seguranca
- token publico deve ser aleatorio, expirar/revogar quando necessario e nao expor IDs sequenciais

## Checkpoint

Implementacao e verificacoes registradas em `docs/CHECKPOINT_SPEC_10.md`.

**Nao iniciar a SPEC 11 sem validacao do usuario.**
