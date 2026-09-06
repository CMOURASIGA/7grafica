# 7Grafica - Modelo de Dominio

## Entidades principais

### Cliente
Dados comerciais da pessoa ou empresa.

### Contato
Pessoa vinculada a um cliente. Um cliente pode ter varios contatos e cada contato pode ter varios e-mails.

### ContaPortal
Identidade autenticada para acesso ao Portal do Cliente. Nao e obrigatoria para existir Cliente ou Contato.

### Solicitacao
Demanda recebida por e-mail, balcao ou portal.

### Orcamento
Proposta comercial versionada.

Estados sugeridos:
- rascunho
- enviado
- aprovado
- alteracao_solicitada
- rejeitado
- expirado
- cancelado

### Pedido
Registro comercial confirmado apos aprovacao ou aceite no balcao.

### Trabalho
Unidade operacional executavel. Um pedido pode gerar um ou varios trabalhos.

### Workflow
Definicao do fluxo por categoria/tipo de servico.

### EtapaWorkflow
Etapa humana, automatica ou hibrida.

### Atividade
Execucao concreta de uma etapa dentro de um trabalho.

### Arquivo
Documento ou arte vinculada a solicitacao, orcamento, pedido ou trabalho.

### VersaoArte
Versao de arquivo submetida a aprovacao.

### Material
Papel, capa, espiral, lona, vinil, toner, tinta, etc.

### UnidadeConversao
Exemplo: 1 resma = 500 folhas.

### Estoque
Saldo por material e local.

### MovimentoEstoque
Entrada, saida, perda, ajuste, reserva e consumo.

### Equipamento
Impressora, guilhotina, encadernadora, laminadora etc.

### CapacidadeEquipamento
Formatos, cor/P&B, gramaturas, duplex, velocidade e outras restricoes.

### Fornecedor
Cadastro de fornecedor.

### Compra
Processo de compra de materiais.

### RecebimentoCompra
Entrada fisica e financeira de uma compra.

### Caixa
Controle de abertura, movimentacao e fechamento.

### Recebimento
Registro de valor recebido, sem integracao bancaria obrigatoria.

### Entrega
Retirada, entrega propria, motoboy, transportadora ou outro modo.

### EventoHistorico
Timeline imutavel dos acontecimentos do pedido/trabalho.

## Relacionamentos essenciais

Cliente 1:N Contato
Cliente 1:N Solicitacao
Solicitacao 1:N Orcamento
Orcamento aprovado -> 1 Pedido
Pedido 1:N Trabalho
Trabalho 1:N Atividade
Trabalho N:N Material via consumo/reserva
Trabalho N:N Equipamento via apontamento
Pedido 1:N Recebimento
Pedido 1:N Entrega
Pedido 1:N EventoHistorico
