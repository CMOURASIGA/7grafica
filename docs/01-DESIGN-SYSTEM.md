# 7Grafica - Diretrizes de Design

## Referencia obrigatoria

O 7Grafica deve usar como base visual os componentes e padroes atuais do 7Commander.

O objetivo e manter coerencia com o HUB da Consult Services, sem copiar telas de concorrentes.

## Regras obrigatorias

- Shell autenticado unico.
- Mesma logica de navegacao, espacamento, tipografia, cards, tabelas, formularios, botoes, labels, modais e feedbacks usados no 7Commander.
- Responsividade obrigatoria em desktop, tablet e mobile.
- Nao usar interface com aparencia de MVP tecnico ou chat generico.
- Priorizar labels e feedbacks claros no centro da experiencia, evitando toasts genericos quando a acao exigir atencao.
- Acoes destrutivas devem exigir confirmacao.

## Canto superior esquerdo

Regra critica de padronizacao do HUB:

- O canto superior esquerdo deve seguir o mesmo padrao adotado nos demais sistemas do ecossistema Consult Services.
- Em ambiente whitelabel, exibir a identidade do cliente conforme o padrao atual.
- Nao inserir icone "C" isolado.
- Nao improvisar logo, breadcrumb ou atalho nesse espaco.
- O comportamento deve ser consistente entre Dashboard, Producao, PDV, Financeiro, Estoque, Portal administrativo e demais areas autenticadas.

## Identidade

- Nome do produto: 7Grafica
- Manter alinhamento visual com a familia 7Commander, 7Finance, 7Eventos, 7Legal e CRM Flow.
- O sistema pode ser whitelabel por cliente.
- Nao expor tecnologia interna ou detalhes de infraestrutura na UI.


## Componentes de referencia importados do 7Commander

Os seguintes arquivos foram copiados do 7Commander para servir como base real do design system do 7Grafica:

- components/ui/workspace-primitives.tsx
- components/ui/confirm-dialog.tsx
- components/ui/toast.tsx
- styles/tokens.css

### Primitivos obrigatorios

O desenvolvimento deve reutilizar/adaptar, e nao recriar do zero, os seguintes padroes:

- PageIntro
- SurfaceCard
- SectionLabel
- StatusPill
- MetricCard
- ConfirmProvider / useConfirm
- ToastProvider / useToast
- tokens de cor, superficie, borda, tipografia, estados e sidebar

## Shell e navegacao

Foram inspecionados no 7Commander como referencia direta:

- components/layout/app-shell.tsx
- components/layout/header.tsx
- components/layout/sidebar.tsx
- components/brand/brand-lockup.tsx
- app/globals.css

Esses componentes NAO devem ser copiados literalmente porque contem rotas, nomes, autenticacao e recursos especificos do 7Commander/Kairos. O dev deve portar o comportamento visual e estrutural para o dominio do 7Grafica.

### Regras para o shell do 7Grafica

- Sidebar responsiva com gaveta no mobile, rail/intermediario em tablet e largura completa em desktop.
- Header sticky com titulo de pagina, status do sistema e menu do usuario.
- Conteudo principal com paddings equivalentes ao 7Commander.
- Fundo de pagina, superficies, bordas, sombras e escala tipografica derivados dos tokens importados.
- Navegacao organizada por secoes do 7Grafica.
- Nenhuma referencia a Kairos, Projetos, Daily, Memory ou entidades do 7Commander no produto final.

## Regra especifica do canto superior esquerdo

O 7Commander atual possui uma area de marca no topo da sidebar. No 7Grafica essa area deve seguir a padronizacao HUB ja definida:

1. Prioridade para logo do cliente quando houver whitelabel.
2. Fallback para identidade Consult Services quando nao houver logo de cliente.
3. Nao usar icone "C" isolado.
4. Nao usar nome ou logo do 7Commander.
5. Abaixo da marca, exibir a identidade do produto 7Grafica de forma consistente com a familia HUB.
6. Manter proporcoes e comportamento responsivo equivalentes ao shell atual do 7Commander.

## Cores e tokens trazidos do 7Commander

Base atual:

- --bg-page: #f4f7fa
- --bg-surface: #ffffff
- --bg-muted: #edf3f8
- --text-primary: #17324d
- --text-secondary: #536b80
- --accent: #003b73
- --accent-strong: #002952
- --brand-highlight: #00aeef
- --sidebar: #003b73
- --sidebar-deep: #002952
- estados success, warning e danger conforme styles/tokens.css

O 7Grafica deve partir desses tokens para manter unidade visual com o HUB.

## Regra de implementacao

A SPEC 01 Foundation so pode ser considerada concluida quando houver validacao visual humana do shell em:

- desktop
- tablet
- mobile

E quando o canto superior esquerdo, sidebar, header, cards, botoes, inputs, confirmacoes e feedbacks estiverem coerentes com o 7Commander atual.
