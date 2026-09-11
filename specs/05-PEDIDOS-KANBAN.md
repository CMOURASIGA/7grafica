# SPEC 05 - Pedidos, Trabalhos e Kanban

**Status: CONCLUIDA E VALIDADA**

## Objetivo
Controlar a execucao operacional separando claramente o Pedido comercial dos Trabalhos de producao.

## Regra principal consolidada

**Pedido e comercial. Trabalho e operacional.**

Um Pedido pode gerar N Trabalhos sem forcar `1 item = 1 trabalho`. Venda imediata concluida no PDV pode nao gerar Trabalho.

## Trabalho entregue

- Codigo proprio `TRAB-xxxx`.
- Referencia ao Pedido/cliente.
- Servico/tipo, quantidade, material, acabamento e observacoes operacionais.
- Workflow e etapas snapshotados no momento da criacao.
- Status, prioridade, prazo e responsavel.
- Prioridade e prazo sao independentes.
- Alteracoes futuras no cadastro de Workflow nao retroagem sobre Trabalhos existentes.

## Workflow e transicoes

- Etapas HUMAN, AUTOMATIC e EQUIPMENT/HYBRID.
- Avanco de uma etapa por vez.
- Pular etapa e bloqueado.
- Retroceder exige justificativa.
- Concluir somente na ultima etapa.
- Pausar, registrar pendencia e cancelar exigem motivo.
- Retomada preserva historico.
- Toda transicao grava evento de auditoria/timeline.

## Kanban

- Cards representam sempre Trabalhos, nunca Pedidos.
- Colunas derivadas das etapas do snapshot do workflow + concluido.
- Drag-and-drop chama a mesma regra de dominio de `mover()`; nao existe transicao apenas visual.
- Um mesmo Pedido pode possuir Trabalhos em etapas/workflows diferentes simultaneamente.

## Conclusao operacional

A conclusao operacional do Pedido e calculada a partir de seus Trabalhos, nao gravada como booleano e nao acoplada a entrega ou pagamento. Comercial, financeiro e operacional sao eixos independentes.

## RBAC

- `PRODUCAO_GERENCIAR`: admin/gerente.
- `PRODUCAO_CONSULTAR`: todos os papeis conforme necessidade operacional.
- Atendente consulta andamento, sem movimentar producao.
- Operador pode movimentar apenas Trabalho do qual e responsavel, dentro das regras permitidas.
- Atribuir responsavel e cancelar permanecem exclusivos de gestao.
- Enforcement na camada de repositorio/autorizacao.

## Ponto futuro registrado

Avaliar visao consolidada da fabrica quando existirem simultaneamente Trabalhos pertencentes a workflows diferentes. Nao implementar antecipadamente.

## Criterio de aceite atingido

Foram validados Trabalho unico, multiplos Trabalhos/workflows, pendencia/pausa/retomada, atribuicao a operador, snapshot imutavel, transicao invalida, retrocesso justificado e RBAC. A SPEC 05 esta encerrada.
