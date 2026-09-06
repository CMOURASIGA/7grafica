# SPEC 06 - Producao e Equipamentos

## Objetivo
Modelar a execucao grafica real.

## Equipamentos
Cadastrar:
- tipo
- fabricante/modelo
- cor/P&B
- formatos
- duplex
- gramaturas
- velocidade
- status
- disponibilidade

## Selecao
O sistema deve listar equipamentos compativeis com o trabalho.
A escolha final no MVP e humana.

## Impressao
Para PDF:
- paginas
- formato
- orientacao
- quantidade de copias
- cor/P&B
- frente/verso
- folhas estimadas

## Acabamentos
- corte
- refile
- dobra
- laminacao
- plastificacao
- encadernacao
- grampo
- ilhos
- outros

Cada acabamento pode:
- adicionar custo
- adicionar material
- adicionar tempo
- adicionar etapa no workflow

## Futuro
- envio direto para fila de impressao
- IPP/driver/API
- retorno automatico de status
