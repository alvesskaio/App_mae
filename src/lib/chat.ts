// Conversa simulada: mostra como seria falar com o assistente no WhatsApp.
// As respostas são regras simples sobre os dados do app, sem IA e sem WhatsApp de verdade.
import { useSyncExternalStore } from 'react';
import { getState, currentChild, update } from './store';
import * as D from './dates';
import { sortSubjects } from './grades';

export const QUICK = ['O que tem esta semana?', 'Quanto falta em cada matéria?', 'Qual a próxima consulta?'];

export interface Msg {
  from: 'bot' | 'me';
  time: string;
  text?: string;
  img?: string;
  link?: { label: string; href: string };
}
type Reply = Omit<Msg, 'from' | 'time'>;
interface ChatSnap { msgs: Msg[]; typing: boolean }

let msgs: Msg[] = [];
let booted = false;
let typing = false;
let snap: ChatSnap = { msgs, typing };
const listeners = new Set<() => void>();

const emptySnap: ChatSnap = { msgs: [], typing: false };
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

function emit() {
  snap = { msgs, typing };
  listeners.forEach((l) => l());
}

function push(m: Omit<Msg, 'time'>) {
  msgs = [...msgs, { time: D.nowTime(), ...m }];
}

export function useChat(): ChatSnap {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => snap,
    () => emptySnap,
  );
}

export function resetChat() {
  msgs = [];
  booted = false;
  typing = false;
  emit();
}

const nameOf = (id: string | null) => (getState().children.find((c) => c.id === id) || { name: '' }).name;

// Primeira mensagem da conversa: lembrete do próximo compromisso, se houver.
export function bootChat() {
  if (booted) return;
  booted = true;
  const s = getState();
  const c = currentChild(s);
  const hi = `Oi${s.motherName ? ', ' + s.motherName : ''}!`;
  const ev = c
    ? s.events.filter((e) => e.date >= D.todayISO() && (!e.childId || e.childId === c.id)).sort(D.byWhen)[0]
    : null;
  if (ev) {
    const who = nameOf(ev.childId);
    const when = `${D.weekday(ev.date)}, ${D.brDateShort(ev.date)}${ev.time ? ', às ' + D.timeLabel(ev.time) : ''}`;
    const hasDocs = ev.category === 'saude' && s.docs.some((d) => d.childId === c!.id);
    push({ from: 'bot', text: `${hi} Lembrete: ${when}, ${lcFirst(ev.title)}${who ? ` (${who})` : ''}.${hasDocs ? ' Quer que eu separe os exames guardados?' : ''}` });
  } else {
    push({ from: 'bot', text: `${hi} Eu lembro dos compromissos e acompanho as notas. Escolha uma pergunta abaixo ou escreva a sua.` });
  }
  emit();
}

function answer(q: string): Reply {
  const t = norm(q);
  const s = getState();
  const c = currentChild(s);
  if (!c) return { text: 'Primeiro adicione um filho no app para eu poder ajudar.', link: { label: 'Adicionar filho', href: '/novo-filho/' } };

  if (/\b(oi|ola|bom dia|boa tarde|boa noite)\b/.test(t)) {
    return { text: 'Oi! Pergunte sobre a semana, as notas ou a próxima consulta.' };
  }

  if (/(nota|materia|passar|boletim|falta|media)/.test(t)) {
    const subs = sortSubjects(s.subjects.filter((x) => x.childId === c.id), s.media);
    if (!subs.length) {
      return { text: `Ainda não tenho notas de ${c.name}. Abra o app e digite as notas do boletim.`, link: { label: 'Abrir no app', href: '/escola/' } };
    }
    const lines = subs.map(({ s: x, a }) => {
      if (a.kind === 'final') return `${x.name}: média final ${a.big} (${a.label.toLowerCase()})`;
      if (a.level === 'garantida') return `${x.name}: média já garantida`;
      return `${x.name}: precisa de ${a.big} ${a.where}`;
    });
    return { text: `Para ${c.name} passar de ano:\n${lines.join('\n')}`, link: { label: 'Abrir no app', href: '/escola/' } };
  }

  if (/(consulta|medic|pediatra|exame|saude|vacina)/.test(t)) {
    const e = s.events.filter((x) => x.category === 'saude' && x.date >= D.todayISO() && (!x.childId || x.childId === c.id)).sort(D.byWhen)[0];
    const n = s.docs.filter((d) => d.childId === c.id).length;
    const docs = n ? ` Você tem ${n} ${n === 1 ? 'documento guardado' : 'documentos guardados'}.` : '';
    if (!e) return { text: `Não há consulta marcada para ${c.name}.${docs}`, link: { label: 'Abrir no app', href: '/saude/' } };
    return { text: `A próxima é ${D.longDate(e.date).toLowerCase()}${e.time ? ', às ' + D.timeLabel(e.time) : ''}: ${lcFirst(e.title)}.${docs}`, link: { label: 'Abrir no app', href: '/saude/' } };
  }

  if (/(semana|agenda|compromiss|hoje|amanha|o que tem|proximos)/.test(t)) {
    const list = s.events.filter((e) => e.date >= D.todayISO() && (!e.childId || e.childId === c.id)).sort(D.byWhen).slice(0, 5);
    if (!list.length) return { text: 'Não há nada marcado. Quer adicionar um compromisso?', link: { label: 'Abrir no app', href: '/' } };
    const lines = list.map((e) => `${D.brDateShort(e.date)} (${D.weekday(e.date)}${e.time ? ', ' + D.timeLabel(e.time) : ''}): ${e.title}`);
    return { text: `Próximos compromissos:\n${lines.join('\n')}`, link: { label: 'Abrir no app', href: '/' } };
  }

  return { text: 'Ainda estou aprendendo a responder isso. Tente perguntar sobre a semana, as notas ou a próxima consulta.' };
}

function reply(res: Reply) {
  typing = true;
  emit();
  setTimeout(() => {
    typing = false;
    push({ from: 'bot', ...res });
    emit();
  }, 650);
}

export function ask(text: string) {
  const t = text.trim();
  if (!t || typing) return;
  push({ from: 'me', text: t });
  emit();
  reply(answer(t));
}

// Recebe a foto já reduzida (o seletor de arquivo fica na interface).
export function sendPhoto(photo: string): { saved: boolean } {
  const c = currentChild(getState());
  push({ from: 'me', text: 'Boletim novo', img: photo });
  emit();
  let saved = true;
  if (c) saved = update((st) => { st.boletim[c.id] = { photo, at: D.todayISO() }; });
  reply({
    text: 'Recebi a foto e guardei no app. Por enquanto eu ainda não leio o boletim sozinha: abra o app e digite as notas. A leitura automática não existe nesta versão.',
    link: { label: 'Abrir no app', href: '/escola/' },
  });
  return { saved };
}

export const isTyping = () => typing;
