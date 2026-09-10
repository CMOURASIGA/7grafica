# CHECKPOINT SPEC 11 - ENTREGA E HISTORICO

Data: 10/09/2026.
Status: implementada, verificacoes tecnicas executadas, aguardando validacao do usuario.
Branch: `claude/7grafica-foundation-setup-qrpydv`.

**Nao iniciar a SPEC 12 sem validacao do usuario. SPECs 01 a 10 permanecem concluidas/validadas.**

## Arquitetura local-first

A entrega foi adicionada ao seam unico de repositories com persistencia segregada em `entregas_v1:${empresaId}`. Ela referencia o `Pedido` existente e nao recria Cliente, Orcamento, Pedido, Recebimento, Caixa, Trabalho, Arquivo, Estoque, Compra ou Financeiro.

O repository valida as transicoes e as regras de integridade, sem depender apenas da interface. `operacaoId` torna preparacao e mudancas de status idempotentes. Cada alteracao gera evento de entrega imutavel e evento para a auditoria consolidada.

## Fluxo de entrega

- Modalidades: retirada, entrega propria, motoboy, transportadora e outro.
- Estados: pronto, aguardando retirada, saiu para entrega, entregue e falha na entrega.
- Um Pedido com Trabalhos so pode ficar pronto quando todos estiverem concluidos.
- Retirada segue `pronto -> aguardando retirada -> entregue`.
- Demais modalidades seguem `pronto -> saiu para entrega -> entregue` ou `falha na entrega`, com nova tentativa permitida.
- Entrega externa exige endereco. Transportadora exige identificacao e permite codigo de rastreio.
- Conclusao exige recebedor e referencia do comprovante, e entao atualiza o eixo de entrega do Pedido existente para concluido.

## Interface e integracoes

- `/entregas`: preparacao, previsao, responsavel, endereco, transportadora/rastreio, transicoes, falhas, nova tentativa e comprovacao.
- Detalhes logisticos sao projetados no Portal da SPEC 10, mantendo a mesma regra de arquivos liberados.
- A timeline do detalhe do Pedido agora agrega eventos relacionados ao proprio Pedido, seus Trabalhos, Arquivos, movimentos de estoque, financeiro, Portal e entrega.
- Recebimentos existentes entram como pagamentos registrados, sem criar um segundo dominio financeiro.

## RBAC

Admin, Gerente e Atendente podem operar a expedicao. Operador consulta o quadro. O proxy central aplica empresa ativa e substitui o autor pelo usuario autenticado. A leitura e a escrita permanecem isoladas por empresa.

## Alteracoes transversais justificadas

1. SPEC 10 e roadmap foram atualizados com a aprovacao expressa do usuario.
2. Pedido recebeu somente a projecao da entrega existente e uma timeline correlacionada; seus dominios e regras anteriores nao foram recriados.
3. Portal passou a expor os dados logisticos da entrega, conforme a continuidade prevista no checkpoint anterior.
4. Navegacao e auditoria consolidada passaram a incluir a expedicao.

Nenhuma regressao real nas SPECs 01 a 10 foi encontrada.

## Verificacao

- TypeScript sem emissao: aprovado.
- ESLint: zero erros; cinco avisos preexistentes sobre `<img>`.
- Vitest: 117 testes aprovados em 17 arquivos, incluindo 4 testes novos da entrega.
- Build Next.js 15.5.25: aprovado, incluindo `/entregas` e as integracoes com Pedido e Portal.
- `git diff --check`: aprovado.
- Playwright encontrou 18 cenarios em desktop, tablet e mobile, incluindo 3 da SPEC 11. Nenhum chegou a abrir a aplicacao: todos pararam em `browserType.launch` porque o executavel do Chromium nao esta instalado.
- Dividas conhecidas anteriores permanecem: Chromium indisponivel e CI independente ausente. Executar `npx playwright install chromium` e a suite integral antes de homologacao/producao.

## Roteiro de validacao do usuario

1. Entrar como Gerente e abrir `/entregas`.
2. Preparar para retirada um Pedido com producao concluida, avancar para aguardando retirada e confirmar a entrega com recebedor e comprovante.
3. Preparar uma entrega externa com endereco; para transportadora, conferir nome e codigo de rastreio.
4. Registrar saida, falha com motivo, nova tentativa e entrega comprovada.
5. Confirmar que transicoes invalidas e preparacao com Trabalho pendente sao bloqueadas.
6. Abrir o Pedido e conferir a timeline correlacionada, incluindo eventos operacionais, materiais, pagamentos e entrega.
7. Abrir o Portal do Cliente e conferir previsao, modalidade, rastreio e comprovacao.
8. Validar operacao por Atendente, consulta por Operador e isolamento entre empresas.
9. Conferir eventos em `/auditoria`.

**Checkpoint entregue. Aguardar validacao. SPEC 12 nao iniciada.**
