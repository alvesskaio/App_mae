// Regras de nota. Média anual = soma das notas dos bimestres / número de bimestres.
// Exemplo: média 6,0 em 4 bimestres exige 24 pontos no total. A regra muda de escola para escola.

export const BIMESTRES = 4;

export const fmt = (n) => n.toFixed(1).replace('.', ',');

// Converte o texto digitado em nota. Vazio = null, inválido = NaN.
export function parseNote(value) {
  if (value == null) return null;
  const t = String(value).trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : NaN;
}

export function notesText(notes) {
  const list = notes.filter((n) => n != null).map(fmt);
  if (list.length === 0) return 'Sem notas ainda';
  if (list.length === 1) return `Nota ${list[0]}`;
  return `Notas ${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

// Analisa uma matéria. notes tem sempre 4 posições (número ou null).
export function analyze(notes, media = 6) {
  const entered = notes.filter((n) => n != null);
  const missing = notes.map((n, i) => (n == null ? i : -1)).filter((i) => i >= 0);
  const sum = entered.reduce((a, b) => a + b, 0);
  const target = media * BIMESTRES;
  const fill = Math.max(0, Math.min(100, (sum / target) * 100));

  if (missing.length === 0) {
    const avg = sum / BIMESTRES;
    const ok = sum >= target - 1e-9;
    return {
      kind: 'final', level: ok ? 'aprovada' : 'abaixo', label: ok ? 'Aprovada' : 'Abaixo da média',
      big: fmt(avg), caption: 'média final', need: 0, per: 0, fill,
    };
  }

  const need = target - sum;
  const per = need / missing.length;
  let level;
  if (need <= 1e-9) level = 'garantida';
  else if (per > 10) level = 'impossivel';
  else if (per > 8) level = 'dificil';
  else if (per > 6) level = 'atencao';
  else level = 'tranquilo';

  const labels = { garantida: 'Garantida', impossivel: 'Não fecha', dificil: 'Difícil', atencao: 'Atenção', tranquilo: 'Tranquilo' };
  const where = missing.length === 1 ? `no ${missing[0] + 1}º bimestre` : `em cada um dos ${missing.length} bimestres`;
  return {
    kind: 'pending', level, label: labels[level],
    big: level === 'garantida' ? 'Ok' : fmt(per),
    caption: level === 'garantida' ? 'média já garantida' : where,
    need, per, where, fill,
  };
}

const ORDER = { impossivel: 0, dificil: 1, atencao: 2, tranquilo: 3, garantida: 4, abaixo: 5, aprovada: 6 };

// Ordena da matéria mais difícil para a mais tranquila.
export function sortSubjects(subjects, media) {
  return subjects
    .map((s) => ({ s, a: analyze(s.notes, media) }))
    .sort((x, y) => ORDER[x.a.level] - ORDER[y.a.level] || y.a.per - x.a.per || x.s.name.localeCompare(y.s.name, 'pt-BR'));
}

// Matéria que mais preocupa (só se for difícil, atenção ou impossível).
export function worst(subjects, media) {
  const first = sortSubjects(subjects, media)[0];
  if (!first) return null;
  return ['impossivel', 'dificil', 'atencao'].includes(first.a.level) ? first : null;
}
