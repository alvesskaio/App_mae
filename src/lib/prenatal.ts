// Exames do pré-natal por semana de gestação. O catálogo vem de src/data/exames-prenatal.json (rascunho, a validar).
import { weeksOf } from './phases';
import type { Child, PrenatalDone } from './store';
import catalog from '@/data/exames-prenatal.json';

export interface PrenatalExam { id: string; exame: string; de: number; ate: number }
export const EXAMS: PrenatalExam[] = catalog.exames;

export const weeksLabel = (e: PrenatalExam) => (e.de === e.ate ? `semana ${e.de}` : `semanas ${e.de} a ${e.ate}`);

export interface ChildPrenatal {
  weeks: number | null;      // semana atual, pela data prevista (null sem data)
  now: PrenatalExam[];       // a semana atual está na janela do exame
  late: PrenatalExam[];      // a janela já passou e o exame não foi marcado como feito
  next: PrenatalExam[];      // ainda vão chegar, do mais próximo ao mais distante
  done: PrenatalDone[];      // feitos, do mais recente ao mais antigo
}

export function prenatalOf(c: Child, records: PrenatalDone[]): ChildPrenatal {
  const mine = records.filter((r) => r.childId === c.id);
  const doneIds = new Set(mine.map((r) => r.examId));
  const open = EXAMS.filter((e) => !doneIds.has(e.id));
  const weeks = weeksOf(c.dpp);
  const byStart = (a: PrenatalExam, b: PrenatalExam) => a.de - b.de || a.ate - b.ate;
  return {
    weeks,
    now: weeks == null ? [] : open.filter((e) => e.de <= weeks && weeks <= e.ate).sort(byStart),
    late: weeks == null ? [] : open.filter((e) => e.ate < weeks).sort(byStart),
    next: (weeks == null ? open : open.filter((e) => e.de > weeks)).sort(byStart),
    done: [...mine].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
