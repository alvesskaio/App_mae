// Conversa simulada: mostra como seria falar com o assistente no WhatsApp.
// As respostas são regras simples sobre os dados do app, sem IA e sem WhatsApp de verdade.
// Toda mensagem diz de qual filho é.
import { useSyncExternalStore } from 'react';
import { getState, currentChild, activeChildren, visibleEvents, update, type AppState, type Child } from './store';
import * as D from './dates';
import { sortSubjects } from './grades';
import { phaseOf } from './phases';
import type { Module } from './phases';

// Botão de atalho dentro de uma mensagem: abre um filho (e uma aba), uma rota ou o menu de adicionar.
export type ChatLink = { label: string; kid?: { id: string; tab?: Module }; href?: string; add?: boolean };

export interface Msg {
  from: 'bot' | 'me';
  time: string;
  text?: string;
  img?: string;
  child?: string;
  link?: ChatLink;
  chips?: string[];
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

const nextOf = (s: AppState, k: Child) => visibleEvents(s).filter((e) => e.childId === k.id && e.date >= D.todayISO()).sort(D.byWhen)[0];
const whenOf = (e: { date: string; time: string }) => `${D.weekday(e.date)}, ${D.brDateShort(e.date)}${e.time ? ', às ' + D.timeLabel(e.time) : ''}`;

// Primeiras mensagens: lembrete do próximo compromisso de cada filho, até três.
export function bootChat() {
  if (booted) return;
  booted = true;
  const s = getState();
  const hi = `Oi${s.motherName ? ', ' + s.motherName.trim().split(/\s+/)[0] : ''}!`;
  const items = activeChildren(s).map((k) => ({ k, e: nextOf(s, k) })).filter((x) => x.e).slice(0, 3);
  if (!items.length) {
    push({ from: 'bot', text: `${hi} Eu lembro dos compromissos e acompanho as notas. Escolha uma pergunta abaixo ou escreva a sua.` });
  } else {
    items.forEach(({ k, e }, i) => {
      const hasDocs = e!.category === 'saude' && s.docs.some((d) => d.childId === k.id);
      push({
        from: 'bot', child: k.id,
        text: `${i === 0 ? hi + ' ' : ''}Lembrete: ${whenOf(e!)}, ${lcFirst(e!.title)}.${hasDocs ? ' Quer que eu separe os exames guardados?' : ''}`,
      });
    });
  }
  emit();
}

// Filhos citados na pergunta. Sem nome citado: todos.
function targets(t: string, s: AppState): Child[] {
  const kids = activeChildren(s);
  const named = kids.filter((k) => k.name.trim() && new RegExp(`\\b${norm(k.name.trim().split(/\s+/)[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t));
  return named.length ? named : kids;
}

function answer(q: string): Reply[] {
  const t = norm(q);
  const s = getState();
  const kids = activeChildren(s);
  if (!kids.length) return [{ text: 'Primeiro adicione um filho ou uma gestação no app para eu poder ajudar.', link: { label: 'Adicionar', add: true } }];

  if (/\b(oi|ola|bom dia|boa tarde|boa noite)\b/.test(t)) {
    return [{ text: 'Oi! Pergunte sobre a semana, as notas ou a próxima consulta.' }];
  }
  const list = targets(t, s);

  if (/(nota|materia|passar|boletim|falta|media)/.test(t)) {
    const out: Reply[] = [];
    list.forEach((k) => {
      if (k.kind !== 'born') return;
      const subs = sortSubjects(s.subjects.filter((x) => x.childId === k.id), s.media);
      if (!subs.length) return;
      const lines = subs.map(({ s: x, a }) => {
        if (a.kind === 'final') return `${x.name}: média final ${a.big} (${a.label.toLowerCase()})`;
        if (a.level === 'garantida') return `${x.name}: média já garantida`;
        return `${x.name}: precisa de ${a.big} ${a.where}`;
      });
      out.push({ child: k.id, text: `Para passar de ano:\n${lines.join('\n')}`, link: { label: 'Abrir no app', kid: { id: k.id, tab: 'escola' } } });
    });
    if (out.length) return out;
    return [{ text: 'Ainda não tenho notas de nenhum filho. Abra o app e digite as notas do boletim.' }];
  }

  if (/(consulta|medic|pediatra|exame|saude|vacina|ultrassom|pre.?natal)/.test(t)) {
    return list.map((k) => {
      const e = visibleEvents(s).filter((x) => x.childId === k.id && x.category === 'saude' && x.date >= D.todayISO()).sort(D.byWhen)[0];
      const n = s.docs.filter((d) => d.childId === k.id).length;
      const docs = n ? ` Você tem ${n} ${n === 1 ? 'documento guardado' : 'documentos guardados'}.` : '';
      return {
        child: k.id,
        text: e ? `A próxima é ${whenOf(e)}: ${lcFirst(e.title)}.${docs}` : `Não há consulta marcada.${docs}`,
        link: { label: 'Abrir no app', kid: { id: k.id, tab: 'saude' } },
      };
    });
  }

  if (/(semana|agenda|compromiss|hoje|amanha|o que tem|proximos)/.test(t)) {
    const out: Reply[] = [];
    list.forEach((k) => {
      const ev = visibleEvents(s).filter((e) => e.childId === k.id && e.date >= D.todayISO()).sort(D.byWhen).slice(0, 3);
      if (!ev.length) return;
      out.push({
        child: k.id,
        text: ev.map((e) => `${D.brDateShort(e.date)} (${D.weekday(e.date)}${e.time ? ', ' + D.timeLabel(e.time) : ''}): ${e.title}`).join('\n'),
        link: { label: 'Abrir no app', kid: { id: k.id } },
      });
    });
    if (out.length) return out;
    return [{ text: 'Não há nada marcado. Quer adicionar um compromisso?', link: { label: 'Abrir no app', href: '/' } }];
  }

  if (kids.length > 1) {
    return [{ text: 'Não entendi. Sobre qual filho você quer falar?', chips: kids.map((k) => k.name) }];
  }
  return [{ text: 'Ainda estou aprendendo a responder isso. Tente perguntar sobre a semana, as notas ou a próxima consulta.' }];
}

export function quickQuestions(s: AppState): string[] {
  const q = ['O que tem esta semana?', 'Qual a próxima consulta?'];
  const hasNotes = activeChildren(s).some((k) => k.kind === 'born' && phaseOf(k) === 'escola' && s.subjects.some((x) => x.childId === k.id));
  if (hasNotes) q.splice(1, 0, 'Quanto falta em cada matéria?');
  return q;
}

function reply(list: Reply[]) {
  typing = true;
  emit();
  setTimeout(() => {
    typing = false;
    list.forEach((r) => push({ from: 'bot', ...r }));
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

export const isTyping = () => typing;

// Filho que recebe a foto do boletim: o aberto, se está na fase escola, senão o primeiro que estiver.
export function boletimTarget(): Child | null {
  const s = getState();
  const cur = currentChild(s);
  if (cur && cur.kind === 'born' && phaseOf(cur) === 'escola') return cur;
  return activeChildren(s).find((k) => k.kind === 'born' && phaseOf(k) === 'escola') || null;
}

// Recebe a foto já reduzida (o seletor de arquivo fica na interface).
export function sendPhoto(photo: string, target: Child): { saved: boolean } {
  push({ from: 'me', text: 'Boletim novo', img: photo });
  emit();
  const saved = update((st) => { st.boletim[target.id] = { photo, at: D.todayISO() }; });
  reply([{
    child: target.id,
    text: 'Recebi a foto e guardei no app. Por enquanto eu ainda não leio o boletim sozinha: abra o app e digite as notas. A leitura automática não existe nesta versão.',
    link: { label: 'Abrir no app', kid: { id: target.id, tab: 'escola' } },
  }]);
  return { saved };
}
