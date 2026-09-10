# 7Grafica - Roadmap de Desenvolvimento

> Atualizado em 08/09/2026. Este arquivo representa o estado real do MVP na branch de desenvolvimento.

## Estrategia atual do MVP

O MVP esta em modo **local-first**, com dataset unico e interligado persistido em LocalStorage. Nenhum componente acessa LocalStorage diretamente: UI e regras usam interfaces de repositorio, o adapter ativo esta em `lib/repositories/local/*` e o seam unico e `getRepositories()`.

A arquitetura Supabase da Foundation, migrations, RLS e RBAC permanece preparada no repositorio, mas **nao existe projeto Supabase definitivo do 7Grafica ainda e nenhuma migration foi aplicada remotamente**. A troca futura deve ocorrer por `lib/repositories/supabase/*`, sem reescrever telas ou regras de negocio.

## Status das SPECs

| SPEC | Escopo | Status |
|---|---|---|
| 01 | Foundation | CONCLUIDA / VALIDADA |
| 02 | Cadastros Mestres | CONCLUIDA / VALIDADA |
| 03 | Entrada por E-mail e Orcamentos | CONCLUIDA / VALIDADA |
| 04 | Balcao, PDV e Caixa | CONCLUIDA / VALIDADA |
| 05 | Pedidos, Trabalhos e Kanban | CONCLUIDA / VALIDADA |
| 06 | Producao e Equipamentos | CONCLUIDA / VALIDADA |
| 07 | Arquivos e Arte | CONCLUIDA / VALIDADA |
| 08 | Estoque e Compras | CONCLUIDA / VALIDADA |
| 09 | Financeiro Operacional | IMPLEMENTADA / CHECKPOINT ENTREGUE / AGUARDANDO VALIDACAO |
| 10 | Portal do Cliente | PENDENTE |
| 11 | Entrega e Historico | PENDENTE |
| 12 | Relatorios e Administracao | PENDENTE |

## Fundamentos ja consolidados

- Next.js App Router + TypeScript + Tailwind v4.
- Shell responsivo e design system alinhado ao 7Commander, sem dependencia funcional dele.
- Whitelabel com prioridade para identidade do cliente e fallback Consult Services.
- Dataset local unico, coerente e reutilizado entre todas as SPECs.
- RBAC aplicado na UI e, principalmente, na camada de repositorios/autorizacao.
- Pedido e a entidade comercial; Trabalho e a entidade operacional.
- Pedido pode gerar N Trabalhos sem obrigatoriedade de 1 item = 1 Trabalho.
- Origem `email` ou `balcao` e apenas metadado do Pedido.
- Pedido possui 1:N Recebimentos; total recebido e saldo sao calculados, nao armazenados como booleano pago.
- Situacoes comercial, financeira e operacional sao eixos independentes.
- Workflows e etapas sao snapshotados no Trabalho para impedir retroatividade de alteracoes cadastrais.
- Kanban movimenta Trabalhos e toda transicao e validada no dominio e auditada.
- Equipamentos possuem capacidades e compatibilidade deterministica; alocacoes sao historicas e nunca sobrescritas.
- Links publicos por token continuam limitados ao mesmo navegador enquanto o MVP estiver em LocalStorage. Ver `docs/MVP-LOCALSTORAGE.md`.

## Sequencia restante

### SPEC 07 - Arquivos e Arte
Checkpoint: `docs/CHECKPOINT_SPEC_07.md`. Aprovada pelo usuario. SPEC 08 autorizada. CI independente ainda ausente.

Arquivos, versoes, preflight basico, aprovacao tecnica, aprovacao do cliente, criacao/ajuste de arte e referencia explicita da versao liberada para producao.

### SPEC 08 - Estoque e Compras
Checkpoint: `docs/CHECKPOINT_SPEC_08.md`. Aprovada pelo usuario com ressalvas de E2E e CI registradas. SPEC 09 autorizada.

Estoque por material, conversao de unidade, reserva, consumo previsto x real, perdas, estoque minimo, reposicao, compras, fornecedores e recebimento.

### SPEC 09 - Financeiro Operacional
Checkpoint: `docs/CHECKPOINT_SPEC_09.md`. Implementada e aguardando validacao do usuario. SPEC 10 nao autorizada.

Recebimentos, despesas, contas a pagar/receber, caixa, resultado por periodo e por pedido, sem integracao bancaria no MVP.

### SPEC 10 - Portal do Cliente
Login opcional, token seguro por recurso/pedido, historico, acompanhamento, orcamentos, aprovacoes, arquivos, pagamentos e entrega.

### SPEC 11 - Entrega e Historico
Retirada, entrega propria, motoboy, transportadora, status, comprovacao e rastreabilidade.

### SPEC 12 - Relatorios e Administracao
Dashboards, produtividade, prazo, margem, retrabalho, perdas, consumo, vendas, conversao de orcamentos e clientes.

## Evolucoes futuras

- Supabase definitivo e adapter remoto.
- Storage real para arquivos.
- preflight avancado;
- integracao direta com impressoras;
- confirmacao automatica de fila;
- integracao bancaria/pagamentos;
- emissao fiscal real por provedor especializado;
- IA;
- previsao de atraso;
- sugestao de compra;
- recomendacao de equipamento;
- visao consolidada da fabrica entre workflows diferentes.
