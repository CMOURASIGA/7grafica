# SPEC 03 - Entrada por E-mail e Orcamentos

**Status: CONCLUIDA E VALIDADA**

## Objetivo
Transformar entradas simuladas de e-mail em solicitacoes comerciais, orcamentos versionados e Pedidos, sem integrar provedor de e-mail real no MVP local-first.

## Fluxo entregue

E-mail recebido -> identificar remetente -> vincular cliente/contato -> criar solicitacao -> montar orcamento -> enviar simulado -> decisao do cliente -> Pedido.

## Identificacao

- Busca exata do remetente entre e-mails de contatos usando o mesmo cadastro da SPEC 02.
- Remetente conhecido e vinculado automaticamente ao cliente/contato.
- Remetente desconhecido permanece `Cliente nao identificado`.
- Atendente pode vincular a cliente existente ou cadastrar novo cliente/contato.
- Nunca criar cliente automaticamente.

## Orcamento

- Numero sequencial unico `ORC-xxxx`.
- Versoes V1, V2, V3... preservadas.
- Itens, quantidade, servico, material, acabamento, prazo, validade, observacao e total calculado.
- Envio simulado pelo sistema.
- Token publico nao sequencial por versao usando UUID.
- Pagina publica `/portal/orcamento/[token]`.
- Aprovar, solicitar alteracao e rejeitar.
- Alteracao registra comentario; rejeicao registra motivo estruturado.
- Nova versao nunca destrói a anterior.

## Conversao em Pedido

Orcamento aprovado gera Pedido de forma idempotente. O Pedido e a entidade comercial comum tambem usada pelo Balcao/PDV. Termos comerciais aprovados devem ser preservados por snapshot.

## RBAC

`SOLICITACOES_GERENCIAR`: admin, gerente e atendente. Operador nao opera o processo comercial. O proxy de autorizacao adota comportamento fail-safe para metodos de negocio nao classificados explicitamente como leitura.

## Limitacao do MVP

O link publico funciona apenas no mesmo navegador que possui o LocalStorage. Nao criar backend provisório. Na futura migracao ao Supabase, token deve ser revogavel/validado no servidor e o adapter publico deve restringir acesso somente ao recurso autorizado. Ver `docs/MVP-LOCALSTORAGE.md`.

## Criterio de aceite atingido

Fluxos de remetente conhecido e desconhecido, versionamento, decisao publica, aprovacao e geracao idempotente de Pedido foram validados. A SPEC 03 esta encerrada.
