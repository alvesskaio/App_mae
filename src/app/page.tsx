'use client';
// Hoje: compromissos de todos os filhos juntos, com o nome do filho em cada linha.
import { activeChildren, useAppState, visibleEvents, type AppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { fmt, worst } from '@/lib/grades';
import { overdue } from '@/lib/phases';
import { Icons } from '@/components/Icons';
import { EventRow, first, initialOf, subjectsOf, upcoming, useGotoKid } from '@/components/parts';
import { useSheets } from '@/components/sheets';
import Link from 'next/link';

// Primeiro dia de folga da semana em que um filho já nascido ainda não tem consulta marcada.
function freeDay(s: AppState) {
  const today = D.todayISO();
  const kids = activeChildren(s).filter((k) => k.kind === 'born');
  for (let i = 1; i <= 7; i += 1) {
    const d = D.addDays(today, i);
    if (!s.routine.days.includes(D.dow(d))) {
      const k = kids.find((x) => !visibleEvents(s).some((e) => e.childId === x.id && e.category === 'saude' && e.date >= today));
      return k ? { date: d, child: k } : null;
    }
  }
  return null;
}

export default function Hoje() {
  const s = useAppState();
  const sheets = useSheets();
  const goto = useGotoKid();
  const today = D.todayISO();
  const kids = activeChildren(s);

  const header = (
    <header className="top">
      <div>
        <h1 className="h1">{D.greeting()}{s.motherName ? ', ' + first(s.motherName) : ''}</h1>
        <p className="sub">{D.longDate(today)}{kids.length > 1 ? '. Todos os filhos juntos.' : ''}</p>
      </div>
      <Link className="avatar" href="/eu/" aria-label="Minha área">{initialOf(s)}</Link>
    </header>
  );

  if (!kids.length) {
    return (
      <>
        {header}
        <section className="hero"><h2>Vamos começar</h2>
          <p className="l1">Adicione um filho ou uma gestação para organizar saúde, escola e compromissos.</p>
          <button type="button" className="btn light" onClick={sheets.addMenu}>Adicionar</button></section>
      </>
    );
  }

  const all = upcoming(s, null);
  const hoje = all.filter((e) => e.date === today);
  const next = all.filter((e) => e.date > today).slice(0, 5);
  const rank = kids
    .map((k) => ({ k, w: k.kind === 'born' ? worst(subjectsOf(s, k), s.media) : null }))
    .find((x) => x.w);
  const fd = freeDay(s);

  return (
    <>
      {header}

      {kids.filter(overdue).map((k) => (
        <div className="alert soft" key={k.id}>
          <p>A data prevista de {k.name} já passou. Seu bebê nasceu?</p>
          <div className="actions">
            <button type="button" className="btn small" onClick={() => sheets.birthForm(k.id)}>Registrar nascimento</button>
            <button type="button" className="btn line small" onClick={() => sheets.gestacaoForm(k.id)}>Corrigir data</button>
          </div>
        </div>
      ))}

      <h2 className="h2 sp">Hoje</h2>
      {hoje.length
        ? <div className="list">{hoje.map((e) => <EventRow key={e.id} s={s} e={e} tag hot onOpen={sheets.eventView} />)}</div>
        : <p className="muted pad">Nada marcado para hoje.</p>}

      <div className="sec"><h2 className="h2">Próximos dias</h2>
        <button type="button" className="btn line small" onClick={() => sheets.eventForm({ category: 'saude' })}><Icons.plus size={18} />Novo</button></div>
      {next.length
        ? <div className="list">{next.map((e) => <EventRow key={e.id} s={s} e={e} tag onOpen={sheets.eventView} />)}</div>
        : <p className="muted pad">Seus próximos compromissos aparecem aqui.</p>}

      {rank && rank.w && (
        <button type="button" className="alert" onClick={() => goto(rank.k.id, 'escola')}>
          <p>Em {rank.w.s.name}, {rank.k.name} precisa de {fmt(rank.w.a.per)} {rank.w.a.where} para passar de ano.</p>
          <u>Ver todas as matérias</u>
        </button>
      )}

      {fd && (
        <div className="alert peachy">
          <p>Você está de folga {D.onDay(fd.date)}, dia {D.dayNumber(fd.date)}. Dá para marcar uma consulta de {fd.child.name}.</p>
          <button type="button" className="link" onClick={() => sheets.eventForm({ category: 'saude', childId: fd.child.id, date: fd.date })}>Marcar consulta</button>
        </div>
      )}
    </>
  );
}
