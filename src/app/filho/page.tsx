'use client';
// Tela do filho: muda com a fase (gestação, bebê, pré-escola, escola).
import { currentChild, useAppState, type AppState, type Child } from '@/lib/store';
import * as D from '@/lib/dates';
import { fmt, notesText, sortSubjects, BIMESTRES, type Ranked } from '@/lib/grades';
import { PHASES, TIPS, TIPS_TITLE, overdue, phaseLine, phaseOf, weeksOf, type Phase } from '@/lib/phases';
import { setFilhoTab, useFilhoTab } from '@/lib/view';
import type { Subject } from '@/lib/store';
import { Icons, MoreIcon } from '@/components/Icons';
import { EventRow, Hero, subjectsOf, upcoming } from '@/components/parts';
import { useSheets } from '@/components/sheets';

type Sheets = ReturnType<typeof useSheets>;

function Docs({ s, c, sheets }: { s: AppState; c: Child; sheets: Sheets }) {
  const docs = s.docs.filter((d) => d.childId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="sec"><h2 className="h2">Documentos guardados</h2>
        <button type="button" className="btn small" onClick={sheets.docForm}><Icons.camera size={18} />Guardar</button></div>
      {docs.length ? (
        <div className="list">
          {docs.map((d) => (
            <button type="button" className="row" key={d.id} onClick={() => sheets.docView(d.id)}>
              <div className="tile sq peach"><Icons.file size={22} /></div>
              <div className="grow"><p className="t">{d.title}</p><p className="s">{D.brDate(d.date)}{d.photo ? ', com foto' : ''}</p></div>
              <span className="muted"><Icons.chevron size={20} /></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted pad">{c.kind === 'pregnancy' ? 'Guarde pedidos de exame e resultados por foto.' : 'Guarde exames, receitas e a carteira de vacinação por foto.'}</p>
      )}
    </>
  );
}

function Tips({ ph }: { ph: Phase }) {
  return (
    <div className="note-lilac big">
      <p className="b">{TIPS_TITLE[ph]}</p>
      <ul>{TIPS[ph].map((t) => <li key={t}>{t}</li>)}</ul>
      <p className="small">Isto é organização. Para dúvidas de saúde, fale com {ph === 'gestacao' ? 'sua médica' : 'o médico'}.</p>
    </div>
  );
}

function Saude({ s, c, ph, sheets }: { s: AppState; c: Child; ph: Phase; sheets: Sheets }) {
  const next = upcoming(s, c, 'saude');
  const warm = ph === 'gestacao' || ph === 'bebe' || ph === 'primeiros';
  const kind = ph === 'gestacao' ? 'Consultas e exames' : warm ? 'Consultas e vacinas' : 'Consultas';
  const rest = next.slice(1);
  const w = weeksOf(c.dpp);
  return (
    <>
      {next[0] ? <Hero s={s} e={next[0]} tone={warm ? 'berry' : 'peach'} /> : (
        <section className={`hero${warm ? '' : ' peach'}`}><h2>Nenhuma consulta marcada</h2>
          <p className="l1">Marque a próxima e eu aviso no WhatsApp.</p>
          <button type="button" className={`btn${warm ? ' light' : ''}`} onClick={() => sheets.eventForm({ category: 'saude' })}>Marcar consulta</button></section>
      )}

      {c.kind === 'pregnancy' && (
        <>
          <div className="card flat">
            <div className="between">
              <p className="weeks">{w == null ? 'Sem data prevista' : `${w} ${w === 1 ? 'semana' : 'semanas'}`}</p>
              <button type="button" className="link small" onClick={() => sheets.gestacaoForm(c.id)}>
                {c.dpp ? `Data prevista ${D.brDateShort(c.dpp)}` : 'Informar data prevista'}
              </button>
            </div>
            {w != null && (
              <>
                <div className="prog" role="img" aria-label={`${w} de 40 semanas`}><i style={{ width: `${Math.min(100, (w / 40) * 100).toFixed(1)}%` }} /></div>
                <p className="hint">{w >= 40 ? 'Chegou perto da data prevista.' : `Faltam cerca de ${40 - w} semanas.`} A data pode mudar com o ultrassom.</p>
              </>
            )}
            {c.twins && <p className="hint">Gêmeos. Cada bebê terá seu perfil depois do nascimento.</p>}
          </div>
          {overdue(c) && (
            <div className="alert soft"><p>A data prevista já passou. Seu bebê nasceu?</p>
              <div className="actions"><button type="button" className="btn small" onClick={() => sheets.birthForm(c.id)}>Registrar nascimento</button></div></div>
          )}
        </>
      )}

      <div className="sec"><h2 className="h2">{kind}</h2>
        <button type="button" className="btn line small" onClick={() => sheets.eventForm({ category: 'saude' })}><Icons.plus size={18} />Novo</button></div>
      {rest.length
        ? <div className="list">{rest.map((e) => <EventRow key={e.id} s={s} e={e} onOpen={sheets.eventView} />)}</div>
        : <p className="muted pad">{next.length ? 'Nenhum outro compromisso de saúde.' : 'Os compromissos de saúde aparecem aqui.'}</p>}
      <Docs s={s} c={c} sheets={sheets} />
      <Tips ph={ph} />
    </>
  );
}

function SubjectCard({ r, onOpen }: { r: Ranked<Subject>; onOpen: (id: string) => void }) {
  const { s: subj, a } = r;
  return (
    <button type="button" className="subj" onClick={() => onOpen(subj.id)}>
      <div className="head">
        <div><p className="name">{subj.name}</p><p className="notes">{notesText(subj.notes)}</p></div>
        <div className="right"><p className={`big l-${a.level}`}>{a.big}</p><span className={`lv l-${a.level}`}>{a.label}</span><p className="cap">{a.caption}</p></div>
      </div>
      <div className={`bar l-${a.level}`}><i style={{ width: `${a.fill.toFixed(1)}%` }} /></div>
    </button>
  );
}

function Escola({ s, c, ph, sheets }: { s: AppState; c: Child; ph: Phase; sheets: Sheets }) {
  const next = upcoming(s, c, 'escola');
  const rest = next.slice(1);
  const bol = s.boletim[c.id];
  const subs = sortSubjects(subjectsOf(s, c), s.media);
  return (
    <>
      {next[0] ? <Hero s={s} e={next[0]} tone="peach" /> : (
        <section className="hero peach"><h2>Nada da escola marcado</h2>
          <p className="l1">Anote provas, passeios e reuniões e eu aviso no WhatsApp.</p>
          <button type="button" className="btn" onClick={() => sheets.eventForm({ category: 'escola' })}>Novo compromisso</button></section>
      )}
      <div className="sec"><h2 className="h2">Calendário da escola</h2>
        <button type="button" className="btn line small" onClick={() => sheets.eventForm({ category: 'escola' })}><Icons.plus size={18} />Novo</button></div>
      {rest.length
        ? <div className="list">{rest.map((e) => <EventRow key={e.id} s={s} e={e} onOpen={sheets.eventView} />)}</div>
        : <p className="muted pad">{next.length ? 'Nenhum outro compromisso da escola.' : 'Os compromissos da escola aparecem aqui.'}</p>}

      {ph === 'pre' ? (
        <div className="note-plain">Notas e boletim só aparecem a partir dos 6 anos.</div>
      ) : (
        <>
          <section className="boletim">
            <div className="grow"><p className="t">{bol ? 'Boletim guardado' : 'Boletim'}</p>
              <p className="s">{bol ? `Enviado por foto em ${D.brDateShort(bol.at)}` : 'Fotografe para guardar e digitar as notas'}</p></div>
            {bol && (
              <button type="button" className="thumb-btn" aria-label="Ver foto do boletim" onClick={sheets.boletimView}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="thumb" src={bol.photo} alt="" />
              </button>
            )}
            <button type="button" className="cam" aria-label="Fotografar novo boletim" onClick={sheets.boletimFlow}><Icons.camera size={24} /></button>
          </section>
          <h2 className="h2 sp">O que {c.name} precisa tirar</h2>
          {subs.length
            ? <div className="list">{subs.map((r) => <SubjectCard key={r.s.id} r={r} onOpen={sheets.subjectForm} />)}</div>
            : <div className="empty"><p>Nenhuma matéria ainda. Adicione as matérias e digite as notas do boletim.</p></div>}
          <button type="button" className="btn line block" style={{ marginTop: 12 }} onClick={() => sheets.subjectForm()}><Icons.plus size={18} />Adicionar matéria</button>
          <p className="foot">Cálculo com média {fmt(s.media)} no ano ({fmt(s.media * BIMESTRES)} pontos nos {BIMESTRES} bimestres). A regra muda conforme a escola. <button type="button" className="link" onClick={sheets.routineForm}>Ajustar média</button></p>
        </>
      )}
      <Tips ph={ph} />
    </>
  );
}

export default function Filho() {
  const s = useAppState();
  const sheets = useSheets();
  const viewTab = useFilhoTab();
  const c = currentChild(s);

  if (!c) {
    return (
      <>
        <header className="top"><h1 className="h1">Filhos</h1></header>
        <div className="empty"><p>Adicione um filho ou uma gestação para começar.</p>
          <button type="button" className="btn" onClick={sheets.addMenu}>Adicionar</button></div>
      </>
    );
  }

  const ph = phaseOf(c);
  const mods = PHASES[ph].modules;
  const tab = viewTab && mods.includes(viewTab) ? viewTab : mods[0];

  return (
    <>
      <header className="top">
        <button type="button" className="who" aria-label={`Trocar de filho. Agora: ${c.name}`} onClick={sheets.seletor}>
          <h1 className="h1">{c.name}</h1><Icons.down size={22} />
        </button>
        <button type="button" className="avatar sm" aria-label="Mais opções" onClick={sheets.filhoMenu}><MoreIcon size={22} /></button>
      </header>
      <p className="sub tight-sub">{phaseLine(c)}</p>

      {mods.length > 1 && (
        <div className="seg" role="tablist" aria-label={`Seções de ${c.name}`}>
          {mods.map((m) => (
            <button key={m} type="button" role="tab" className={`chip${m === tab ? ' on' : ''}`} aria-selected={m === tab} onClick={() => setFilhoTab(m)}>
              {m === 'escola' ? 'Escola' : 'Saúde'}
            </button>
          ))}
        </div>
      )}
      {tab === 'escola' ? <Escola s={s} c={c} ph={ph} sheets={sheets} /> : <Saude s={s} c={c} ph={ph} sheets={sheets} />}
    </>
  );
}
