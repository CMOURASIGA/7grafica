# SPEC 06 - Producao e Equipamentos

**Status: CONCLUIDA E VALIDADA**

## Objetivo
Modelar a execucao de etapas de producao com equipamentos, capacidades, compatibilidade, alocacao e historico, sem integracao fisica com maquinas no MVP.

## Equipamentos

Equipamento possui situacao operacional independente do `ativo` cadastral:

- disponivel;
- em uso;
- indisponivel;
- manutencao.

Possui `capacidadeSimultanea`, default 1, preparado para valores maiores. Capacidades suportam formatos, tipos e materiais compativeis; lista vazia de materiais significa sem restricao.

## Snapshot no Trabalho

Trabalho ganhou informacoes operacionais como `formato` e `tipoEquipamentoNecessario`, preservadas para avaliacao da execucao.

## Compatibilidade deterministica

`lib/domain/compatibilidade-equipamento.ts` avalia tipo, formato, material, situacao e demais capacidades aplicaveis. O resultado explica os motivos de incompatibilidade. Nao utiliza IA.

## AlocacaoEquipamento

Entidade historica relacionando Trabalho + Etapa + Equipamento + Operador, incluindo:

- situacao da alocacao;
- inicio/termino real;
- pausa e motivo;
- realocacao e motivo;
- referencia a alocacao anterior;
- `precisaDecisaoHumana`.

Alocacoes nunca sao apagadas para representar realocacao. Realocar encerra/cancela a alocacao anterior com motivo e cria nova linha vinculada.

## Execucao

Estados implementados: aguardando -> preparacao -> em_execucao -> pausada -> concluida, respeitando transicoes validas. Criacao bloqueia equipamento incompatível, indisponivel/manutencao ou acima da capacidade simultanea.

Se um equipamento ficar indisponivel/manutencao durante uma alocacao ativa, o Trabalho nao e movido automaticamente. A alocacao e marcada para decisao humana e pode ser realocada posteriormente com historico completo.

Etapas HUMAN continuam sem equipamento. Etapas HYBRID preservam operador + equipamento.

## RBAC

Reutiliza `PRODUCAO_GERENCIAR` e `PRODUCAO_CONSULTAR`.

- Admin/Gerente: disponibilidade, alocacao e realocacao.
- Atendente: consulta.
- Operador: preparar/iniciar/pausar/retomar/concluir somente a alocacao do Trabalho pelo qual e responsavel; nao cria nem realoca.
- Enforcement na camada de repositorio/autorizacao.

## Fora do escopo mantido

Sem integracao fisica, API de fabricante, IoT, consumo de estoque, financeiro, fiscal, otimizacao automatica de fila, IA ou Supabase.

## Criterio de aceite atingido

Foram validados equipamento compativel/incompativel, bloqueio por indisponibilidade, decisao humana, realocacao com historico, concorrencia/capacidade, etapa HUMAN, etapa HYBRID e RBAC. A SPEC 06 esta encerrada.
