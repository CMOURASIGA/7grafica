# CHECKPOINT SPEC 07 - ARQUIVOS E ARTE

Data: 08/09/2026.
Status: implementada, verificacoes tecnicas aprovadas, aguardando validacao do usuario.
Branch: `claude/7grafica-foundation-setup-qrpydv`.
Commit da implementacao: `3339be4`.
Base atualizada com `git pull --ff-only origin claude/7grafica-foundation-setup-qrpydv`: `3922ac7`.

**Nao iniciar SPEC 08 sem validacao do usuario. SPECs 01 a 06 permanecem concluidas/validadas.**

## Modelos e repositorios

Reutilizados `Arquivo`, `Trabalho`, `Servico`, workflow/etapas, auditoria, `ArquivoRepository` e `TrabalhoRepository` do dataset existente. Nenhum dataset paralelo, backend ou migration remota.

- Arquivo: referencia mock unica por versao, comentario de versao, briefing e exigencia de aprovacao do cliente, mantendo grupo, autor, data, versao anterior, analise e pareceres separados.
- Trabalho: requisito de arquivo congelado na criacao; referencia explicita `arquivoLiberadoId` preservada.
- `arquivos.vincularTrabalho`: vinculo explicito e compativel com empresa/pedido; reanalisa com requisitos do Trabalho e exige nova aprovacao tecnica.
- Recebimento em Solicitacoes/Pedidos, vinculo operacional pelo Pedido e acompanhamento completo no Trabalho.
- `motivoArquivoInvalido` centraliza validacao; `exigirArquivoDaEtapa` aplica bloqueio e auditoria.

## Arquivos, versoes e preflight

Metadados e referencias `mock://` persistidos; conteudo nunca salvo em LocalStorage. PDF real lido temporariamente com `pdf-lib`, carregado sob demanda: paginas, dimensoes, orientacao, formato aproximado, tamanho e MIME. Metadados manuais continuam disponiveis no Trabalho.

Preflight OK/ALERTA/BLOQUEIO com resumo e motivos deterministas. Confere formato, paginas, dimensoes, numeros invalidos, tamanho vazio e MIME de PDF. Nao usa IA nem faz correcoes profissionais.

Cada nova versao preserva a anterior, comentario, briefing e relacao de continuidade. Nova versao nunca herda aprovacoes. A anterior nao pode ser reativada, reanalisada, reenviada ou reliberada apos substituicao.

## Arte e aprovacoes

Arte pronta: receber, analisar, aprovar tecnicamente e liberar explicitamente.
Criacao externa: briefing, V1, enviar ao cliente, solicitar alteracao, V2, aprovar cliente, aprovar tecnicamente e liberar.

Parecer tecnico e decisao do cliente separados. Exigencia do cliente tambem pode ser ativada ao enviar um arquivo tipo cliente/producao para aprovacao. Reenvio gera novo token, revoga o antigo e remove decisao anterior. Nova analise exige nova aprovacao tecnica. Portal informa que o conteudo deve ser conferido externamente e que aprovacao do cliente nao significa liberacao operacional automatica.

## Integracao e correcoes concretas

A estrutura previa da SPEC 07 estava parcialmente presente na base. Lacunas corrigidas:

1. Transicao verificava somente existencia do ID, permitindo usar versao substituida/rejeitada. Agora confere vinculo, situacao, analise, aprovacao tecnica e aprovacao do cliente nas etapas dependentes.
2. Saida/conclusao/retomada de etapa dependente e execucao de equipamento poderiam contornar o bloqueio. O mesmo guard foi adicionado a esses pontos. Etapas sem dependencia mantem seu comportamento.
3. Arquivo tipo cliente substituido ainda podia ser reliberado. Agora versao terminal e recusada.
4. Operador via todos os arquivos do Trabalho. Agora leituras retornam somente a versao liberada e apta dos Trabalhos que executa. O teste antigo nao preparava a liberacao e foi corrigido para verificar antes/depois e outro operador.
5. Reenvio reutilizava token/decisao; reanalise preservava aprovacao tecnica. Ambos corrigidos.

Alteracoes em Trabalhos/Alocacoes sao exclusivamente os pontos de integracao necessarios a dependencia da SPEC 07. Compatibilidade, capacidades, snapshots de workflow, transicoes comerciais, caixa e recebimentos nao foram reimplementados. Dataset preservado.

## RBAC e auditoria

Admin/Gerente gerenciam e liberam. Atendente recebe, cria versao, vincula ao Trabalho e envia ao cliente, mas nao aprova tecnicamente nem libera. Operador consulta apenas versao liberada e apta dos seus Trabalhos; nao substitui/libera.

Enforcement no proxy de repositorios. Auditoria: recebimento/criacao de arte, nova versao, analise, problema, vinculo, envio, alteracao/recusa/aprovacao do cliente, parecer tecnico, liberacao e bloqueio com motivo. Timeline do Trabalho inclui eventos de seus arquivos para os papeis comerciais/gerenciais.

## Verificacao executada

- `npm run typecheck`: aprovado.
- `npm run lint`: zero erros; cinco avisos preexistentes sobre `<img>`.
- `npm run build`: aprovado, Next.js 15.5.25.
- `npm test`: 91 testes aprovados, 13 arquivos. Inclui os seis cenarios obrigatorios via testes de dominio/RBAC e leitura real de PDF em memoria.
- `npm run test:e2e`: seis testes aprovados no Chromium, desktop 1440x900, tablet 768x1024 e mobile 390x844. Fluxo completo de V1/V2, bloqueio, leitura de PDF, token publico, aprovacao, liberacao, recarga, historico e restricao de operador.
- Sem erro de execucao da pagina no fluxo E2E; sem overflow horizontal nas telas verificadas. Capturas desktop/mobile revisadas.

O download padrao do Chromium falhou na rede deste ambiente. A execucao usou Chromium 152 fornecido por `@sparticuz/chromium` em pasta temporaria e `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Essa dependencia de ambiente nao foi incluida no produto. Em ambiente normal: `npx playwright install chromium`, `npm run build`, `npm run test:e2e`.

## Limitacoes

- Links publicos funcionam somente no mesmo navegador/perfil/origem que possui o dataset.
- Nao ha upload persistente nem visualizacao do conteudo no portal. O cliente deve conferir a versao externamente.
- Leitura automatica limitada a 25 MB. PDFs protegidos/invalidos ou com tamanhos de pagina diferentes exigem conferencia; formatos nao PDF nao extraem paginas/dimensoes automaticamente.
- Metadados manuais dependem de conferencia humana. Nao ha PDF/X, CMYK, TAC, fontes, sangria profissional, antivirus, OCR ou IA.
- Requisitos de novos Trabalhos sao congelados; registros legados usam fallback do Servico. Nenhum reset foi necessario.
- Validacao responsiva em viewports Chromium, nao em aparelhos fisicos/Safari.

## Roteiro de validacao do usuario

1. No Trabalho de demonstracao, tentar Acabamento antes de liberar: deve explicar o bloqueio.
2. Aprovar tecnicamente o arquivo correto e liberar; avancar.
3. Criar versao incompativel e conferir os motivos; depois receber versao correta preservando historico.
4. Criar arquivo tipo Arte com briefing, enviar ao cliente, abrir link no mesmo navegador, solicitar alteracao e gerar V2.
5. Aprovar V2 como cliente e tecnicamente, liberar explicitamente e recarregar.
6. Entrar como Operador: conferir somente o arquivo liberado do seu Trabalho e ausencia de acoes de substituicao/liberacao.

**Checkpoint entregue. Aguardar validacao. SPEC 08 nao iniciada.**
