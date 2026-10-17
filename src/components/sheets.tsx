'use client';
// Folhas que sobem da parte de baixo: formulários e detalhes.
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { currentChild, getState, loadExample, resetAll, uid, update, useAppState, type Category } from '@/lib/store';
import * as D from '@/lib/dates';
import { BIMESTRES, fmt, parseNote, type Note } from '@/lib/grades';
import { shrink } from '@/lib/photo';
import { resetChat } from '@/lib/chat';
import { ArmButton, Err, invalid, useUi } from './Ui';

const CATS: [Category, string][] = [['saude', 'Saúde'], ['escola', 'Escola'], ['outro', 'Outro']];
const catLabel = (c: string) => (CATS.find((x) => x[0] === c) || CATS[2])[1];
const nameOf = (id: string | null) => (getState().children.find((c) => c.id === id) || { name: 'Família toda' }).name;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) || '');

type Errs = Record<string, string>;

/* ---------- Compromissos ---------- */
function EventForm({ category }: { category?: Category }) {
  const { closeSheet, toast } = useUi();
  const s = useAppState();
  const c = currentChild(s);
  const [errs, setErrs] = useState<Errs>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = str(fd, 'title').trim();
    const date = str(fd, 'date');
    const next: Errs = {};
    if (!title) next.title = 'Digite o nome do compromisso.';
    if (!ISO.test(date)) next.date = 'Escolha a data.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      st.events.push({
        id: uid(), title, date, time: str(fd, 'time'),
        childId: str(fd, 'child') || null, category: (str(fd, 'category') || 'outro') as Category,
      });
    });
    closeSheet();
    toast('Compromisso salvo.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="e-title">Compromisso</label>
        <input className="inp round" id="e-title" name="title" maxLength={80} autoComplete="off" placeholder="Ex.: Consulta com a pediatra" aria-invalid={invalid(errs.title)} />
        <Err msg={errs.title} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="e-cat">Tipo</label>
          <select className="inp round" id="e-cat" name="category" defaultValue={category || 'saude'}>
            {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div className="field"><label htmlFor="e-child">Para quem</label>
          <select className="inp round" id="e-child" name="child" defaultValue={c ? c.id : ''}>
            {s.children.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            <option value="">Família toda</option>
          </select></div>
      </div>
      <div className="grid2">
        <div className="field"><label htmlFor="e-date">Data</label>
          <input className="inp round" id="e-date" name="date" type="date" defaultValue={D.addDays(D.todayISO(), 1)} aria-invalid={invalid(errs.date)} />
          <Err msg={errs.date} /></div>
        <div className="field"><label htmlFor="e-time">Hora <span className="muted">(opcional)</span></label>
          <input className="inp round" id="e-time" name="time" type="time" /></div>
      </div>
      <button className="btn block" type="submit" style={{ marginTop: 20 }}>Salvar compromisso</button>
    </form>
  );
}

function EventView({ id }: { id: string }) {
  const { closeSheet, toast } = useUi();
  const e = useAppState().events.find((x) => x.id === id);
  if (!e) return null;
  const reminder = D.reminderLine(e);
  return (
    <>
      <p className="detail">{D.longDate(e.date)}{e.time ? ', às ' + D.timeLabel(e.time) : ''}</p>
      <p className="detail muted">{catLabel(e.category)}, {nameOf(e.childId)}</p>
      {reminder && <p className="detail muted">{reminder}</p>}
      <ArmButton className="btn line block" style={{ marginTop: 20 }} onConfirm={() => {
        update((st) => { st.events = st.events.filter((x) => x.id !== id); });
        closeSheet();
        toast('Removido.');
      }}>Remover compromisso</ArmButton>
    </>
  );
}

/* ---------- Documentos de saúde ---------- */
function DocForm() {
  const { closeSheet, toast } = useUi();
  const c = currentChild(useAppState());
  const [errs, setErrs] = useState<Errs>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!c) return;
    const fd = new FormData(e.currentTarget);
    const title = str(fd, 'title').trim();
    const date = str(fd, 'date');
    const next: Errs = {};
    if (!title) next.title = 'Digite o nome do documento.';
    if (!ISO.test(date)) next.date = 'Escolha a data.';
    setErrs(next);
    if (Object.keys(next).length) return;
    let photo: string | null = null;
    const file = fd.get('photo');
    if (file instanceof File && file.size > 0) {
      try { photo = await shrink(file); } catch {
        setErrs({ photo: 'Não consegui abrir essa foto.' });
        return;
      }
    }
    const id = uid();
    const ok = update((st) => { st.docs.push({ id, childId: c.id, title, date, photo }); });
    if (!ok && photo) {
      update((st) => { const d = st.docs.find((x) => x.id === id); if (d) d.photo = null; });
      toast('Guardei sem a foto: ela não coube neste navegador.');
    } else {
      toast('Documento guardado.');
    }
    closeSheet();
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="d-title">Nome do documento</label>
        <input className="inp round" id="d-title" name="title" maxLength={80} autoComplete="off" list="d-sugg" placeholder="Ex.: Hemograma completo" aria-invalid={invalid(errs.title)} />
        <datalist id="d-sugg"><option value="Hemograma completo" /><option value="Receita" /><option value="Carteira de vacinação" /><option value="Exame de vista" /></datalist>
        <Err msg={errs.title} /></div>
      <div className="field"><label htmlFor="d-date">Data</label>
        <input className="inp round" id="d-date" name="date" type="date" defaultValue={D.todayISO()} max={D.todayISO()} aria-invalid={invalid(errs.date)} />
        <Err msg={errs.date} /></div>
      <div className="field"><label htmlFor="d-photo">Foto <span className="muted">(opcional)</span></label>
        <input className="inp round file" id="d-photo" name="photo" type="file" accept="image/*" aria-invalid={invalid(errs.photo)} />
        <Err msg={errs.photo} /></div>
      <button className="btn block" type="submit" style={{ marginTop: 20 }}>Guardar</button>
    </form>
  );
}

function DocView({ id }: { id: string }) {
  const { closeSheet, toast } = useUi();
  const d = useAppState().docs.find((x) => x.id === id);
  if (!d) return null;
  return (
    <>
      <p className="detail">{D.brDate(d.date)}</p>
      {d.photo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="photo-prev" src={d.photo} alt={`Foto de ${d.title}`} />
        : <p className="detail muted">Sem foto anexada.</p>}
      <ArmButton className="btn line block" style={{ marginTop: 20 }} onConfirm={() => {
        update((st) => { st.docs = st.docs.filter((x) => x.id !== id); });
        closeSheet();
        toast('Removido.');
      }}>Remover documento</ArmButton>
    </>
  );
}

/* ---------- Matérias e notas ---------- */
function SubjectForm({ id }: { id?: string }) {
  const { closeSheet, toast } = useUi();
  const s = useAppState();
  const c = currentChild(s);
  const subj = id ? s.subjects.find((x) => x.id === id) : undefined;
  const notes: Note[] = subj ? subj.notes : [null, null, null, null];
  const [errs, setErrs] = useState<Errs>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!c) return;
    const fd = new FormData(e.currentTarget);
    const name = str(fd, 'name').trim();
    const next: Errs = {};
    if (!name) next.name = 'Digite o nome da matéria.';
    const parsed: Note[] = [];
    for (let i = 0; i < BIMESTRES; i += 1) {
      const n = parseNote(fd.get(`n${i}`));
      if (Number.isNaN(n)) next[`n${i}`] = 'Use uma nota de 0 a 10.';
      parsed.push(n);
    }
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      if (subj) {
        const t = st.subjects.find((x) => x.id === subj.id);
        if (t) { t.name = name; t.notes = parsed; }
      } else {
        st.subjects.push({ id: uid(), childId: c.id, name, notes: parsed });
      }
    });
    closeSheet();
    toast('Notas salvas.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="s-name">Matéria</label>
        <input className="inp round" id="s-name" name="name" maxLength={40} autoComplete="off" placeholder="Ex.: Matemática" defaultValue={subj ? subj.name : ''} aria-invalid={invalid(errs.name)} />
        <Err msg={errs.name} /></div>
      <div className="grid2">
        {notes.map((n, i) => (
          <div className="field" key={i}><label htmlFor={`n${i}`}>{i + 1}º bimestre</label>
            <input className="inp round" id={`n${i}`} name={`n${i}`} inputMode="decimal" autoComplete="off" placeholder="Ex.: 6,5" defaultValue={n == null ? '' : fmt(n)} aria-invalid={invalid(errs[`n${i}`])} />
            <Err msg={errs[`n${i}`]} /></div>
        ))}
      </div>
      <p className="hint">Deixe em branco o bimestre que ainda não tem nota. Use notas de 0 a 10.</p>
      <button className="btn block" type="submit" style={{ marginTop: 14 }}>Salvar notas</button>
      {subj && (
        <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => {
          update((st) => { st.subjects = st.subjects.filter((x) => x.id !== subj.id); });
          closeSheet();
          toast('Removido.');
        }}>Remover matéria</ArmButton>
      )}
    </form>
  );
}

function BoletimView({ onReplace }: { onReplace: () => void }) {
  const { closeSheet, toast } = useUi();
  const s = useAppState();
  const c = currentChild(s);
  const bol = c && s.boletim[c.id];
  if (!c || !bol) return null;
  return (
    <>
      <p className="detail muted">Enviado em {D.brDate(bol.at)}. A leitura automática ainda não existe: as notas são digitadas.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="photo-prev" src={bol.photo} alt={`Foto do boletim de ${c.name}`} />
      <button type="button" className="btn block" style={{ marginTop: 20 }} onClick={onReplace}>Trocar foto</button>
      <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => {
        update((st) => { delete st.boletim[c.id]; });
        closeSheet();
        toast('Removido.');
      }}>Remover foto</ArmButton>
    </>
  );
}

/* ---------- Ajustes e dados ---------- */
function Ajustes({ onDados }: { onDados: () => void }) {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  const s = useAppState();
  const [errs, setErrs] = useState<Errs>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const media = parseNote(fd.get('media'));
    if (media == null || Number.isNaN(media) || media < 1) {
      setErrs({ media: 'Use uma média de 1 a 10.' });
      return;
    }
    update((st) => { st.motherName = str(fd, 'name').trim(); st.media = media; });
    closeSheet();
    toast('Ajustes salvos.');
  }

  function removeChild(id: string) {
    update((st) => {
      st.children = st.children.filter((x) => x.id !== id);
      st.subjects = st.subjects.filter((x) => x.childId !== id);
      st.events = st.events.filter((x) => x.childId !== id);
      st.docs = st.docs.filter((x) => x.childId !== id);
      delete st.boletim[id];
      if (st.currentChildId === id) st.currentChildId = st.children[0] ? st.children[0].id : null;
    });
    closeSheet();
    toast('Removido.');
  }

  return (
    <>
      <form noValidate onSubmit={submit}>
        <div className="field"><label htmlFor="a-name">Seu nome</label>
          <input className="inp round" id="a-name" name="name" maxLength={40} autoComplete="given-name" defaultValue={s.motherName} /></div>
        <div className="field"><label htmlFor="a-media">Média para passar de ano</label>
          <input className="inp round" id="a-media" name="media" inputMode="decimal" autoComplete="off" defaultValue={fmt(s.media)} aria-invalid={invalid(errs.media)} />
          <p className="hint">A escola define a regra. O cálculo usa a soma dos {BIMESTRES} bimestres dividida por {BIMESTRES}.</p>
          <Err msg={errs.media} /></div>
        <button className="btn block" type="submit" style={{ marginTop: 14 }}>Salvar ajustes</button>
      </form>
      {s.children.length > 0 && (
        <>
          <h3 className="h3">Filhos</h3>
          {s.children.map((k) => (
            <div className="kid-row" key={k.id}><span>{k.name}</span>
              <ArmButton className="btn line small" onConfirm={() => removeChild(k.id)}>Remover</ArmButton></div>
          ))}
        </>
      )}
      <h3 className="h3">Dados deste teste</h3>
      <ArmButton className="btn line block" onConfirm={() => {
        loadExample();
        resetChat();
        closeSheet();
        router.push('/');
        toast('Dados de exemplo carregados.');
      }}>Carregar dados de exemplo</ArmButton>
      <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => {
        resetAll();
        resetChat();
        closeSheet();
        router.push('/');
        toast('Tudo apagado.');
      }}>Apagar tudo e recomeçar</ArmButton>
      <button type="button" className="link" style={{ marginTop: 14 }} onClick={onDados}>Como cuidamos dos dados</button>
    </>
  );
}

function Dados() {
  return (
    <>
      <p className="detail">Nesta versão de teste, tudo o que você digita e fotografa fica salvo só neste aparelho, no navegador. Nada é enviado a servidor e não existe conta nem senha.</p>
      <p className="detail">Se você limpar os dados do navegador ou apagar tudo nos ajustes, as informações somem e não dá para recuperar.</p>
      <p className="detail muted">Texto provisório. Antes de lançar de verdade, o consentimento para dados de crianças e de saúde precisa de revisão jurídica (LGPD).</p>
    </>
  );
}

/* ---------- Abertura das folhas ---------- */
export function useSheets() {
  const { openSheet, closeSheet, toast, pickPhoto } = useUi();
  const router = useRouter();

  const dados = () => openSheet('Como cuidamos dos dados', <Dados />);

  // Escolhe a foto, guarda como boletim do filho atual e leva para a tela de notas.
  async function boletimFlow() {
    const c = currentChild(getState());
    if (!c) { toast('Adicione um filho primeiro.'); return; }
    const photo = await pickPhoto();
    if (!photo) return;
    const ok = update((st) => { st.boletim[c.id] = { photo, at: D.todayISO() }; });
    if (!ok) {
      update((st) => { delete st.boletim[c.id]; });
      toast('A foto não coube neste navegador. Tente de novo.');
      return;
    }
    closeSheet();
    router.push('/escola/');
    if (getState().subjects.some((x) => x.childId === c.id)) toast('Boletim guardado. Toque em uma matéria para digitar as notas.');
    else subjectForm();
  }

  function subjectForm(id?: string) {
    const s = getState();
    if (!currentChild(s)) { toast('Adicione um filho primeiro.'); return; }
    const subj = id ? s.subjects.find((x) => x.id === id) : undefined;
    openSheet(subj ? `Notas de ${subj.name}` : 'Nova matéria', <SubjectForm id={id} />);
  }

  return {
    boletimFlow,
    subjectForm,
    dados,
    eventForm: (category?: Category) => openSheet('Novo compromisso', <EventForm category={category} />),
    eventView: (id: string) => {
      const e = getState().events.find((x) => x.id === id);
      if (e) openSheet(e.title, <EventView id={id} />);
    },
    docForm: () => {
      if (!currentChild(getState())) { toast('Adicione um filho primeiro.'); return; }
      openSheet('Guardar documento', <DocForm />);
    },
    docView: (id: string) => {
      const d = getState().docs.find((x) => x.id === id);
      if (d) openSheet(d.title, <DocView id={id} />);
    },
    boletimView: () => {
      const c = currentChild(getState());
      if (c && getState().boletim[c.id]) openSheet('Foto do boletim', <BoletimView onReplace={boletimFlow} />);
    },
    ajustes: () => openSheet('Ajustes', <Ajustes onDados={dados} />),
  };
}
