# SPEC 08 - Estoque e Compras

Status: **CONCLUIDA / VALIDADA**.

## Objetivo
Controlar materiais consumidos e reposicao.

## Estoque
Exemplo:
1 resma = 500 folhas
saldo operacional em folhas.

## Movimentos
- entrada
- saida
- reserva
- consumo
- perda
- ajuste

## Previsto x real
Cada trabalho deve permitir:
- consumo previsto
- consumo real
- perda

## Estoque minimo
Gerar alerta quando abaixo do minimo.

## Compras
Fluxo:
Necessidade -> cotacao opcional -> pedido de compra -> fornecedor -> recebimento -> entrada de estoque -> conta a pagar.

## Toner/tinta
MVP:
- controlar cartucho/toner como item de estoque
- registrar troca
- custo estimado por pagina no equipamento
Nao tentar controlar ml por pagina.

## Checkpoint

Implementacao e verificacoes registradas em `docs/CHECKPOINT_SPEC_08.md`.

SPEC 09 autorizada pelo usuario em 10/09/2026. Ressalvas mantidas: Playwright configurado, mas sem execucao bem-sucedida no checkpoint por ausencia do Chromium; CI independente ausente. Executar a suite E2E completa antes de homologacao/producao.
