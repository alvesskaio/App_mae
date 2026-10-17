'use client';
// Início: próximo compromisso, lista dos próximos dias e alerta da matéria mais difícil.
import Link from 'next/link';
import { currentChild, useAppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { fmt, worst } from '@/lib/grades';
import { Icons } from '@/components/Icons';
import { Chips, EventRow, childName, upcoming, whenLine } from '@/components/parts';
import { useSheets } from '@/components/sheets';

export default function Inicio() {
  const s = useAppState();
  const sheets = useSheets();
  const c = currentChild(s);
  const up = c ? upcoming(s, c) : [];
  const hero = up[0];
  const rest = up.slice(1, 4);
  const initial = ((s.motherName || 'M').trim().charAt(0) || 'M').toUpperCase();
  const w = c ? worst(s.subjects.filter((x) => x.childId === c.id), s.media) : null;

  return (
    <>
      <header className="top">
        <div>
          <h1 className="h1">{D.greeting()}{s.motherName ? ', ' + s.motherName : ''}</h1>
          <p className="sub">{D.longDate(D.todayISO())}</p>
        </div>
        <button type="button" className="avatar" onClick={sheets.ajustes} aria-label="Ajustes">{initial}</button>
      </header>
      <Chips current={c} />

      {!c ? (
        <section className="hero"><h2>Vamos começar</h2>
          <p className="l1">Adicione seu primeiro filho para organizar escola, saúde e compromissos.</p>
          <Link className="btn light" href="/novo-filho/">Adicionar filho</Link></section>
      ) : (
        <>
          {!hero ? (
            <section className="hero"><h2>Nada marcado</h2>
              <p className="l1">Marque uma consulta, prova ou reunião e eu aviso no WhatsApp.</p>
              <button type="button" className="btn light" onClick={() => sheets.eventForm('saude')}>Novo compromisso</button></section>
          ) : (
            <section className="hero"><span className="pill">{D.relLabel(hero.date)}</span>
              <h2>{hero.title}</h2>
              <p className="l1">{whenLine(hero)}</p>
              {(() => {
                const l2 = [childName(s, hero.childId), D.reminderLine(hero)].filter(Boolean).join('. ');
                return l2 ? <p className="l2">{l2}</p> : null;
              })()}
            </section>
          )}

          <div className="sec"><h2 className="h2">Próximos dias</h2>
            <button type="button" className="btn line small" onClick={() => sheets.eventForm('escola')}><Icons.plus size={18} />Novo</button></div>
          {rest.length ? (
            <div className="list">{rest.map((e) => <EventRow key={e.id} s={s} e={e} onOpen={sheets.eventView} />)}</div>
          ) : (
            <p className="muted pad">{hero ? 'Mais nada marcado depois deste.' : 'Seus próximos compromissos aparecem aqui.'}</p>
          )}

          {w && (
            <Link className="alert" href="/escola/">
              <p>Em {w.s.name}, {c.name} precisa de {fmt(w.a.per)} {w.a.where} para passar de ano.</p>
              <u>Ver todas as matérias</u>
            </Link>
          )}

          <div className="actions">
            <button type="button" className="btn line grow" onClick={sheets.boletimFlow}><Icons.camera size={18} />Fotografar boletim</button>
            <button type="button" className="btn line grow" onClick={sheets.docForm}><Icons.file size={18} />Guardar exame</button>
          </div>
        </>
      )}
    </>
  );
}
