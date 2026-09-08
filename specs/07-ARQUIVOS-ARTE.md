# SPEC 07 - Arquivos e Arte

**Status: PROXIMA SPEC A EXECUTAR**

> Nao iniciar SPEC 08 antes do checkpoint e validacao desta SPEC.

## Objetivo
Controlar arquivos recebidos, versoes, analise tecnica basica, criacao/ajuste de arte, aprovacoes e a referencia explicita do arquivo liberado para producao.

## Principio operacional

O sistema deve impedir que a producao utilize silenciosamente arquivo errado, versao antiga ou arte ainda nao aprovada.

Fluxo de referencia:

`Arquivo recebido -> Versao -> Analise tecnica -> Aprovacao do cliente (quando exigida) -> Liberado para producao -> Trabalho referencia explicitamente essa versao`.

## Arquivo como entidade

Relacionar arquivos a Solicitacao, Pedido, Trabalho e/ou Arte conforme o caso. Diferenciar ao menos:

- ARQUIVO_CLIENTE;
- ARQUIVO_ARTE;
- ARQUIVO_PRODUCAO.

Nunca sobrescrever versao anterior.

## Estrategia local-first

Nao armazenar binarios grandes/base64 em LocalStorage. No MVP, persistir metadados e referencias mockadas controladas, mantendo a arquitetura preparada para futuro Supabase Storage.

Metadados minimos: nome, tipo/extensao, tamanho, origem, versao, data/hora, responsavel, vinculos, situacao e metadados tecnicos disponiveis.

## Preflight basico do MVP

Para PDF, quando tecnicamente possivel no ambiente atual, identificar:

- numero de paginas;
- dimensoes;
- orientacao;
- formato aproximado;
- tamanho;
- MIME.

Resultado de analise: `OK | ALERTA | BLOQUEIO`, sempre acompanhado das regras/motivos encontrados.

Nao implementar nesta SPEC RGB->CMYK, PDF/X, TAC, flatten, fontes, sangria profissional ou correcoes automaticas.

## Requisitos por servico/trabalho

Preparar regras deterministicas de arquivo por servico/trabalho, por exemplo formato, dimensao e numero esperado de paginas. O analisador compara metadados encontrados com os requisitos e explica divergencias. Nao usar IA.

## Versionamento

Preservar V1, V2, V3... com autor, data, comentario, status e relacao de substituicao/continuidade. Deve ser possivel saber qual versao apresentou problema, qual a substituiu e qual foi liberada para producao.

## Fluxo de Arte

Suportar dois caminhos:

1. Arte pronta: cliente envia -> analise -> aprovacao tecnica -> liberacao.
2. Criacao de arte: briefing/solicitacao -> criacao externa -> versao -> envio para aprovacao -> alteracao ou aprovacao -> aprovacao tecnica -> liberacao.

O 7Grafica gerencia processo, versoes e aprovacoes. Nao implementar editor grafico.

Estados de arte sugeridos: em_criacao, aguardando_aprovacao, alteracao_solicitada, aprovada, rejeitada/cancelada.

## Duas aprovacoes distintas

- **Aprovacao tecnica**: arquivo atende requisitos de producao.
- **Aprovacao do cliente**: cliente concordou com arte/conteudo.

Nao misturar os dois conceitos. Um arquivo pode estar tecnicamente correto e ainda aguardar o cliente.

## Integracao com Trabalho/Workflow

O detalhe do Trabalho deve mostrar arquivos relacionados e qual versao esta explicitamente `liberada para producao`.

Nao assumir que o ultimo upload e automaticamente o arquivo correto.

Quando uma etapa produtiva depender obrigatoriamente de arquivo/aprovacao, bloquear transicao enquanto a dependencia nao estiver satisfeita e registrar o motivo.

## Aprovacao publica

Se necessario para validar aprovacao de arte, utilizar token publico nao sequencial especifico. No MVP LocalStorage, manter documentada a limitacao de funcionamento no mesmo navegador. Nao criar backend provisório.

## RBAC

- Admin/Gerente: gerenciamento completo.
- Atendente: receber/anexar arquivos e acompanhar aprovacoes conforme processo comercial.
- Operador: consultar arquivos liberados dos Trabalhos que executa.
- Liberar/substituir a versao efetivamente destinada a producao exige permissao adequada.
- Enforcement no repository/domain layer, nao apenas UI.

## Auditoria

Registrar eventos relevantes: arquivo recebido, analise, problema encontrado, nova versao, arte criada, envio para aprovacao, alteracao solicitada, aprovacao do cliente, aprovacao tecnica e liberacao para producao.

## Cenarios obrigatorios

1. Arte pronta correta -> analise -> aprovacao tecnica -> liberacao -> Trabalho continua.
2. Arquivo incompatível -> bloqueio -> nova versao -> anterior preservada -> nova aprovada.
3. Criacao de arte -> V1 -> cliente solicita alteracao -> V2 -> cliente aprova -> aprovacao tecnica -> V2 liberada.
4. Tentar usar V1 depois de V2 liberada -> sistema nao seleciona V1 implicitamente.
5. Tentar avancar etapa dependente com aprovacao pendente -> bloqueio com motivo.
6. Operador consulta arquivo liberado, mas nao consegue substituir/liberar sem permissao.

## Fora do escopo

- Supabase Storage;
- Google Drive/Dropbox;
- editor grafico;
- conversao automatica;
- preflight profissional avancado;
- integracao Adobe/Corel;
- antivirus real;
- OCR;
- IA;
- estoque;
- financeiro/fiscal.

## Qualidade e checkpoint

Executar typecheck, lint, build, Vitest e Playwright. Validar desktop/tablet/mobile. Ao concluir, relatar modelos/repositories, estrategia de arquivos, versionamento, preflight, fluxo de arte, aprovacoes, integracao com Trabalho/Workflow, RBAC, testes, limitacoes, commit e branch.

**Parar ao final da SPEC 07 e aguardar validacao.**
