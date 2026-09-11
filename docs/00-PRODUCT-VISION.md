# 7Grafica - Visao do Produto

## Objetivo

O 7Grafica sera uma plataforma de gestao operacional para graficas, independente de 7Finance e 7Commander.

O sistema deve receber demandas, entender a necessidade, gerar orcamento, obter aprovacao, transformar o pedido em um ou mais trabalhos, coordenar atividades humanas e automaticas, controlar producao, equipamentos, materiais, estoque, recebimentos e entrega.

## Principio central

Pedido e comercial.
Trabalho e operacional.

Um pedido pode gerar varios trabalhos, cada um com fluxo, responsavel, recurso, material e prazo proprios.

## Canais de entrada

1. E-mail
2. Balcao / PDV
3. Portal do Cliente

## Fluxo macro

Solicitacao -> Analise -> Orcamento -> Aprovacao -> Pedido -> Trabalhos -> Kanban -> Producao -> Finalizacao -> Recebimento -> Entrega -> Historico

## Regras de produto

- O 7Grafica nao depende de 7Finance nem 7Commander.
- Deve existir cliente sem login.
- Conta do portal e separada do cadastro comercial.
- Todo pedido deve ter cliente identificado ou Consumidor nao identificado.
- E-mail de remetente conhecido deve ser vinculado automaticamente ao cliente/contato.
- E-mail desconhecido deve exigir vinculacao ou cadastro pelo atendente.
- Orcamento pode ser aprovado, ter alteracao solicitada ou ser rejeitado.
- Rejeicao deve permitir justificativa e motivo estruturado.
- O portal deve permitir acompanhamento por conta autenticada ou link/token seguro.
- O comprovante de balcao nao e documento fiscal. Usar o termo Comprovante de Pedido ou Comprovante de Atendimento.
- Fiscalizacao/nota fiscal real fica fora do MVP.
- IA e futura.
- Integracao direta com impressoras e futura.
- Integracao bancaria nao faz parte do MVP.
- PDV registra recebimentos, mas nao processa pagamento bancario.
