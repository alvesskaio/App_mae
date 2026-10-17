// Ponto de entrada: rotas, eventos e registro do service worker.
import { getState, update, subscribe, currentChild, loadExample, uid, setSaveErrorHandler } from './store.js';
import * as S from './screens.js';
import * as SH from './sheets.js';
import { chatScreen, afterChatRender, ask, sendPhoto } from './chat.js';
import { $, toast, closeSheet, sheetOpen, pickPhoto, setError } from './ui.js';
import { I } from './icons.js';
import * as D from './dates.js';

const app = $('#app');
const shell = $('#shell');
const nav = $('#nav');

const ROUTES = {
  inicio: { view: S.inicio, title: 'Início', nav: true },
  escola: { view: S.escola, title: 'Escola', nav: true },
  saude: { view: S.saude, title: 'Saúde', nav: true },
  whatsapp: { view: chatScreen, title: 'Conversa', nav: false, cls: 'chat' },
  'novo-filho': { view: S.novoFilho, title: 'Adicionar filho', nav: false },
  'bem-vinda': { view: S.welcome, title: 'Bem-vinda', nav: false },
};

const TABS = [
  ['inicio', 'Início', I.home],
  ['escola', 'Escola', I.book],
  ['saude', 'Saúde', I.heart],
  ['whatsapp', 'WhatsApp', I.chat],
];

let lastRoute = null;

function routeName() {
  if (!getState().onboarded) return 'bem-vinda';
  const r = (location.hash || '').replace(/^#\//, '');
  return r !== 'bem-vinda' && ROUTES[r] ? r : 'inicio';
}

function navHtml(current) {
  return TABS.map(([key, label, icon]) => {
    const on = key === current;
    return `<a href="#/${key}" aria-label="${label}"${on ? ' aria-current="page"' : ''}>${icon(22)}${on ? `<span>${label}</span>` : ''}</a>`;
  }).join('');
}

function render() {
  const s = getState();
  if (s.children.length && !s.children.some((c) => c.id === s.currentChildId)) s.currentChildId = s.children[0].id;
  const name = routeName();
  const def = ROUTES[name];
  const keep = name === lastRoute ? app.scrollTop : 0;
  app.className = def.cls || '';
  app.innerHTML = def.view();
  shell.dataset.nav = def.nav ? 'on' : 'off';
  if (def.nav) nav.innerHTML = navHtml(name);
  document.title = `${def.title} · App Mãe`;
  app.scrollTop = keep;
  if (name === 'whatsapp') afterChatRender();
  lastRoute = name;
}

/* ---------- Fluxo do boletim por foto ---------- */
async function boletimFlow() {
  const c = currentChild(getState());
  if (!c) { toast('Adicione um filho primeiro.'); return; }
  const photo = await pickPhoto();
  if (!photo) return;
  const ok = update((st) => { st.boletim[c.id] = { photo, at: D.todayISO() }; });
  if (!ok) {
    update((st) => { delete st.boletim[c.id]; });
    toast('A foto não coube neste navegador. Tente de novo.');
    return;
  }
  closeSheet();
  if (location.hash !== '#/escola') location.hash = '#/escola';
  const has = getState().subjects.some((x) => x.childId === c.id);
  if (has) toast('Boletim guardado. Toque em uma matéria para digitar as notas.');
  else SH.subjectForm();
}

/* ---------- Cliques ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  switch (action) {
    case 'close-sheet': closeSheet(); break;
    case 'pick-child': update((st) => { st.currentChildId = id; }); break;
    case 'open-event': SH.eventView(id); break;
    case 'add-event': SH.eventForm({ category: el.dataset.category }); break;
    case 'add-doc': SH.docForm(); break;
    case 'open-doc': SH.docView(id); break;
    case 'add-subject': SH.subjectForm(); break;
    case 'open-subject': SH.subjectForm(id); break;
    case 'open-boletim': SH.boletimView(); break;
    case 'photo-boletim': boletimFlow(); break;
    case 'open-ajustes': SH.ajustes(); break;
    case 'open-dados': SH.dados(); break;
    case 'chat-quick': ask(el.dataset.text); break;
    case 'chat-photo': sendPhoto(); break;
    case 'arm':
      if (el.dataset.armed !== '1') {
        el.dataset.armed = '1';
        el.dataset.label = el.textContent;
        el.textContent = 'Toque de novo para confirmar';
        el.classList.add('danger');
        clearTimeout(el.armTimer);
        el.armTimer = setTimeout(() => {
          if (!el.isConnected) return;
          el.dataset.armed = '0';
          el.textContent = el.dataset.label;
          el.classList.remove('danger');
        }, 4000);
      } else {
        SH.runDo(el.dataset.do, el.dataset);
      }
      break;
    default:
  }
});

/* ---------- Formulários das telas ---------- */
document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const val = (n) => String((form.elements[n] && form.elements[n].value) || '').trim();

  if (kind === 'welcome') {
    const name = val('name');
    if (e.submitter && e.submitter.value === 'example') {
      loadExample(name);
    } else {
      update((st) => { st.onboarded = true; st.motherName = name; });
    }
    location.hash = '#/inicio';
    render();
  }

  if (kind === 'child') {
    form.querySelectorAll('[data-err]').forEach((p) => { p.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    let bad = false;
    const name = val('name');
    const birth = val('birth');
    if (!name) { setError(form, 'name', 'Digite o nome da criança.'); bad = true; }
    if (birth && birth > D.todayISO()) { setError(form, 'birth', 'A data não pode ser no futuro.'); bad = true; }
    if (!form.elements.ok.checked) { setError(form, 'ok', 'Marque para continuar.'); bad = true; }
    if (bad) return;
    const id = uid();
    update((st) => {
      st.children.push({ id, name, birth, school: val('school'), grade: val('grade') });
      st.currentChildId = id;
    });
    location.hash = '#/inicio';
    toast(`${name} adicionado.`);
  }

  if (kind === 'chat') {
    const input = form.elements.msg;
    const text = input.value;
    input.value = '';
    ask(text);
  }
});

/* ---------- Início ---------- */
setSaveErrorHandler(() => toast('Não consegui salvar neste navegador. Os dados podem se perder ao fechar.'));
subscribe(render);
window.addEventListener('hashchange', () => {
  if (sheetOpen()) closeSheet();
  render();
});
render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
