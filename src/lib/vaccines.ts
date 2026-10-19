// Caderneta de vacinas. O calendário vem de src/data/vacinas.json (editável, a validar com a pediatra).
import { ageMonths } from './dates';
import type { Child, VaccineShot } from './store';
import calendar from '@/data/vacinas.json';

export interface VaccineDose { id: string; vacina: string; dose: string; mes: number }
export const DOSES: VaccineDose[] = calendar.doses;
export const doseLabel = (d: Pick<VaccineDose, 'vacina' | 'dose'>) => `${d.vacina}, ${d.dose.toLowerCase()}`;
export const monthLabel = (mes: number) => (mes === 0 ? 'ao nascer' : mes === 1 ? 'com 1 mês' : `com ${mes} meses`);

// Lembrete mensal: vale até 1 ano de idade.
export const REMIND_UNTIL_MONTHS = 12;

export interface ChildVaccines {
  pending: VaccineDose[];   // já deveriam ter sido tomadas (idade >= mês da dose) e não constam na caderneta
  next: VaccineDose[];      // as do próximo mês em que há dose
  applied: VaccineShot[];   // caderneta, da mais recente para a mais antiga
  remind: boolean;          // mostra o lembrete mensal (até 1 ano)
}

export function vaccinesOf(c: Child, shots: VaccineShot[]): ChildVaccines {
  const mine = shots.filter((x) => x.childId === c.id);
  const done = new Set(mine.map((x) => x.doseId).filter(Boolean));
  const m = ageMonths(c.birth) ?? 0;
  const open = DOSES.filter((d) => !done.has(d.id)).sort((a, b) => a.mes - b.mes);
  const pending = open.filter((d) => d.mes <= m);
  const later = open.filter((d) => d.mes > m);
  const nextMes = later.length ? later[0].mes : null;
  return {
    pending,
    next: nextMes == null ? [] : later.filter((d) => d.mes === nextMes),
    applied: [...mine].sort((a, b) => b.date.localeCompare(a.date)),
    remind: m <= REMIND_UNTIL_MONTHS,
  };
}
