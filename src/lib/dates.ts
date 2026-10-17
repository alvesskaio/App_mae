// Funções de data. Datas são guardadas como texto "AAAA-MM-DD" para evitar problemas de fuso.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const diffDays = (aISO: string, bISO: string) =>
  Math.round((parseISO(bISO).getTime() - parseISO(aISO).getTime()) / 86400000);

export const weekday = (iso: string) => DIAS[parseISO(iso).getDay()];
export const weekdayShort = (iso: string) => DIAS_CURTO[parseISO(iso).getDay()];
export const dayNumber = (iso: string) => parseISO(iso).getDate();

export function longDate(iso: string): string {
  const d = parseISO(iso);
  return `${cap(DIAS[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function brDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function brDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function timeLabel(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function relLabel(iso: string): string {
  const n = diffDays(todayISO(), iso);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n > 1) return `Em ${n} dias`;
  return 'Já passou';
}

export function ageLabel(birthISO: string): string {
  if (!birthISO) return '';
  const b = parseISO(birthISO);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '';
  if (months < 24) return months <= 1 ? `${months} mês` : `${months} meses`;
  return `${Math.floor(months / 12)} anos`;
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const byWhen = (a: { date: string; time?: string }, b: { date: string; time?: string }) =>
  (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99'));

// Linha de lembrete simulada: o aviso vai no dia anterior às 18h.
export function reminderLine(ev: { date: string }): string {
  const n = diffDays(todayISO(), ev.date);
  if (n < 0) return '';
  if (n === 0) return 'É hoje.';
  if (n === 1) {
    return new Date().getHours() < 18
      ? 'Aviso no WhatsApp hoje, às 18h.'
      : 'Aviso no WhatsApp enviado hoje, às 18h.';
  }
  return `Aviso no WhatsApp ${weekday(addDays(ev.date, -1))}, às 18h.`;
}
