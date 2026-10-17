# App Mãe (protótipo funcional)

Site estático instalável (PWA) para testar o design e o fluxo: cadastrar filho, guardar consultas e exames, digitar notas e ver quanto falta em cada matéria, além de uma conversa simulada de WhatsApp.

## O que funciona e o que não funciona

- Funciona: cadastro de filhos, compromissos, documentos (foto), matérias e notas com cálculo (média anual 6,0, 4 bimestres), dados de exemplo, instalar na tela inicial.
- Dados ficam só no navegador do aparelho (localStorage). Não há servidor, conta ou login. Limpar os dados do site apaga tudo, e outro aparelho não vê nada.
- A foto do boletim é guardada, mas não é lida automaticamente. As notas são digitadas.
- A conversa de WhatsApp é simulada, com regras simples sobre os dados do app. Não usa IA nem a API do WhatsApp.

## Rodar localmente

```
npx wrangler pages dev ./public
```

Ou, sem nada instalado: `python3 -m http.server 8080 --directory public` e abrir `http://localhost:8080`.

## Publicar na Cloudflare Pages

Opção 1, pela linha de comando:

```
npx wrangler login
npx wrangler pages deploy ./public --project-name app-mae
```

Opção 2, pelo painel: Workers & Pages, Create, Pages, Upload assets, e enviar a pasta `public/`.

O endereço sai como `https://app-mae.pages.dev` (ou parecido). Depois abra no celular e use "Adicionar à tela inicial".

## Privacidade

- O site é público por padrão: qualquer pessoa com o link abre. Está marcado como `noindex` (meta, `robots.txt` e `_headers`), mas isso só evita buscadores. Para restringir, use Cloudflare Access.
- Nesta versão nada sai do aparelho. Mesmo assim, use dados de exemplo ou fictícios: são dados de crianças.
- O texto de consentimento no cadastro é provisório. Antes de coletar dados reais (LGPD, dados de menores e de saúde), precisa de revisão jurídica.

## Estrutura

```
public/        pasta publicada
  index.html, css/app.css, sw.js, manifest.webmanifest, _headers, robots.txt
  js/          módulos ES (store, telas, folhas, conversa, notas, datas)
  icons/
wrangler.toml
```
