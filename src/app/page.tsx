'use client';
// Início: panorama geral (hoje, cada filho, a semana, remédios e próximos compromissos), com o nome do filho em cada linha.
import { activeChildren, useAppState, visibleEvents, type AppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { fmt, worst } from '@/lib/grades';
import { overdue, phaseLine } from '@/lib/phases';
import { PRESCRIPTION_NOTICE, dayOf, mlLabel, statusOf } from '@/lib/medicines';
import { Icons } from '@/components/Icons';
import { EventRow, first, initialOf, kidOf, pal, subjectsOf, upcoming, useGotoKid, whenLine } from '@/components/parts';
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
  const next = all.filter((e) => e.date > today).slice(0, 3);
  const meds = s.medicines
    .filter((m) => statusOf(m) === 'active' && kids.some((k) => k.id === m.childId))
    .sort((a, b) => a.time.localeCompare(b.time));
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

      <section className="hero">
        <span className="pill">{hoje.length ? `${hoje.length} ${hoje.length === 1 ? 'compromisso hoje' : 'compromissos hoje'}` : 'Hoje'}</span>
        <h2>{hoje.length ? hoje[0].title : next[0] ? 'Nada marcado para hoje' : 'Dia livre'}</h2>
        <p className="l1">
          {hoje.length ? whenLine(hoje[0])
            : next[0] ? `Próximo: ${next[0].title}, ${D.relLabel(next[0].date).toLowerCase()}` : 'Nenhum compromisso à vista.'}
        </p>
        {(hoje[0] || next[0]) && <p className="l2">{kidOf(s, (hoje[0] || next[0]).childId)?.name || 'Família toda'}{hoje.length > 1 ? `. E mais ${hoje.length - 1} hoje.` : ''}</p>}
      </section>

      {hoje.length > 0 && (
        <>
          <h2 className="h2 sp">Hoje</h2>
          <div className="list">{hoje.map((e) => <EventRow key={e.id} s={s} e={e} tag hot onOpen={sheets.eventView} onNote={sheets.noteForm} />)}</div>
        </>
      )}

      <h2 className="h2 sp">Cada filho</h2>
      <div className="list">
        {kids.map((k) => {
          const e = all.find((x) => x.childId === k.id);
          const n = meds.filter((m) => m.childId === k.id).length;
          const line = [e ? `${D.relLabel(e.date)}: ${e.title}` : 'Nada marcado', n ? `${n} ${n === 1 ? 'remédio' : 'remédios'} em andamento` : ''].filter(Boolean).join('. ');
          return (
            <button key={k.id} type="button" className={`row sel ${pal(k)}`} onClick={() => goto(k.id)}>
              <div className="tile sq"><b>{k.name.charAt(0).toUpperCase()}</b></div>
              <div className="grow"><p className="t">{k.name}</p><p className="s">{phaseLine(k)}</p><p className="s">{line}</p></div>
              <span className="muted"><Icons.chevron size={20} /></span>
            </button>
          );
        })}
      </div>

      {meds.length > 0 && (
        <>
          <h2 className="h2 sp">Remédios de hoje</h2>
          <div className="list">
            {meds.map((m) => {
              const k = kidOf(s, m.childId);
              return (
                <button key={m.id} type="button" className={`row flatrow ${pal(k)}`} onClick={() => sheets.medView(m.id)}>
                  <div className="grow"><p className="t">{m.name}, {mlLabel(m.doseMl)}, às {D.timeLabel(m.time)}</p>
                    <p className="sline">{k && <span className={`tag ${pal(k)}`}>{k.name}</span>}<span className="s"> Dia {dayOf(m)} de {m.days}</span></p></div>
                  <span className="muted"><Icons.chevron size={20} /></span>
                </button>
              );
            })}
          </div>
          <p className="hint pad">{PRESCRIPTION_NOTICE}</p>
        </>
      )}

      <div className="sec"><h2 className="h2">Próximos compromissos</h2>
        <button type="button" className="btn line small" onClick={() => sheets.eventForm({ category: 'saude' })}><Icons.plus size={18} />Novo</button></div>
      {next.length
        ? <div className="list">{next.map((e) => <EventRow key={e.id} s={s} e={e} tag onOpen={sheets.eventView} onNote={sheets.noteForm} />)}</div>
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
