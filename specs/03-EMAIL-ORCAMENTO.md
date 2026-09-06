# SPEC 03 - Entrada por E-mail e Orcamentos

## Objetivo
Transformar e-mails recebidos em solicitacoes trataveis pelo 7Grafica.

## Fluxo
E-mail recebido -> identificar remetente -> vincular cliente/contato -> criar solicitacao -> analisar -> montar orcamento -> enviar -> receber decisao.

## Identificacao
1. Buscar e-mail exato entre contatos.
2. Se encontrado, sugerir/vincular cliente.
3. Se nao encontrado, marcar Cliente nao identificado.
4. Atendente deve:
   - vincular a cliente existente; ou
   - cadastrar novo cliente/contato.
5. Nao criar cliente automaticamente.

## Orcamento
- numero unico
- versao V1, V2, V3...
- validade
- itens
- quantidade
- materiais
- acabamentos
- prazo
- observacao
- valor

## Resposta do cliente
- Aprovar
- Solicitar alteracao
- Rejeitar

Solicitar alteracao e rejeitar devem registrar justificativa.
Rejeicao deve aceitar motivo estruturado.

## Conversao
Orcamento aprovado gera Pedido.

## E-mail
O envio deve sair pelo proprio sistema.
O cliente recebe link seguro para tomar decisao.
