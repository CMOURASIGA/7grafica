# SPEC 02 - Cadastros Mestres

**Status: CONCLUIDA E VALIDADA**

## Objetivo
Criar os cadastros que sustentam todos os processos do 7Grafica usando o mesmo dataset local interligado.

## Entregue

- Clientes PF/PJ.
- Contatos e multiplos e-mails por contato.
- Busca de cliente por e-mail cruzando contato -> e-mail.
- Fornecedores.
- Servicos e categorias.
- Materiais, unidades de compra/consumo e conversoes.
- Equipamentos e capacidades.
- Formas de pagamento.
- Workflows e etapas.
- Usuarios, papeis e permissoes.
- Dataset seed unico com empresa whitelabel, usuarios e cadastros relacionados por ids estaveis.
- Restauracao controlada dos dados de demonstracao.
- `CrudSection` reutilizavel para cadastros simples; entidades que ganharem comportamento operacional podem receber UX dedicada.

## Regra Consumidor nao identificado

Nao existe cliente fake chamado `Consumidor nao identificado` no cadastro. Essa e uma condicao do Pedido/PDV e foi implementada na SPEC 04 sem poluir Clientes.

## RBAC consolidado

- Admin: administracao completa.
- Gerente: administracao operacional dos cadastros, sem alterar RBAC administrativo.
- Atendente: CRUD de Clientes/Contatos e leitura dos demais cadastros.
- Operador: leitura dos cadastros necessarios a operacao.

A protecao real esta na camada de repositorios por `lib/repositories/authorization.ts`; a UI apenas reforca a experiencia com estados de somente leitura. Acesso direto por URL nao contorna autorizacao.

## Criterio de aceite atingido

Cadastros, relacionamentos, persistencia LocalStorage, RBAC e whitelabel foram validados. A SPEC 02 esta encerrada.
