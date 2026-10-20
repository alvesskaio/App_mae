// Remédios prescritos: só registro e contagem de dias. Nunca calcula nem sugere dose.
import { addDays, diffDays, todayISO } from './dates';
import type { Medicine } from './store';

export const PRESCRIPTION_NOTICE = 'Siga a prescrição do pediatra.';

// Último dia do tratamento (o dia de início conta como o primeiro).
export const endOf = (m: Medicine) => addDays(m.start, m.days - 1);

export type MedStatus = 'future' | 'active' | 'done';
export function statusOf(m: Medicine, today = todayISO()): MedStatus {
  if (today < m.start) return 'future';
  return today > endOf(m) ? 'done' : 'active';
}

// Dia atual do tratamento, de 1 a m.days (só faz sentido quando está em andamento).
export const dayOf = (m: Medicine, today = todayISO()) => diffDays(m.start, today) + 1;

// "2,5" ou "2.5" vira número; qualquer outra coisa vira null.
export function parseMl(v: unknown): number | null {
  const n = Number(String(v ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 1000 ? Math.round(n * 100) / 100 : null;
}

export const mlLabel = (n: number) => `${String(n).replace('.', ',')} ml`;
