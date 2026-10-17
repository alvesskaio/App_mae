// Conversa simulada: mostra como seria falar com o assistente no WhatsApp.
// As respostas são regras simples sobre os dados do app, sem IA e sem WhatsApp de verdade.
import { getState, currentChild, update } from './store.js';
import { I } from './icons.js';
import { esc, pickPhoto, toast } from './ui.js';
import * as D from './dates.js';
import { sortSubjects } from './grades.js';

const QUICK = ['O que tem esta semana?', 'Quanto falta em cada matéria?', 'Qual a próxima consulta?'];
const msgs = [];
let booted = false;
let typing = false;

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lcFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const nameOf = (s, id) => (s.children.find((c) => c.id === id) || {}).name || '';

function push(m) {
  msgs.push({ time: D.nowTime(), ...m });
}

export function resetChat() {
  msgs.length = 0;
  booted = false;
  typing = false;
}

function boot() {
  if (booted) return;
  booted = true;
  const s = getState();
  const c = currentChild(s);
  const hi = `Oi${s.motherName ? ', ' + s.motherName : ''}!`;
  const ev = c
    ? s.events.filter((e) => e.date >= D.todayISO() && (!e.childId || e.childId === c.id)).sort(D.byWhen)[0]
    : null;
  if (ev) {
    const who = nameOf(s, ev.childId);
    const when = `${D.weekday(ev.date)}, ${D.brDateShort(ev.date)}${ev.time ? ', às ' + D.timeLabel(ev.time) : ''}`;
    const hasDocs = ev.category === 'saude' && s.docs.some((d) => d.childId === c.id);
    push({ from: 'bot', text: `${hi} Lembrete: ${when}, ${lcFirst(ev.title)}${who ? ` (${who})` : ''}.${hasDocs ? ' Quer que eu separe os exames guardados?' : ''}` });
  } else {
    push({ from: 'bot', text: `${hi} Eu lembro dos compromissos e acompanho as notas. Escolha uma pergunta abaixo ou escreva a sua.` });
  }
}

function answer(q) {
  const t = norm(q);
  const s = getState();
  const c = currentChild(s);
  if (!c) return { text: 'Primeiro adicione um filho no app para eu poder ajudar.', link: { label: 'Adicionar filho', href: '#/novo-filho' } };

  if (/\b(oi|ola|bom dia|boa tarde|boa noite)\b/.test(t)) {
    return { text: 'Oi! Pergunte sobre a semana, as notas ou a próxima consulta.' };
  }

  if (/(nota|materia|passar|boletim|falta|media)/.test(t)) {
    const subs = sortSubjects(s.subjects.filter((x) => x.childId === c.id), s.media);
    if (!subs.length) {
      return { text: `Ainda não tenho notas de ${c.name}. Abra o app e digite as notas do boletim.`, link: { label: 'Abrir no app', href: '#/escola' } };
    }
    const lines = subs.map(({ s: x, a }) => {
      if (a.kind === 'final') return `${x.name}: média final ${a.big} (${a.label.toLowerCase()})`;
      if (a.level === 'garantida') return `${x.name}: média já garantida`;
      return `${x.name}: precisa de ${a.big} ${a.where}`;
    });
    return { text: `Para ${c.name} passar de ano:\n${lines.join('\n')}`, link: { label: 'Abrir no app', href: '#/escola' } };
  }

  if (/(consulta|medic|pediatra|exame|saude|vacina)/.test(t)) {
    const e = s.events.filter((x) => x.category === 'saude' && x.date >= D.todayISO() && (!x.childId || x.childId === c.id)).sort(D.byWhen)[0];
    const n = s.docs.filter((d) => d.childId === c.id).length;
    const docs = n ? ` Você tem ${n} ${n === 1 ? 'documento guardado' : 'documentos guardados'}.` : '';
    if (!e) return { text: `Não há consulta marcada para ${c.name}.${docs}`, link: { label: 'Abrir no app', href: '#/saude' } };
    return { text: `A próxima é ${D.longDate(e.date).toLowerCase()}${e.time ? ', às ' + D.timeLabel(e.time) : ''}: ${lcFirst(e.title)}.${docs}`, link: { label: 'Abrir no app', href: '#/saude' } };
  }

  if (/(semana|agenda|compromiss|hoje|amanha|o que tem|proximos)/.test(t)) {
    const list = s.events.filter((e) => e.date >= D.todayISO() && (!e.childId || e.childId === c.id)).sort(D.byWhen).slice(0, 5);
    if (!list.length) return { text: 'Não há nada marcado. Quer adicionar um compromisso?', link: { label: 'Abrir no app', href: '#/inicio' } };
    const lines = list.map((e) => `${D.brDateShort(e.date)} (${D.weekday(e.date)}${e.time ? ', ' + D.timeLabel(e.time) : ''}): ${e.title}`);
    return { text: `Próximos compromissos:\n${lines.join('\n')}`, link: { label: 'Abrir no app', href: '#/inicio' } };
  }

  return { text: 'Ainda estou aprendendo a responder isso. Tente perguntar sobre a semana, as notas ou a próxima consulta.' };
}

function bubble(m) {
  const img = m.img ? `<img class="chat-img" src="${m.img}" alt="Foto enviada">` : '';
  const text = m.text ? `<span>${esc(m.text)}</span>` : '';
  const link = m.link ? `<a class="chip line" href="${m.link.href}">${esc(m.link.label)}</a>` : '';
  return `<div class="msg ${m.from}">${img}${text}<time>${esc(m.time)}</time></div>${link ? `<div class="qr">${link}</div>` : ''}`;
}

function listHtml() {
  let h = `<div class="day">Hoje</div>` + msgs.map(bubble).join('');
  if (typing) h += `<div class="msg bot typing" aria-label="digitando">digitando…</div>`;
  else h += `<div class="qr">${QUICK.map((q) => `<button type="button" class="chip line" data-action="chat-quick" data-text="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  return h;
}

function refresh() {
  const el = document.getElementById('chat-list');
  if (!el) return;
  el.innerHTML = listHtml();
  el.scrollTop = el.scrollHeight;
}

function reply(res) {
  typing = true;
  refresh();
  setTimeout(() => {
    typing = false;
    push({ from: 'bot', ...res });
    refresh();
  }, 650);
}

export function ask(text) {
  const t = text.trim();
  if (!t || typing) return;
  push({ from: 'me', text: t });
  reply(answer(t));
}

export async function sendPhoto() {
  if (typing) return;
  const photo = await pickPhoto();
  if (!photo) return;
  const s = getState();
  const c = currentChild(s);
  push({ from: 'me', text: 'Boletim novo', img: photo });
  if (c) {
    const ok = update((st) => { st.boletim[c.id] = { photo, at: D.todayISO() }; });
    if (!ok) toast('Sem espaço para guardar a foto neste navegador.');
  }
  reply({
    text: 'Recebi a foto e guardei no app. Por enquanto eu ainda não leio o boletim sozinha: abra o app e digite as notas. A leitura automática não existe nesta versão.',
    link: { label: 'Abrir no app', href: '#/escola' },
  });
}

export function chatScreen() {
  boot();
  return `<div class="chat-head">
      <a class="back" href="#/inicio" aria-label="Voltar ao app">${I.back(24)}</a>
      <div class="av" aria-hidden="true">A</div>
      <div><p class="nm">App Mãe</p><p class="st">Simulação da conversa no WhatsApp</p></div>
    </div>
    <div class="chat-list" id="chat-list" role="log" aria-live="polite" aria-label="Conversa">${listHtml()}</div>
    <form class="chat-form" data-form="chat" autocomplete="off">
      <label class="sr" for="chat-msg">Mensagem</label>
      <input class="inp" id="chat-msg" name="msg" placeholder="Mensagem" maxlength="200">
      <button type="button" class="cam sm" data-action="chat-photo" aria-label="Enviar foto do boletim">${I.camera(22)}</button>
      <button type="submit" class="cam sm" aria-label="Enviar">${I.send(22)}</button>
    </form>`;
}

export function afterChatRender() {
  const el = document.getElementById('chat-list');
  if (el) el.scrollTop = el.scrollHeight;
}
