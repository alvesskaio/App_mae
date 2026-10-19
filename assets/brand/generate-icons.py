"""Gera os ícones do app a partir de assets/brand/logo-original.png (o original nunca é alterado).

Uso, na raiz do projeto:  python assets/brand/generate-icons.py
Saídas:
  assets/brand/logo-transparent.png  corujinha sem fundo (fonte para lojas e para o app)
  assets/brand/store/icon-1024.png   ícone 1024x1024 sem transparência (Play Store e App Store)
  public/icons/* e public/favicon.ico
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / 'assets' / 'brand'
ICONS = ROOT / 'public' / 'icons'
BG = (253, 244, 245)  # --ground do app (#FDF4F5), mesmo background_color do manifest


def cut_background(im: Image.Image, tol: int = 14) -> Image.Image:
    """Torna transparente o fundo claro ligado às bordas (a coruja tem contorno escuro, então não vaza)."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    ref = px[0, 0]
    near = lambda p: all(abs(p[i] - ref[i]) <= tol for i in range(3))
    seen = bytearray(w * h)
    q = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or seen[y * w + x] or not near(px[x, y]):
            continue
        seen[y * w + x] = 1
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    out = rgb.convert('RGBA')
    op = out.load()
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                op[x, y] = (*ref, 0)
    # suaviza o recorte para não ficar serrilhado
    alpha = out.getchannel('A').filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(1.2))
    out.putalpha(alpha)
    return out


def square(owl: Image.Image, size: int, fill: float, bg=BG) -> Image.Image:
    """Coruja centralizada num quadrado; `fill` é a fração da lateral ocupada pela maior dimensão da coruja."""
    box = owl.getbbox()
    owl = owl.crop(box)
    scale = size * fill / max(owl.size)
    owl = owl.resize((round(owl.width * scale), round(owl.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(owl, ((size - owl.width) // 2, (size - owl.height) // 2))
    return canvas


def main():
    src = Image.open(BRAND / 'logo-original.png')
    if min(src.size) < 1024:
        raise SystemExit(f'Logo com {src.size}: precisa de pelo menos 1024px para as lojas.')
    owl = cut_background(src)
    owl.save(BRAND / 'logo-transparent.png', optimize=True)

    (BRAND / 'store').mkdir(exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)
    square(owl, 1024, 0.78).convert('RGB').save(BRAND / 'store' / 'icon-1024.png', optimize=True)

    # Ícones "any": coruja bem visível, fundo na cor do app.
    for s in (192, 512):
        square(owl, s, 0.80).convert('RGB').save(ICONS / f'icon-{s}.png', optimize=True)
    # Maskable: o Android recorta até um círculo de 80% (zona segura), então a coruja fica em ~58%.
    square(owl, 512, 0.58).convert('RGB').save(ICONS / 'icon-maskable-512.png', optimize=True)
    # iOS arredonda sozinho e não aceita transparência.
    square(owl, 180, 0.80).convert('RGB').save(ICONS / 'apple-touch-icon.png', optimize=True)

    # Favicon: sem fundo, para funcionar em aba clara e escura.
    fav = square(owl, 256, 0.96, bg=None)
    fav.save(ROOT / 'public' / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    fav.resize((48, 48), Image.LANCZOS).save(ICONS / 'favicon-48.png', optimize=True)
    fav.resize((32, 32), Image.LANCZOS).save(ICONS / 'favicon-32.png', optimize=True)
    # Imagem usada dentro do app (boas-vindas): 2x para telas retina.
    square(owl, 320, 1.0, bg=None).save(ICONS / 'owl.png', optimize=True)
    print('ok')


if __name__ == '__main__':
    main()
