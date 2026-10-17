'use client';
// Saúde: próxima consulta, consultas marcadas e documentos guardados.
import Link from 'next/link';
import { currentChild, useAppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { Icons } from '@/components/Icons';
import { Chips, EventRow, childName, upcoming, whenLine } from '@/components/parts';
import { useSheets } from '@/components/sheets';

export default function Saude() {
  const s = useAppState();
  const sheets = useSheets();
  const c = currentChild(s);

  const head = (
    <header className="top"><h1 className="h1 big-title">Saúde</h1>
      {c && <span className="badge peach">{c.name}{D.ageLabel(c.birth) ? ', ' + D.ageLabel(c.birth) : ''}</span>}</header>
  );

  if (!c) {
    return (
      <>
        {head}
        <div className="empty"><p>Adicione um filho para guardar consultas e exames.</p><Link className="btn" href="/novo-filho/">Adicionar filho</Link></div>
      </>
    );
  }

  const next = upcoming(s, c, 'saude');
  const first = next[0];
  const docs = s.docs.filter((d) => d.childId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const l2 = first ? [childName(s, first.childId), D.reminderLine(first)].filter(Boolean).join('. ') : '';

  return (
    <>
      {head}
      {s.children.length > 1 && <Chips current={c} />}

      {first ? (
        <section className="hero peach"><p className="kicker">Próxima consulta</p><h2>{first.title}</h2>
          <p className="l1">{whenLine(first)}</p>
          {l2 && <p className="note"><Icons.chat size={20} /><span>{l2}</span></p>}</section>
      ) : (
        <section className="hero peach"><h2>Nenhuma consulta marcada</h2>
          <p className="l1">Marque a próxima e eu aviso no WhatsApp.</p>
          <button type="button" className="btn" onClick={() => sheets.eventForm('saude')}>Marcar consulta</button></section>
      )}

      <div className="sec"><h2 className="h2">Consultas</h2>
        <button type="button" className="btn line small" onClick={() => sheets.eventForm('saude')}><Icons.plus size={18} />Marcar</button></div>
      {next.length > 1 ? (
        <div className="list">{next.slice(1).map((e) => <EventRow key={e.id} s={s} e={e} onOpen={sheets.eventView} />)}</div>
      ) : (
        <p className="muted pad">{next.length ? 'Nenhuma outra consulta marcada.' : 'As consultas marcadas aparecem aqui.'}</p>
      )}

      <div className="sec"><h2 className="h2">Documentos guardados</h2>
        <button type="button" className="btn small" onClick={sheets.docForm}><Icons.camera size={18} />Guardar</button></div>
      {docs.length ? (
        <div className="list">
          {docs.map((d) => (
            <button key={d.id} type="button" className="row" onClick={() => sheets.docView(d.id)}>
              <div className="tile sq peach"><Icons.file size={22} /></div>
              <div className="grow"><p className="t">{d.title}</p><p className="s">{D.brDate(d.date)}{d.photo ? ', com foto' : ''}</p></div>
              <span className="muted"><Icons.chevron size={20} /></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted pad">Guarde exames, receitas e a carteira de vacinação por foto.</p>
      )}
    </>
  );
}
