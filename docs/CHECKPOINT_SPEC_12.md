# CHECKPOINT SPEC 12 - GESTAO, RELATORIOS E ADMINISTRACAO

Data: 10/09/2026.
Status: implementada, verificacoes tecnicas executadas, aguardando validacao do usuario.
Branch: `claude/7grafica-foundation-setup-qrpydv`.

**SPECs 01 a 11 permanecem concluidas/validadas. Nao iniciar Hardening/QA, migracao ou producao sem validacao do usuario.**

## Arquitetura

`relatorios` e uma porta somente de leitura no seam central. O adapter local agrega os registros existentes de Pedido, Orcamento, Recebimento, Trabalho, Arquivo, Estoque, Compra, Financeiro, Cliente, Equipamento, Alocacao e Entrega. Nenhum desses dominios foi copiado ou recriado.

Os filtros por empresa e RBAC sao aplicados no proxy central. Admin e Gerente acessam indicadores gerenciais. Atendente e Operador nao recebem dados financeiros ou consolidados por meio desse repository.

## Dashboard

A pagina inicial deixou de ser apenas tecnica para Admin/Gerente e apresenta:

- Pedidos novos no mes;
- Trabalhos em producao;
- Trabalhos atrasados;
- entregas prontas ou aguardando retirada;
- valor comercial dos Pedidos criados;
- Recebimentos registrados;
- itens de estoque abaixo do minimo.

Perfis sem acesso gerencial continuam vendo somente empresa, papel e contexto operacional permitido.

## Relatorios

`/relatorios` permite selecionar o periodo e consolida:

- vendas por dia, valor e ticket medio;
- Orcamentos enviados, aprovados, rejeitados, conversao e motivos;
- producao, tempo medio, atrasos e retrabalho proxy;
- consumo, perdas, saldo fisico/reservado/disponivel e estoque critico;
- compras solicitadas, recebidas e pendentes;
- resultado de caixa, contas a receber e contas a pagar;
- vendas e recebimentos por Cliente;
- alocacoes, conclusoes e horas executadas por Equipamento.

A cadeia de versoes de Orcamento conta apenas uma proposta e usa a versao mais recente que efetivamente saiu de rascunho. Uma nova versao ainda em rascunho nao apaga a decisao anterior do relatorio.

## Semantica dos indicadores

- Faturamento e o valor dos Pedidos criados, nao emissao fiscal.
- Resultado financeiro e gerencial de caixa, nao DRE ou margem contabil.
- Retrabalho e um proxy baseado em novas versoes de Arquivo. O MVP ainda nao possui apontamento industrial especifico de retrabalho.
- Consumo e perdas usam a unidade operacional congelada nos movimentos da SPEC 08.

## Administracao

A administracao existente de empresa, whitelabel, usuarios, papeis, auditoria e dados locais foi preservada. Foram acrescentados:

- status de 2FA por usuario;
- politica de 2FA opcional ou obrigatoria por perfil;
- visualizacao da matriz efetiva de permissoes;
- auditoria das mudancas de politica.
- cadastro e ativacao de parametros funcionais sobre o repository `featureFlags` ja existente, agora protegido no proxy central.

A politica de 2FA fica segregada em `administracao_v1:${empresaId}`. No local-first ela registra a exigencia e evidencia usuarios pendentes. O desafio TOTP real depende do Supabase Auth e deve ser concluido antes da producao. O prototipo nao declara autenticacao forte inexistente.

## Alteracoes transversais justificadas

1. Roadmap, SPEC e checkpoint da SPEC 11 foram atualizados com a aprovacao expressa do usuario.
2. Dashboard inicial passou a consumir o novo repository de agregacao.
3. Navegacao e cabecalho receberam `/relatorios`.
4. RBAC recebeu permissoes especificas para relatorios e politica administrativa de seguranca.

Nenhuma regressao real nas SPECs 01 a 11 foi encontrada e nenhum dominio consolidado foi reimplementado.

## Verificacao

- TypeScript sem emissao: aprovado.
- ESLint: zero erros; cinco avisos preexistentes sobre `<img>`.
- Vitest: 121 testes aprovados em 18 arquivos, incluindo 4 testes novos de agregacao e administracao.
- Build Next.js 15.5.25: aprovado, incluindo `/relatorios`, dashboard e configuracoes administrativas.
- `git diff --check`: aprovado.
- Playwright encontrou 21 cenarios em desktop, tablet e mobile, incluindo 3 da SPEC 12. Nenhum chegou a abrir a aplicacao: todos pararam em `browserType.launch` porque o executavel do Chromium nao esta instalado.
- Dividas conhecidas: Chromium indisponivel e CI independente ausente. Executar `npx playwright install chromium` e a suite integral antes de homologacao/producao.

## Proxima etapa recomendada apos validacao

Criar um ciclo separado de checkpoint geral do MVP e Hardening/QA para instalar Chromium, executar todo o Playwright, implantar CI e avaliar a migracao para a infraestrutura definitiva. O sistema nao deve ser classificado como homologavel ou pronto para producao antes desse ciclo.

## Roteiro de validacao do usuario

1. Entrar como Admin ou Gerente e conferir os indicadores da pagina inicial.
2. Abrir `/relatorios`, alterar o periodo e conferir vendas, conversao, producao, estoque, compras, financeiro, clientes e equipamentos.
3. Conferir as notas de semantica para faturamento, resultado de caixa e retrabalho proxy.
4. Entrar como Atendente e Operador e confirmar ausencia do menu e bloqueio do repository gerencial.
5. Como Admin, abrir `/configuracoes`, conferir status de 2FA, politicas por perfil e matriz de permissoes.
6. Alterar uma politica de 2FA e conferir o evento em `/auditoria`.
7. Confirmar que Gerente nao altera a politica administrativa de 2FA.
8. Validar responsividade de dashboard, relatorios e configuracoes.

**Checkpoint entregue. Aguardar validacao. Nenhuma etapa posterior iniciada.**
