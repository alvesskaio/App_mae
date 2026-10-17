'use client';
// Escola: boletim por foto e quanto falta tirar em cada matéria.
import Link from 'next/link';
import { currentChild, useAppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { BIMESTRES, fmt, notesText, sortSubjects } from '@/lib/grades';
import { Icons } from '@/components/Icons';
import { Chips } from '@/components/parts';
import { useSheets } from '@/components/sheets';

export default function Escola() {
  const s = useAppState();
  const sheets = useSheets();
  const c = currentChild(s);
  const label = c ? `${c.name}${c.grade ? ', ' + c.grade : ''}` : '';

  const head = (
    <header className="top"><h1 className="h1 big-title">Escola</h1>{c && <span className="badge lilac">{label}</span>}</header>
  );

  if (!c) {
    return (
      <>
        {head}
        <div className="empty"><p>Adicione um filho para acompanhar as notas.</p><Link className="btn" href="/novo-filho/">Adicionar filho</Link></div>
      </>
    );
  }

  const bol = s.boletim[c.id];
  const subs = sortSubjects(s.subjects.filter((x) => x.childId === c.id), s.media);

  return (
    <>
      {head}
      {s.children.length > 1 && <Chips current={c} />}

      <section className="boletim">
        <div className="grow">
          <p className="t">{bol ? 'Boletim guardado' : 'Boletim'}</p>
          <p className="s">{bol ? `Enviado por foto em ${D.brDateShort(bol.at)}` : 'Fotografe para guardar e digitar as notas'}</p>
        </div>
        {bol && (
          <button type="button" className="thumb-btn" onClick={sheets.boletimView} aria-label="Ver foto do boletim">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="thumb" src={bol.photo} alt="" />
          </button>
        )}
        <button type="button" className="cam" onClick={sheets.boletimFlow} aria-label="Fotografar novo boletim"><Icons.camera size={24} /></button>
      </section>

      <h2 className="h2 sp">O que {c.name} precisa tirar</h2>
      {subs.length === 0 ? (
        <div className="empty"><p>Nenhuma matéria ainda. Adicione as matérias e digite as notas do boletim.</p></div>
      ) : (
        <div className="list">
          {subs.map(({ s: subj, a }) => (
            <button key={subj.id} type="button" className="subj" onClick={() => sheets.subjectForm(subj.id)}>
              <div className="head">
                <div><p className="name">{subj.name}</p><p className="notes">{notesText(subj.notes)}</p></div>
                <div className="right"><p className={`big l-${a.level}`}>{a.big}</p><span className={`lv l-${a.level}`}>{a.label}</span><p className="cap">{a.caption}</p></div>
              </div>
              <div className={`bar l-${a.level}`}><i style={{ width: `${a.fill.toFixed(1)}%` }} /></div>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn line block" style={{ marginTop: 12 }} onClick={() => sheets.subjectForm()}><Icons.plus size={18} />Adicionar matéria</button>
      <p className="foot">Cálculo com média {fmt(s.media)} no ano ({fmt(s.media * BIMESTRES)} pontos nos {BIMESTRES} bimestres). A regra muda conforme a escola. <button type="button" className="link" onClick={sheets.ajustes}>Ajustar média</button></p>
    </>
  );
}
