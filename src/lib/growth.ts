// Carteirinha: só registro e lista. Nenhuma curva, comparação ou interpretação.
import { ageMonths, parseISO } from './dates';
import type { Child, Measure } from './store';

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const DELIVERY: [string, string][] = [['normal', 'Parto normal'], ['cesarea', 'Cesárea']];

// O perímetro cefálico só é medido até os 3 anos.
export const HEAD_UNTIL_MONTHS = 36;
// Até 2 anos mede-se deitado (comprimento); depois, em pé (altura).
const LENGTH_UNTIL_MONTHS = 24;

// "3,250" ou "3.25" vira número; vazio vira null; texto inválido vira undefined.
export function parseDecimal(v: unknown, max: number): number | null | undefined {
  const t = String(v ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 1000) / 1000 : undefined;
}

// Número inteiro entre min e max. Vazio = null; inválido = undefined.
export function parseInt0(v: unknown, min: number, max: number): number | null | undefined {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}
export const parseApgar = (v: unknown) => parseInt0(v, 0, 10);

const num = (n: number) => String(n).replace('.', ',');
export const kgLabel = (n: number) => `${num(n)} kg`;
export const cmLabel = (n: number) => `${num(n)} cm`;

// Idade em meses completos na data da medida (sem data de nascimento = 99, tratado como mais velho).
export function monthsAt(birthISO: string, dateISO: string): number {
  if (!birthISO) return 99;
  const b = parseISO(birthISO);
  const d = parseISO(dateISO);
  let m = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
  if (d.getDate() < b.getDate()) m -= 1;
  return Math.max(0, m);
}

export const heightWord = (months: number) => (months < LENGTH_UNTIL_MONTHS ? 'comprimento' : 'altura');
export const showHead = (c: Child) => (ageMonths(c.birth) ?? 0) <= HEAD_UNTIL_MONTHS;

export const measuresOf = (list: Measure[], c: Child) =>
  list.filter((m) => m.childId === c.id).sort((a, b) => b.date.localeCompare(a.date));

export function measureLine(m: Measure, c: Child): string {
  return [
    m.weightKg != null ? kgLabel(m.weightKg) : '',
    m.heightCm != null ? `${heightWord(monthsAt(c.birth, m.date))} ${cmLabel(m.heightCm)}` : '',
    m.headCm != null ? `perímetro cefálico ${cmLabel(m.headCm)}` : '',
  ].filter(Boolean).join(', ');
}

export function birthLine(c: Child): string {
  const d = DELIVERY.find((x) => x[0] === c.delivery);
  return [
    c.birthWeightKg != null ? kgLabel(c.birthWeightKg) : '',
    c.birthLengthCm != null ? cmLabel(c.birthLengthCm) : '',
    c.gestWeeks != null ? `${c.gestWeeks} semanas` : '',
    d ? d[1].toLowerCase() : '',
  ].filter(Boolean).join(', ');
}
