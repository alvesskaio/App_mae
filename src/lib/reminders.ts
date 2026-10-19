// Repetição dos lembretes da mãe. Para os que repetem, `date` é sempre a próxima vez em que o lembrete vale.
import { addDays, dow, parseISO, todayISO, toISO } from './dates';
import type { Reminder } from './store';

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export const REPEATS: [Repeat, string][] = [
  ['none', 'Não repete'], ['daily', 'Todos os dias'], ['weekly', 'Toda semana'], ['monthly', 'Todo mês'], ['yearly', 'Todo ano'],
];
const DAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAYS: [string, string, number][] = [['D', 'Domingo', 0], ['S', 'Segunda', 1], ['T', 'Terça', 2], ['Q', 'Quarta', 3], ['Q', 'Quinta', 4], ['S', 'Sexta', 5], ['S', 'Sábado', 6]];

export const repeatOf = (r: Pick<Reminder, 'repeat'>): Repeat => r.repeat || 'none';

const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
// Mesmo dia do mês (ou o último, se o mês for mais curto: dia 31 vira 30 ou 28) a n meses de distância.
function monthsLater(iso: string, n: number, day: number): string {
  const d = parseISO(iso);
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return toISO(new Date(first.getFullYear(), first.getMonth(), Math.min(day, daysIn(first.getFullYear(), first.getMonth()))));
}

// Primeira data estritamente depois de `from` em que o lembrete vale.
export function nextAfter(r: Reminder, from: string): string {
  switch (repeatOf(r)) {
    case 'daily': return addDays(from, 1);
    case 'weekly': {
      const days = r.weekdays && r.weekdays.length ? r.weekdays : [dow(r.date)];
      for (let i = 1; i <= 7; i += 1) if (days.includes(dow(addDays(from, i)))) return addDays(from, i);
      return addDays(from, 7);
    }
    case 'monthly': return monthsLater(from, 1, r.day || parseISO(r.date).getDate());
    case 'yearly': {
      const d = parseISO(r.date);
      const y = parseISO(from).getFullYear() + 1;
      return toISO(new Date(y, d.getMonth(), Math.min(r.day || d.getDate(), daysIn(y, d.getMonth()))));
    }
    default: return from;
  }
}

// Primeira data a partir de `date` (inclusive) em que um lembrete semanal cai num dos dias escolhidos.
export function firstWeekly(date: string, weekdays: number[]): string {
  for (let i = 0; i < 7; i += 1) if (weekdays.includes(dow(addDays(date, i)))) return addDays(date, i);
  return date;
}

// Marcar como feito: sem repetição, conclui. Com repetição, passa para a próxima vez (pulando as perdidas),
// e conclui de vez quando a próxima passa da data final.
export function complete(r: Reminder, today = todayISO()): void {
  if (repeatOf(r) === 'none') { r.done = true; return; }
  const next = nextAfter(r, r.date > today ? r.date : today);
  if (r.until && next > r.until) r.done = true;
  else r.date = next;
}

export function repeatLabel(r: Reminder): string {
  switch (repeatOf(r)) {
    case 'daily': return 'Todos os dias';
    case 'weekly': {
      const days = [...(r.weekdays && r.weekdays.length ? r.weekdays : [dow(r.date)])].sort();
      return days.length === 7 ? 'Todos os dias' : `Toda semana: ${days.map((d) => DAY_NAMES[d]).join(', ')}`;
    }
    case 'monthly': return `Todo mês, dia ${r.day || parseISO(r.date).getDate()}`;
    case 'yearly': return 'Todo ano';
    default: return '';
  }
}
