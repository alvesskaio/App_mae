# Owl Day (protótipo funcional)

Site instalável (PWA) feito em Next.js (App Router, TypeScript) e exportado como site estático. É um app para mães, da gestação até os 14 anos do filho, com um perfil por filho e uma conversa simulada de WhatsApp. Fonte: Open Sans (títulos em ExtraBold). A logo é a corujinha em `assets/brand/`.

## O que funciona e o que não funciona

**Cadastro e fases**
- Cadastro em 3 etapas, com o consentimento antes de qualquer pergunta de saúde: está grávida (data prevista opcional), filhos, rotina. O consentimento de estatísticas é separado e opcional.
- A fase de cada filho é calculada pela data prevista ou de nascimento, nunca escolhida: gestação, primeiro ano, primeiros passos, pré-escola, escola. Gestação é tratada como "filho que ainda não nasceu".
- Gestação: semanas pela data prevista, editar data e gêmeos, registrar nascimento (gêmeos viram dois perfis), encerrar o acompanhamento (guardar escondido ou apagar).

**Início (panorama geral)**
- Destaque do dia, lembretes da mãe, um card por filho (fase, próximo compromisso, remédios e vacinas pendentes), remédios de hoje, próximos compromissos e alertas (data prevista que passou, nota baixa, dia de folga para consulta).

**Cada filho**
- Saúde: compromissos, vacinas (card-resumo e caderneta), carteirinha (peso, altura, perímetro cefálico até 3 anos, nascimento, alergias e remédios contínuos), remédios prescritos (nome, dose em ml, horário e duração; o app não calcula nem sugere dose), documentos por foto e, na gestação, exames do pré-natal por semana.
- Notas nos compromissos: texto livre "Como foi" e foto do resultado, em qualquer compromisso.
- Escola (a partir da pré-escola): compromissos, boletim por foto e notas com cálculo (média anual 6,0, 4 bimestres).

**Eu**
- Perfil, rotina, WhatsApp (número, silêncio noturno e preferência por tipo de aviso), privacidade e dados (consentimento, estatísticas anônimas, baixar os dados em JSON) e apagar a conta.

**Dados**
- Tudo fica só no navegador (localStorage, chave `appmae.v2`; o nome da chave foi mantido para não perder dados já salvos). Não há servidor, conta ou login. Limpar os dados do site apaga tudo, e outro aparelho não vê nada. Dados da versão anterior (`appmae.v1`) são migrados.
- A foto do boletim e dos resultados é guardada, mas não é lida automaticamente.

**O que não existe**
- Avisos reais por WhatsApp: a conversa é simulada, com regras simples, sem IA nem a API do WhatsApp. Os interruptores de aviso na aba Eu só guardam a preferência.
- Curva de crescimento, cálculo de dose, calendário semanal e login.

## Conteúdo médico a validar

Dois calendários ficam em arquivos de dados, separados do código, e **são rascunhos que precisam de validação profissional antes de uso real**:

- `src/data/vacinas.json`: doses por idade em meses, até 1 ano.
- `src/data/exames-prenatal.json`: exames por semana de gestação. Lista as fontes consultadas e o que não foi confirmado.

Para ajustar, edite só esses arquivos. Não mude o `id` de itens que já foram usados, senão os registros já feitos deixam de casar com o calendário.

## Rodar localmente

```
npm install
npm run dev
```

Abra `http://localhost:3000`. O service worker (modo offline) só roda na versão publicada ou exportada, não no `dev`. No `dev` aparece, na aba Eu, o link "Dados de exemplo (só desenvolvimento)", que não existe na versão publicada.

Para testar a versão exportada:

```
npm run build
npx serve out
```

## Logo e ícones

O original fica em `assets/brand/logo-original.png` e nunca é alterado. Para gerar de novo os ícones do PWA, o favicon, a versão sem fundo e o ícone de 1024 px para as lojas:

```
python assets/brand/generate-icons.py
```

Precisa de Python com Pillow. As saídas vão para `public/icons/`, `public/favicon.ico` e `assets/brand/store/`.

## Publicar na Cloudflare (Workers, arquivos estáticos)

O `next build` gera o site estático na pasta `out/` (`output: 'export'`) e o `wrangler.toml` publica essa pasta. O nome do worker continua `app-mae`; mudar esse nome cria outro endereço.

Opção 1, pela linha de comando:

```
npx wrangler login
npm run deploy
```

Opção 2, pelo painel: conecte o repositório e use o comando de build `npm run build` com a pasta de saída `out`. Ou envie a pasta `out/` em Workers & Pages, Create, Pages, Upload assets.

O endereço sai como `https://app-mae.pages.dev` (ou parecido). Depois abra no celular e use "Adicionar à tela inicial".

## Privacidade

- O site é público por padrão: qualquer pessoa com o link abre. Está marcado como `noindex` (meta, `robots.txt` e `_headers`), mas isso só evita buscadores. Para restringir, use Cloudflare Access.
- Nesta versão nada sai do aparelho. Mesmo assim, use dados de exemplo ou fictícios: são dados de crianças.
- O texto de consentimento no cadastro é provisório. Antes de coletar dados reais (LGPD, dados de menores e de saúde), precisa de revisão jurídica.

## Estrutura

```
assets/brand/   logo original, versão sem fundo, ícone das lojas e o script que gera os ícones
src/
  app/          rotas: / (início), filho, eu, whatsapp, novo-filho; layout e globals.css
  components/   Shell (menu), Onboarding (cadastro), Ui (folhas, aviso, foto), sheets (formulários),
                CardSheets, PrenatalSheets, RemindersSheets, parts, Icons
  data/         calendários editáveis: vacinas.json e exames-prenatal.json
  lib/          store (localStorage), phases (fases), grades (notas), dates, chat (conversa simulada),
                medicines, vaccines, growth, prenatal, reminders, view, photo
public/         manifest, service worker, ícones, favicon, _headers, robots.txt
legacy/         versão anterior em HTML e JS puro, só como referência (pode apagar)
next.config.mjs, wrangler.toml
```
