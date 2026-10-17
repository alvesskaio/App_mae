// Utilidades de interface: escape de texto, folhas (bottom sheets), avisos e fotos.
import { I } from './icons.js';

export const $ = (sel, el = document) => el.querySelector(sel);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function toast(msg) {
  const root = $('#toast-root');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  root.replaceChildren(t);
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => root.replaceChildren(), 2800);
}

let lastFocus = null;

export function openSheet(title, body, onSubmit) {
  const root = $('#sheet-root');
  lastFocus = document.activeElement;
  root.innerHTML = `
    <div class="backdrop" data-action="close-sheet"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
      <div class="sheet-top">
        <h2 class="h2" id="sheet-title">${esc(title)}</h2>
        <button type="button" class="close" data-action="close-sheet" aria-label="Fechar">${I.close(22)}</button>
      </div>
      ${body}
    </section>`;
  $('#app').inert = true;
  $('#nav').inert = true;
  const form = $('form', root);
  if (form && onSubmit) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(form);
      await onSubmit(new FormData(form), form);
    });
  }
  $('.sheet', root).focus({ preventScroll: true });
}

export function closeSheet() {
  $('#sheet-root').innerHTML = '';
  $('#app').inert = false;
  $('#nav').inert = false;
  if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
}

export const sheetOpen = () => !!$('#sheet-root').firstChild;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetOpen()) closeSheet();
});

export function setError(form, name, msg) {
  const p = form.querySelector(`[data-err="${name}"]`);
  if (p) p.textContent = msg;
  const input = form.elements[name];
  if (input && input.setAttribute) input.setAttribute('aria-invalid', 'true');
}

export function clearErrors(form) {
  form.querySelectorAll('[data-err]').forEach((p) => { p.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
}

// Reduz a foto antes de guardar, para caber no armazenamento do navegador.
export async function shrink(file, max = 1100) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}

// Abre o seletor de foto (câmera ou galeria). Resolve com a foto reduzida, ou null se falhar.
export function pickPhoto() {
  return new Promise((resolve) => {
    const input = $('#file-input');
    input.value = '';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return resolve(null);
      try {
        resolve(await shrink(file));
      } catch (e) {
        toast('Não consegui abrir essa foto. Tente outra.');
        resolve(null);
      }
    };
    input.click();
  });
}
