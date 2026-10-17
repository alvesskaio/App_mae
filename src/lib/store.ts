// Dados guardados só neste aparelho (localStorage). Nada é enviado a servidor.
import { useSyncExternalStore } from 'react';
import { addDays, todayISO, toISO } from './dates';
import type { Note } from './grades';

export type Kind = 'born' | 'pregnancy';
export interface Child {
  id: string; kind: Kind; status: 'active' | 'ended'; color: number;
  name: string; birth: string; dpp: string; twins: boolean; school: string; grade: string;
  endedAt?: string; fromPregnancy?: boolean; twinOf?: string;
}
export interface Subject { id: string; childId: string; name: string; notes: Note[] }
export type Category = 'saude' | 'escola' | 'outro';
export interface AppEvent { id: string; childId: string | null; title: string; date: string; time: string; category: Category }
export interface Doc { id: string; childId: string; title: string; date: string; photo: string | null }
export interface Boletim { photo: string; at: string }

export type OnbStep = 'welcome' | 'consent' | 'e1' | 'e2' | 'e3';
export interface OnbKid { id: string; name: string; birth: string }
export interface Onb { step: OnbStep; pregnant: 'sim' | 'nao' | 'pular' | null; dpp: string; kids: OnbKid[] }
export interface Routine { days: number[]; start: string; end: string; vacation: string; whatsapp: string; silence: boolean }
export interface Consent { health: boolean; legal: boolean; stats: boolean; at: string | null }

export interface AppState {
  v: 2;
  onboarded: boolean;
  onb: Onb;
  consent: Consent;
  motherName: string;
  media: number;
  routine: Routine;
  currentChildId: string | null;
  children: Child[];
  subjects: Subject[];
  events: AppEvent[];
  docs: Doc[];
  boletim: Record<string, Boletim>;
}

const KEY = 'appmae.v2';
const OLD_KEY = 'appmae.v1';
const listeners = new Set<() => void>();
let state: AppState | null = null;
let onSaveError: () => void = () => {};

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const emptyOnb = (): Onb => ({ step: 'welcome', pregnant: null, dpp: '', kids: [] });
const emptyRoutine = (): Routine => ({ days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', vacation: '', whatsapp: '', silence: true });
const emptyConsent = (): Consent => ({ health: false, legal: false, stats: false, at: null });

function empty(): AppState {
  return {
    v: 2, onboarded: false, onb: emptyOnb(), consent: emptyConsent(), motherName: '', media: 6,
    routine: emptyRoutine(), currentChildId: null,
    children: [], subjects: [], events: [], docs: [], boletim: {},
  };
}

function normalize(s: Partial<AppState>): AppState {
  const e = empty();
  return {
    ...e, ...s,
    onb: { ...e.onb, ...(s.onb || {}) },
    consent: { ...e.consent, ...(s.consent || {}) },
    routine: { ...e.routine, ...(s.routine || {}) },
  } as AppState;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 2) return normalize(s);
    }
    // Versão de teste anterior: filhos já nascidos, com consentimento dado no cadastro de cada um.
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      if (o && o.v === 1) {
        const kids = (o.children || []).map((c: Child, i: number) => ({ ...c, kind: 'born', status: 'active', color: i % 4 }));
        return normalize({
          ...o, v: 2, children: kids,
          consent: { health: true, legal: true, stats: false, at: todayISO() },
        });
      }
    }
  } catch { /* sem acesso ao armazenamento: segue em memória */ }
  return empty();
}

function save(): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// O estado só é lido do navegador no cliente. No servidor (exportação estática) é sempre vazio.
export function getState(): AppState {
  if (!state) state = typeof window === 'undefined' ? empty() : load();
  return state;
}

const serverState = empty();
const emit = () => listeners.forEach((l) => l());

export const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const setSaveErrorHandler = (fn: () => void) => { onSaveError = fn; };

// Hook: devolve o estado atual e re-renderiza quando ele muda.
export const useAppState = (): AppState => useSyncExternalStore(subscribe, getState, () => serverState);

// Altera o estado, salva e avisa as telas. Retorna false se não coube no armazenamento.
export function update(fn: (s: AppState) => void): boolean {
  const next = getState();
  fn(next);
  state = { ...next }; // nova identidade para o React perceber a mudança
  const ok = save();
  if (!ok) onSaveError();
  emit();
  return ok;
}

// Guarda sem redesenhar a tela (rascunho de formulário).
export function quiet(fn: (s: AppState) => void) {
  fn(getState());
  save();
}

export const activeChildren = (s: AppState = getState()) => s.children.filter((c) => c.status !== 'ended');
export const endedChildren = (s: AppState = getState()) => s.children.filter((c) => c.status === 'ended');

export function currentChild(s: AppState = getState()): Child | null {
  const list = activeChildren(s);
  return list.find((c) => c.id === s.currentChildId) || list[0] || null;
}

// Compromissos de quem está sendo acompanhado. Filhos encerrados não aparecem em lugar nenhum.
export function visibleEvents(s: AppState = getState()): AppEvent[] {
  const ids = new Set(activeChildren(s).map((c) => c.id));
  return s.events.filter((e) => !e.childId || ids.has(e.childId));
}

// Cria um filho (nascido ou gestação) dentro de uma chamada update().
export function addChild(st: AppState, data: Partial<Child>): Child {
  const c: Child = {
    id: uid(), kind: 'born', status: 'active', color: st.children.length % 4,
    name: '', birth: '', dpp: '', twins: false, school: '', grade: '', ...data,
  };
  st.children.push(c);
  return c;
}

export function removeChild(st: AppState, id: string) {
  st.children = st.children.filter((x) => x.id !== id);
  st.subjects = st.subjects.filter((x) => x.childId !== id);
  st.events = st.events.filter((x) => x.childId !== id);
  st.docs = st.docs.filter((x) => x.childId !== id);
  delete st.boletim[id];
  if (st.currentChildId === id) {
    const next = activeChildren(st)[0];
    st.currentChildId = next ? next.id : null;
  }
}

export function resetAll() {
  state = empty();
  save();
  emit();
}

function ago(years: number, extraMonths: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - extraMonths);
  return toISO(d);
}

// Dados de exemplo para testar o visual. Datas relativas a hoje.
export function loadExample(motherName?: string) {
  const keep = motherName || getState().motherName || 'Carolina';
  const t = todayISO();
  const mk = (i: number, data: Partial<Child>): Child => ({
    id: uid(), kind: 'born', status: 'active', color: i, name: '', birth: '', dpp: '', twins: false, school: '', grade: '', ...data,
  });
  const bebe = mk(0, { kind: 'pregnancy', name: `Bebê da ${keep.split(/\s+/)[0]}`, dpp: addDays(t, 112) });
  const lia = mk(1, { name: 'Lia', birth: ago(0, 5) });
  const davi = mk(2, { name: 'Davi', birth: ago(3, 4) });
  const helena = mk(3, { name: 'Helena', birth: ago(8, 2), grade: '3º ano' });
  const subj = (name: string, notes: number[]): Subject => ({
    id: uid(), childId: helena.id, name, notes: [...notes, null, null, null, null].slice(0, 4),
  });
  const ev = (c: Child, title: string, days: number, time: string, category: Category): AppEvent =>
    ({ id: uid(), childId: c.id, title, date: addDays(t, days), time, category });
  state = {
    ...empty(),
    onboarded: true, motherName: keep, currentChildId: helena.id,
    consent: { health: true, legal: true, stats: false, at: t },
    routine: { ...emptyRoutine(), whatsapp: '(21) 98888-1234' },
    children: [bebe, lia, davi, helena],
    subjects: [
      subj('História', [4.5, 5.0, 5.5]),
      subj('Matemática', [5.0, 6.0, 5.5]),
      subj('Ciências', [6.0, 5.5, 6.5]),
      subj('Português', [7.5, 7.0, 8.0]),
    ],
    events: [
      ev(bebe, 'Ultrassom morfológico', 0, '10:00', 'saude'),
      ev(bebe, 'Consulta de pré-natal', 9, '09:00', 'saude'),
      ev(helena, 'Consulta com a pediatra', 2, '14:00', 'saude'),
      ev(helena, 'Prova de Matemática', 3, '', 'escola'),
      ev(davi, 'Passeio da escola', 4, '08:00', 'escola'),
      ev(helena, 'Reunião de pais', 5, '18:30', 'escola'),
      ev(lia, 'Vacina da Lia', 5, '09:00', 'saude'),
      ev(lia, 'Consulta de rotina', 24, '15:00', 'saude'),
      ev(davi, 'Reunião de pais', 11, '18:00', 'escola'),
    ],
    docs: [
      { id: uid(), childId: bebe.id, title: 'Pedido de exames do pré-natal', date: addDays(t, -10), photo: null },
      { id: uid(), childId: helena.id, title: 'Hemograma completo', date: addDays(t, -45), photo: null },
      { id: uid(), childId: helena.id, title: 'Exame de vista', date: addDays(t, -150), photo: null },
      { id: uid(), childId: helena.id, title: 'Carteira de vacinação', date: addDays(t, -280), photo: null },
    ],
  };
  save();
  emit();
}
