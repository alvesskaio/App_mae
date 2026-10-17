# App Mãe (protótipo funcional)

Site instalável (PWA) feito em Next.js (App Router, TypeScript) e exportado como site estático, para testar o design e o fluxo: cadastrar filho, guardar consultas e exames, digitar notas e ver quanto falta em cada matéria, além de uma conversa simulada de WhatsApp.

## O que funciona e o que não funciona

- Funciona: cadastro de filhos, compromissos, documentos (foto), matérias e notas com cálculo (média anual 6,0, 4 bimestres), dados de exemplo, instalar na tela inicial.
- Dados ficam só no navegador do aparelho (localStorage). Não há servidor, conta ou login. Limpar os dados do site apaga tudo, e outro aparelho não vê nada.
- A foto do boletim é guardada, mas não é lida automaticamente. As notas são digitadas.
- A conversa de WhatsApp é simulada, com regras simples sobre os dados do app. Não usa IA nem a API do WhatsApp.

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
  app/          rotas: / (início), escola, saude, whatsapp, novo-filho; layout e globals.css
  components/   Shell (menu e boas-vindas), Ui (folhas, aviso, foto), sheets, parts, Icons
  lib/          store (localStorage), grades (notas), dates, chat (conversa simulada), photo
public/         manifest, service worker, ícones, _headers, robots.txt
legacy/         versão anterior em HTML e JS puro, só como referência (pode apagar)
next.config.mjs, wrangler.toml
```

Observação: o endereço da Escola agora é `/escola/`, e não mais `/#/escola`. A chave dos dados no navegador continua `appmae.v1`, então quem já testou mantém os dados.
