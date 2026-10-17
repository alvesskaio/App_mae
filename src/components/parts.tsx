'use client';
// Peças compartilhadas entre as telas.
import Link from 'next/link';
import { update, useAppState, type AppEvent, type AppState, type Child } from '@/lib/store';
import * as D from '@/lib/dates';
import { Icons } from './Icons';

export const childName = (s: AppState, id: string | null) => (s.children.find((c) => c.id === id) || { name: '' }).name;

export function upcoming(s: AppState, c: Child | null, category?: string): AppEvent[] {
  const today = D.todayISO();
  return s.events
    .filter((e) => e.date >= today && (!category || e.category === category) && (!c || !e.childId || e.childId === c.id))
    .sort(D.byWhen);
}

export const whenLine = (e: AppEvent) => `${D.longDate(e.date)}${e.time ? ', às ' + D.timeLabel(e.time) : ''}`;

export function Chips({ current }: { current: Child | null }) {
  const s = useAppState();
  if (!s.children.length) return null;
  return (
    <div className="chips">
      {s.children.map((k) => {
        const on = !!current && k.id === current.id;
        const age = D.ageLabel(k.birth);
        return (
          <button key={k.id} type="button" className={`chip${on ? ' on' : ''}`} aria-pressed={on}
            onClick={() => update((st) => { st.currentChildId = k.id; })}>
            {k.name}{age ? ', ' + age : ''}
          </button>
        );
      })}
      <Link className="chip-add" href="/novo-filho/" aria-label="Adicionar filho"><Icons.plus size={20} /></Link>
    </div>
  );
}

export function EventRow({ s, e, onOpen }: { s: AppState; e: AppEvent; onOpen: (id: string) => void }) {
  const who = childName(s, e.childId);
  const sub = [e.time ? D.timeLabel(e.time) : '', who].filter(Boolean).join(', ') || 'Família toda';
  return (
    <button type="button" className="row" onClick={() => onOpen(e.id)}>
      <div className={`tile${e.category === 'saude' ? ' peach' : ''}`}><b>{D.dayNumber(e.date)}</b><span>{D.weekdayShort(e.date)}</span></div>
      <div className="grow"><p className="t">{e.title}</p><p className="s">{sub}</p></div>
    </button>
  );
}
