// Dados guardados só neste aparelho (localStorage). Nada é enviado a servidor.
import { useSyncExternalStore } from 'react';
import { addDays, todayISO, toISO } from './dates';
import type { Note } from './grades';

export interface Child { id: string; name: string; birth: string; school: string; grade: string }
export interface Subject { id: string; childId: string; name: string; notes: Note[] }
export type Category = 'saude' | 'escola' | 'outro';
export interface AppEvent { id: string; childId: string | null; title: string; date: string; time: string; category: Category }
export interface Doc { id: string; childId: string; title: string; date: string; photo: string | null }
export interface Boletim { photo: string; at: string }

export interface AppState {
  v: 1;
  onboarded: boolean;
  motherName: string;
  media: number;
  currentChildId: string | null;
  children: Child[];
  subjects: Subject[];
  events: AppEvent[];
  docs: Doc[];
  boletim: Record<string, Boletim>;
}

const KEY = 'appmae.v1';
const listeners = new Set<() => void>();
let state: AppState | null = null;
let onSaveError: () => void = () => {};

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

function empty(): AppState {
  return {
    v: 1, onboarded: false, motherName: '', media: 6, currentChildId: null,
    children: [], subjects: [], events: [], docs: [], boletim: {},
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 1) return { ...empty(), ...s };
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

export function currentChild(s: AppState = getState()): Child | null {
  return s.children.find((c) => c.id === s.currentChildId) || s.children[0] || null;
}

export function resetAll() {
  state = empty();
  save();
  emit();
}

function yearsAgo(years: number, extraMonths: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - extraMonths);
  return toISO(d);
}

// Dados de exemplo para testar o visual. Datas relativas a hoje.
export function loadExample(motherName?: string) {
  const keep = motherName || getState().motherName || 'Carolina';
  const t = todayISO();
  const helena: Child = { id: uid(), name: 'Helena', birth: yearsAgo(8, 2), school: '', grade: '3º ano' };
  const davi: Child = { id: uid(), name: 'Davi', birth: yearsAgo(3, 4), school: '', grade: '' };
  const subj = (name: string, notes: number[]): Subject => ({
    id: uid(), childId: helena.id, name, notes: [...notes, null, null, null, null].slice(0, 4),
  });
  state = {
    ...empty(),
    onboarded: true, motherName: keep, currentChildId: helena.id,
    children: [helena, davi],
    subjects: [
      subj('História', [4.5, 5.0, 5.5]),
      subj('Matemática', [5.0, 6.0, 5.5]),
      subj('Ciências', [6.0, 5.5, 6.5]),
      subj('Português', [7.5, 7.0, 8.0]),
    ],
    events: [
      { id: uid(), childId: helena.id, title: 'Consulta com a pediatra', date: addDays(t, 2), time: '14:00', category: 'saude' },
      { id: uid(), childId: helena.id, title: 'Prova de Matemática', date: addDays(t, 3), time: '', category: 'escola' },
      { id: uid(), childId: helena.id, title: 'Reunião de pais', date: addDays(t, 5), time: '18:30', category: 'escola' },
      { id: uid(), childId: davi.id, title: 'Consulta de rotina', date: addDays(t, 6), time: '10:00', category: 'saude' },
    ],
    docs: [
      { id: uid(), childId: helena.id, title: 'Hemograma completo', date: addDays(t, -45), photo: null },
      { id: uid(), childId: helena.id, title: 'Exame de vista', date: addDays(t, -150), photo: null },
      { id: uid(), childId: helena.id, title: 'Audiometria', date: addDays(t, -215), photo: null },
      { id: uid(), childId: helena.id, title: 'Carteira de vacinação', date: addDays(t, -280), photo: null },
    ],
  };
  save();
  emit();
}
