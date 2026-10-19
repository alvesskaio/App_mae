// Fase do filho: sempre calculada a partir da data prevista do parto ou da data de nascimento.
import { diffDays, todayISO, ageMonths, ageLabel } from './dates';
import type { Child } from './store';

export type Phase = 'gestacao' | 'bebe' | 'primeiros' | 'pre' | 'escola';
export type Module = 'escola' | 'saude';

export const PHASES: Record<Phase, { label: string; modules: Module[] }> = {
  gestacao: { label: 'Gestação', modules: ['saude'] },
  bebe: { label: 'Primeiro ano', modules: ['saude'] },
  primeiros: { label: 'Primeiros passos', modules: ['saude'] },
  pre: { label: 'Pré-escola', modules: ['escola', 'saude'] },
  escola: { label: 'Escola', modules: ['escola', 'saude'] },
};

export function phaseOf(c: Child | null): Phase {
  if (!c) return 'escola';
  if (c.kind === 'pregnancy') return 'gestacao';
  const m = ageMonths(c.birth);
  if (m == null) return 'escola';
  if (m < 12) return 'bebe';
  if (m < 36) return 'primeiros';
  if (m < 72) return 'pre';
  return 'escola';
}

// Semana da gestação (0 a 42) a partir da data prevista. Sem data = null.
export function weeksOf(dpp: string): number | null {
  if (!dpp) return null;
  const left = diffDays(todayISO(), dpp);
  return Math.max(0, Math.min(42, Math.floor((280 - left) / 7)));
}

// Gestação com data prevista que já passou há mais de uma semana.
export const overdue = (c: Child) => c.kind === 'pregnancy' && !!c.dpp && diffDays(todayISO(), c.dpp) < -7;

export function phaseLine(c: Pick<Child, 'kind' | 'dpp' | 'birth'>): string {
  if (c.kind === 'pregnancy') {
    const w = weeksOf(c.dpp);
    return w == null ? 'Gestação, sem data prevista' : `${w} ${w === 1 ? 'semana' : 'semanas'}, gestação`;
  }
  const age = ageLabel(c.birth);
  return `${age ? age + ', ' : ''}${PHASES[phaseOf(c as Child)].label.toLowerCase()}`;
}

// Dicas de organização (não são orientação clínica).
export const TIPS: Record<Phase, string[]> = {
  gestacao: ['Documentos da maternidade', 'Carteirinha do plano de saúde', 'Quem vai acompanhar você'],
  bebe: ['Guardar a caderneta de vacinação', 'Salvar o telefone da pediatra', 'Registrar as consultas de rotina'],
  primeiros: ['Manter a caderneta em dia', 'Salvar o contato da pediatra', 'Guardar os dados de creche ou escola'],
  pre: ['Autorizações de passeio', 'Lista de material', 'Contato da escola'],
  escola: ['Datas de prova', 'Boletim a cada bimestre', 'Reuniões de pais'],
};
export const TIPS_TITLE: Record<Phase, string> = {
  gestacao: 'Para ir organizando',
  bebe: 'Para manter à mão',
  primeiros: 'Para manter à mão',
  pre: 'Para organizar a escola',
  escola: 'Para organizar a escola',
};

// Dicas da aba Saúde. Até os 5 anos valem as mesmas de TIPS; na idade escolar a aba Saúde não deve falar de escola.
export const TIPS_SAUDE: Record<Phase, string[]> = {
  ...TIPS,
  pre: ['Levar a caderneta de vacinação nas consultas', 'Anotar alergias e remédios de uso contínuo', 'Salvar o contato do pediatra'],
  escola: ['Levar a caderneta de vacinação nas consultas', 'Anotar alergias e remédios de uso contínuo', 'Guardar exames e receitas por foto'],
};
export const TIPS_SAUDE_TITLE: Record<Phase, string> = {
  ...TIPS_TITLE,
  pre: 'Para manter à mão',
  escola: 'Para manter à mão',
};
