# SPEC 10 - Portal do Cliente

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
