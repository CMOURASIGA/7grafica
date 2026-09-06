# 7Grafica - Roadmap de Desenvolvimento

As specs devem ser executadas por unidades operacionais, na ordem abaixo.

## Fase 0 - Foundation
- arquitetura base
- design system 7Commander
- shell autenticado
- usuarios, perfis e permissoes
- multiempresa/whitelabel
- auditoria
- estrutura de feature flags
- base para 2FA em perfis administrativos

## Fase 1 - Cadastros e Identidade Comercial
- clientes
- contatos
- emails multiplos
- fornecedores
- servicos
- materiais
- unidades
- equipamentos
- workflows
- formas de pagamento
- usuarios e papeis

## Fase 2 - Entrada por E-mail e Orcamentos
- ingestao de e-mail
- identificacao de cliente por remetente
- triagem de remetente desconhecido
- anexos
- analise basica de PDF
- criacao e versionamento de orcamento
- envio por e-mail
- aprovar, solicitar alteracao, rejeitar
- justificativas
- conversao em pedido

## Fase 3 - Balcao / PDV
- atendimento rapido
- identificacao opcional do cliente
- orcamento rapido
- aceite
- registro de pagamento
- comprovante de pedido
- QR Code/token de acompanhamento
- abertura/fechamento de caixa
- resumo diario, semanal, mensal

## Fase 4 - Pedido, Trabalhos e Kanban
- pedido
- decomposicao em trabalhos
- workflows
- etapas humanas/automaticas/hibridas
- kanban
- prioridade
- prazo
- responsavel
- timeline
- bloqueios
- retrabalho

## Fase 5 - Arquivos, Arte e Producao
- arquivos
- versoes
- aprovacao de arte
- analise tecnica basica
- impressao simples
- acabamentos
- selecao de equipamento
- apontamento de producao
- conclusao

## Fase 6 - Estoque e Compras
- estoque por material
- conversao de unidade
- reserva
- consumo previsto x real
- perda
- estoque minimo
- alerta de reposicao
- compras
- fornecedor
- recebimento

## Fase 7 - Financeiro Operacional
- recebimentos
- despesas
- contas a pagar/receber
- caixa
- resultado por periodo
- resultado por pedido
- sem integracao bancaria

## Fase 8 - Portal do Cliente
- login opcional
- token publico seguro por pedido
- historico
- acompanhamento
- orcamentos
- aprovacao
- arquivos
- pagamentos
- entrega

## Fase 9 - Entrega e Logistica
- retirada
- entrega propria
- motoboy
- transportadora
- status
- comprovacao de entrega

## Fase 10 - Gestao e Relatorios
- dashboards
- produtividade
- prazo
- margem
- retrabalho
- perdas
- consumo
- vendas
- conversao de orcamentos
- clientes

## Evolucoes futuras
- preflight avancado
- integracao direta com impressoras
- confirmacao automatica de fila
- integracao bancaria/pagamentos
- emissao fiscal real por provedor especializado
- IA
- previsao de atraso
- sugestao de compra
- recomendacao de equipamento
