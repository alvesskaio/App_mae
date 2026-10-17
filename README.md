# App Mãe (protótipo funcional)

Site instalável (PWA) feito em Next.js (App Router, TypeScript) e exportado como site estático, para testar o design e o fluxo de um app para mães: da gestação até a escola, com um perfil por filho, e uma conversa simulada de WhatsApp. Fonte: Open Sans (títulos em ExtraBold).

## O que funciona e o que não funciona

- Cadastro em 3 etapas, com o consentimento antes de qualquer pergunta de saúde: está grávida (data prevista opcional), filhos, rotina. Consentimento de estatísticas é separado e opcional.
- Fases por idade, sem escolha manual: gestação, primeiro ano, primeiros passos, pré-escola, escola. A mãe diz se está grávida e informa o nascimento de cada filho; a fase de cada perfil é calculada e muda sozinha. Notas e boletim só aparecem na fase escola.
- Hoje junta os compromissos de todos os filhos, com o nome do filho em texto em cada linha. Seletor de filho em folha inferior.
- Gestação: semanas calculadas pela data prevista, editar data e gêmeos, registrar nascimento (gêmeos viram dois perfis), encerrar acompanhamento (guardar escondido ou apagar). Filho encerrado some de Hoje, da conversa e dos lembretes.
- Eu: rotina, silêncio, consentimentos, baixar dados (JSON), apagar tudo, dados de exemplo.
- Compromissos, documentos (foto), matérias e notas com cálculo (média anual 6,0, 4 bimestres).
- Dados ficam só no navegador (localStorage, chave `appmae.v2`). Não há servidor, conta ou login. Limpar os dados do site apaga tudo, e outro aparelho não vê nada. Dados da versão anterior (`appmae.v1`) são migrados.
- A foto do boletim é guardada, mas não é lida automaticamente. As notas são digitadas.
- A conversa de WhatsApp é simulada, com regras simples. Não usa IA nem a API do WhatsApp. Toda mensagem diz de qual filho é.
- Não existe: peso e altura, lembretes reais.

## Rodar localmente

```
npm install
npm run dev
```

Abra `http://localhost:3000`. O service worker (modo offline) só roda na versão publicada ou exportada, não no `dev`.

Para testar a versão exportada:

```
npm run build
npx serve out
```

## Publicar na Cloudflare (Workers, arquivos estáticos)

O `next build` gera o site estático na pasta `out/` (`output: 'export'`) e o `wrangler.toml` publica essa pasta.

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
src/
  app/          rotas: / (Hoje), filho, eu, whatsapp, novo-filho; layout e globals.css
  components/   Shell (menu), Onboarding (cadastro), Ui (folhas, aviso, foto), sheets, parts, Icons
  lib/          store (localStorage), phases (fases), grades (notas), dates, chat (conversa simulada), view, photo
public/         manifest, service worker, ícones, _headers, robots.txt
legacy/         versão anterior em HTML e JS puro, só como referência (pode apagar)
next.config.mjs, wrangler.toml
```
