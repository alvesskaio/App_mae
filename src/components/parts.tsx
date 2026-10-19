'use client';
// Peças compartilhadas entre as telas.
import { useRouter } from 'next/navigation';
import { update, visibleEvents, type AppEvent, type AppState, type Child } from '@/lib/store';
import * as D from '@/lib/dates';
import type { Module } from '@/lib/phases';
import { setFilhoTab } from '@/lib/view';
import { useUi } from './Ui';

export const CAT: Record<string, string> = { saude: 'Saúde', escola: 'Escola', outro: 'Dia a dia' };

// Cor do filho: c0 a c3. Sem filho (compromisso da família), neutra.
export const pal = (c?: Pick<Child, 'color'> | null) => (c ? `c${(c.color || 0) % 4}` : 'c-none');
export const kidOf = (s: AppState, id: string | null) => s.children.find((c) => c.id === id) || null;
export const first = (n: string) => String(n || '').trim().split(/\s+/)[0] || '';
export const initialOf = (s: AppState) => ((s.motherName || 'M').trim().charAt(0) || 'M').toUpperCase();
export const subjectsOf = (s: AppState, c: Child) => s.subjects.filter((x) => x.childId === c.id);
export const whenLine = (e: AppEvent) => `${D.longDate(e.date)}${e.time ? ', às ' + D.timeLabel(e.time) : ''}`;

export function upcoming(s: AppState, c: Child | null, category?: string): AppEvent[] {
  const today = D.todayISO();
  return visibleEvents(s)
    .filter((e) => e.date >= today && (!category || e.category === category) && (!c || !e.childId || e.childId === c.id))
    .sort(D.byWhen);
}

// Abre o perfil de um filho, opcionalmente já numa aba (Escola ou Saúde).
export function useGotoKid() {
  const router = useRouter();
  const { closeSheet } = useUi();
  return (id: string, tab?: Module) => {
    update((st) => { st.currentChildId = id; });
    setFilhoTab(tab || null);
    closeSheet();
    router.push('/filho/');
  };
}

// Linha de compromisso. Com vários filhos na tela, o nome do filho aparece sempre em texto.
export function EventRow({ s, e, tag, hot, onOpen, onNote }: {
  s: AppState; e: AppEvent; tag?: boolean; hot?: boolean; onOpen: (id: string) => void; onNote: (id: string) => void;
}) {
  const k = kidOf(s, e.childId);
  const title = `${e.title}${e.time ? ', ' + D.timeLabel(e.time) : ''}`;
  return (
    <div className={`row${hot ? ' hot' : ''} ${pal(k)}`}>
      <button type="button" className="rowmain" onClick={() => onOpen(e.id)}>
        <div className="tile"><b>{D.dayNumber(e.date)}</b><span>{hot && e.date === D.todayISO() ? 'hoje' : D.weekdayShort(e.date)}</span></div>
        <div className="grow">
          <p className="t">{title}</p>
          <p className="sline">
            {tag
              ? (k ? <span className={`tag ${pal(k)}`}>{k.name}</span> : <span className="s">Família toda</span>)
              : <span className="s">{CAT[e.category] || 'Dia a dia'}</span>}
            {(e.note || e.notePhoto) && <span className="s"> · com nota</span>}
          </p>
        </div>
      </button>
      <button type="button" className="linkish notebtn" aria-label={`Anotar como foi: ${e.title}`} onClick={() => onNote(e.id)}>Anotar</button>
    </div>
  );
}

export function Hero({ s, e, tone }: { s: AppState; e: AppEvent; tone?: 'peach' | 'berry' }) {
  const k = kidOf(s, e.childId);
  const l2 = [k ? k.name : '', D.reminderLine(e)].filter(Boolean).join('. ');
  return (
    <section className={`hero${tone === 'peach' ? ' peach' : ''}`}>
      <span className="pill">{D.relLabel(e.date)}</span>
      <h2>{e.title}</h2>
      <p className="l1">{whenLine(e)}</p>
      {l2 && <p className="l2">{l2}</p>}
    </section>
  );
}
