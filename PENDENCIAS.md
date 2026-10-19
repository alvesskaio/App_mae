# Pendências do Owl Day

Lista do que ainda falta. Atualizada na branch `fase1-aba-eu`.

## Para publicar

- [ ] Rodar `npm run build` e abrir a tela de boas-vindas na versão exportada (`npx serve out`). Conferir que o botão "Ver com dados de exemplo" não aparece.
- [ ] Fazer o push e mesclar `fase1-aba-eu` em `dev`/`main`.
- [ ] Publicar na Cloudflare (o worker continua `app-mae`; mudar o nome cria outro endereço).
- [ ] Testar num celular de verdade: ícone, ícone mascarável (Android), ícone da tela inicial (iOS), tela de abertura, instalação e modo offline. Até agora só foi visto no Chrome sem interface, a 390 px.

## Conteúdo que precisa de validação

- [ ] **Vacinas** (`src/data/vacinas.json`): pediatra valida. Hoje é rascunho e cobre só até 1 ano (18 doses). Falta o calendário de 1 a 14 anos.
- [ ] **Exames do pré-natal** (`src/data/exames-prenatal.json`): obstetra valida. Rascunho montado a partir de fontes secundárias; os PDFs oficiais do Ministério da Saúde não puderam ser lidos. O arquivo lista o que não foi confirmado.
- [ ] **Texto de consentimento** (cadastro e aba Eu): provisório. Precisa de revisão jurídica (LGPD, dados de menores e de saúde) antes de coletar dados reais.
- [ ] Revisar o trecho "Nesta versão de teste…" dos textos de consentimento e do aviso de WhatsApp quando o texto jurídico for definido.

## Funcionalidades que não existem

- [ ] **Avisos reais por WhatsApp.** Hoje a conversa é simulada e os interruptores da aba Eu só guardam a preferência. Os lembretes da mãe também não avisam, só aparecem na tela inicial.
- [ ] **Calendário semanal.** Foi construído e depois retirado do commit, a pedido, para repensar o visual. A cópia está em `C:\Projetos\02_Profissional\06_app_mae_calendario_backup` (rota, ícone, funções de semana, CSS e service worker).
- [ ] **Curva de crescimento** (comparar peso e altura com referência).
- [ ] **Login e sincronização entre aparelhos.** Hoje tudo fica no navegador; outro aparelho não vê nada.

## Funcionalidades que ficaram simples

- [ ] **Remédios:** só um horário por dia e sem marcação de "tomado".
- [ ] **Carteirinha:** faltam triagens neonatais, visão, dentista e internações.
- [ ] **Perfil:** a pergunta "já tem experiência" só existe na aba Eu, não no cadastro.

## Qualidade e limpeza

- [ ] Não há testes automáticos. A lógica de repetição dos lembretes (`src/lib/reminders.ts`) foi testada só numa cópia temporária (14 casos, incluindo 31 de janeiro para 28 de fevereiro e 29 de fevereiro). Vale transformar em teste do projeto.
- [ ] Apagar a pasta `legacy/` (versão antiga em HTML puro, só referência).

## Mantido de propósito (não mudar sem plano)

- Chave de dados `appmae.v2` no localStorage: trocar apaga os dados já salvos nos aparelhos.
- Nome do worker `app-mae` no `wrangler.toml` e nome do pacote em `package.json`: trocar muda o endereço de deploy.
- Nome do cache do service worker: interno, sem efeito visível.
