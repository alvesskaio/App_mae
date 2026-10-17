// Dados guardados só neste aparelho (localStorage). Nada é enviado a servidor.
import { addDays, todayISO, toISO } from './dates.js';

const KEY = 'appmae.v1';
let state = load();
let onSaveError = () => {};
const listeners = new Set();

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

function empty() {
  return {
    v: 1, onboarded: false, motherName: '', media: 6, currentChildId: null,
    children: [], subjects: [], events: [], docs: [], boletim: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 1) return { ...empty(), ...s };
    }
  } catch (e) { /* sem acesso ao armazenamento: segue em memória */ }
  return empty();
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export const getState = () => state;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const setSaveErrorHandler = (fn) => { onSaveError = fn; };

// Altera o estado, salva e avisa as telas. Retorna false se não coube no armazenamento.
export function update(fn) {
  fn(state);
  const ok = save();
  if (!ok) onSaveError();
  listeners.forEach((l) => l());
  return ok;
}

export function currentChild(s = state) {
  return s.children.find((c) => c.id === s.currentChildId) || s.children[0] || null;
}

export function resetAll() {
  state = empty();
  save();
  listeners.forEach((l) => l());
}

function yearsAgo(years, extraMonths) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - extraMonths);
  return toISO(d);
}

// Dados de exemplo para testar o visual. Datas relativas a hoje.
export function loadExample(motherName) {
  const keep = motherName || state.motherName || 'Carolina';
  const t = todayISO();
  const helena = { id: uid(), name: 'Helena', birth: yearsAgo(8, 2), school: '', grade: '3º ano' };
  const davi = { id: uid(), name: 'Davi', birth: yearsAgo(3, 4), school: '', grade: '' };
  const subj = (name, notes) => ({ id: uid(), childId: helena.id, name, notes: [...notes, null, null, null, null].slice(0, 4) });
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
  listeners.forEach((l) => l());
}
