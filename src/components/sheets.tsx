'use client';
// Folhas que sobem da parte de baixo: formulários e detalhes.
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  activeChildren, addChild, currentChild, endedChildren, getState, loadExample, removeChild, resetAll,
  uid, update, useAppState, visibleEvents, type Category, type Child,
} from '@/lib/store';
import * as D from '@/lib/dates';
import { BIMESTRES, fmt, parseNote, type Note } from '@/lib/grades';
import { phaseLine, weeksOf } from '@/lib/phases';
import { setFilhoTab } from '@/lib/view';
import { shrink } from '@/lib/photo';
import { resetChat } from '@/lib/chat';
import { Icons } from './Icons';
import { ArmButton, Err, invalid, useUi } from './Ui';
import { first, pal, useGotoKid } from './parts';

const CATS: [Category, string][] = [['saude', 'Saúde'], ['escola', 'Escola'], ['outro', 'Outro']];
const catLabel = (c: string) => (CATS.find((x) => x[0] === c) || CATS[2])[1];
const nameOf = (id: string | null) => (getState().children.find((c) => c.id === id) || { name: 'Família toda' }).name;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) || '');

type Errs = Record<string, string>;

function Switch({ id, name, label, hint, on }: { id: string; name: string; label: string; hint: string; on: boolean }) {
  return (
    <div className="swrow">
      <div className="grow"><p className="t" id={`${id}-l`}>{label}</p><p className="s">{hint}</p></div>
      <label className="sw"><input type="checkbox" role="switch" name={name} aria-labelledby={`${id}-l`} defaultChecked={on} /><i /></label>
    </div>
  );
}

/* ---------- Seletor de filho e adicionar ---------- */
function Seletor() {
  const s = useAppState();
  const router = useRouter();
  const { closeSheet } = useUi();
  const sheets = useSheets();
  const goto = useGotoKid();
  const cur = currentChild(s);
  const today = D.todayISO();
  return (
    <>
      <div className="list" style={{ marginTop: 14 }}>
        <button type="button" className="row all" onClick={() => { closeSheet(); router.push('/'); }}>
          <div className="tile sq"><Icons.home size={24} /></div>
          <div className="grow"><p className="t">Todos juntos</p><p className="s">Compromissos de todos, na ordem da data</p></div>
        </button>
        {activeChildren(s).map((k) => {
          const next = visibleEvents(s).filter((e) => e.childId === k.id && e.date >= today).sort(D.byWhen)[0];
          const sub = `${phaseLine(k)}${next ? '. ' + D.relLabel(next.date) + ': ' + next.title : ''}`;
          const on = !!cur && cur.id === k.id;
          return (
            <button key={k.id} type="button" className={`row sel ${pal(k)}${on ? ' current' : ''}`} onClick={() => goto(k.id)}>
              <div className="tile sq"><b>{k.name.charAt(0).toUpperCase()}</b></div>
              <div className="grow"><p className="t">{k.name}</p><p className="s">{sub}</p></div>
              {on && <span className="badge-on">Aberto</span>}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn dashed block" style={{ marginTop: 12 }} onClick={sheets.addMenu}><Icons.plus size={20} />Adicionar filho ou gestação</button>
    </>
  );
}

function AddMenu() {
  const router = useRouter();
  const { closeSheet } = useUi();
  const sheets = useSheets();
  return (
    <div className="list" style={{ marginTop: 14 }}>
      <button type="button" className="row flatrow" onClick={() => { closeSheet(); router.push('/novo-filho/'); }}>
        <div className="grow"><p className="t">Um filho que já nasceu</p><p className="s">Nome e data de nascimento</p></div>
        <span className="muted"><Icons.chevron size={20} /></span>
      </button>
      <button type="button" className="row flatrow" onClick={sheets.pregnancyForm}>
        <div className="grow"><p className="t">Uma gestação</p><p className="s">Aparece como um perfil, até o nascimento</p></div>
        <span className="muted"><Icons.chevron size={20} /></span>
      </button>
    </div>
  );
}

function PregnancyForm() {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  const s = useAppState();
  const [errs, setErrs] = useState<Errs>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = str(fd, 'name').trim();
    const dpp = str(fd, 'dpp');
    const next: Errs = {};
    if (!name) next.name = 'Digite um nome para o perfil.';
    if (dpp && (!ISO.test(dpp) || dpp < D.todayISO())) next.dpp = 'A data prevista precisa ser daqui para frente.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      const c = addChild(st, { kind: 'pregnancy', name, dpp, twins: fd.get('twins') === 'on' });
      st.currentChildId = c.id;
    });
    setFilhoTab(null);
    closeSheet();
    router.push('/filho/');
    toast('Gestação adicionada.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="p-name">Nome do perfil</label>
        <input className="inp" id="p-name" name="name" maxLength={40} defaultValue={`Bebê da ${first(s.motherName) || 'mamãe'}`} aria-invalid={invalid(errs.name)} />
        <Err msg={errs.name} /></div>
      <div className="field"><label htmlFor="p-dpp">Data prevista do parto <span className="muted">(opcional)</span></label>
        <input className="inp" id="p-dpp" name="dpp" type="date" min={D.todayISO()} max={D.addDays(D.todayISO(), 300)} aria-invalid={invalid(errs.dpp)} />
        <Err msg={errs.dpp} />
        <p className="hint">Dá para preencher ou corrigir depois.</p></div>
      <Switch id="p-tw" name="twins" label="São gêmeos?" hint="Um perfil só até o nascimento. Depois, cada bebê ganha o seu." on={false} />
      <button className="btn block big" type="submit" style={{ marginTop: 18 }}>Adicionar gestação</button>
    </form>
  );
}

/* ---------- Perfil do filho: editar, gestação, nascimento, encerrar ---------- */
function EditChild({ id }: { id: string }) {
  const { closeSheet, toast } = useUi();
  const c = useAppState().children.find((x) => x.id === id);
  const [errs, setErrs] = useState<Errs>({});
  if (!c) return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = str(fd, 'name').trim();
    const birth = str(fd, 'birth');
    const next: Errs = {};
    if (!name) next.name = 'Digite o nome.';
    if (!ISO.test(birth) || birth > D.todayISO()) next.birth = 'Escolha uma data que já passou.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      const k = st.children.find((x) => x.id === id);
      if (k) { k.name = name; k.birth = birth; k.school = str(fd, 'school').trim(); k.grade = str(fd, 'grade').trim(); }
    });
    closeSheet();
    toast('Perfil salvo.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="x-name">Nome ou apelido</label>
        <input className="inp" id="x-name" name="name" maxLength={40} defaultValue={c.name} aria-invalid={invalid(errs.name)} />
        <Err msg={errs.name} /></div>
      <div className="field"><label htmlFor="x-birth">Data de nascimento</label>
        <input className="inp" id="x-birth" name="birth" type="date" max={D.todayISO()} defaultValue={c.birth} aria-invalid={invalid(errs.birth)} />
        <Err msg={errs.birth} />
        <p className="hint">A fase do perfil muda sozinha com a idade.</p></div>
      <div className="field"><label htmlFor="x-school">Escola <span className="muted">(opcional)</span></label>
        <input className="inp" id="x-school" name="school" maxLength={60} defaultValue={c.school} /></div>
      <div className="field"><label htmlFor="x-grade">Ano ou série <span className="muted">(opcional)</span></label>
        <input className="inp" id="x-grade" name="grade" maxLength={30} defaultValue={c.grade} /></div>
      <button className="btn block" type="submit" style={{ marginTop: 18 }}>Salvar</button>
      <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => removeKid(id)}>Remover {c.name}</ArmButton>
    </form>
  );
}

// Apaga o filho e tudo o que é dele. Usado pelo menu do perfil e pela lista de encerrados.
function removeKid(id: string) {
  update((st) => removeChild(st, id));
  resetChat();
}

function GestacaoForm({ id }: { id: string }) {
  const { closeSheet, toast } = useUi();
  const c = useAppState().children.find((x) => x.id === id);
  const sheets = useSheets();
  const [errs, setErrs] = useState<Errs>({});
  if (!c || c.kind !== 'pregnancy') return null;
  const w = weeksOf(c.dpp);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dpp = str(fd, 'dpp');
    if (dpp && !ISO.test(dpp)) { setErrs({ dpp: 'Escolha uma data válida.' }); return; }
    update((st) => {
      const k = st.children.find((x) => x.id === id);
      if (k) { k.dpp = dpp; k.twins = fd.get('twins') === 'on'; }
    });
    closeSheet();
    toast('Gestação atualizada.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="g-dpp">{c.dpp ? 'Nova data' : 'Data prevista'}</label>
        <input className="inp" id="g-dpp" name="dpp" type="date" defaultValue={c.dpp} min={D.addDays(D.todayISO(), -30)} max={D.addDays(D.todayISO(), 300)} aria-invalid={invalid(errs.dpp)} />
        <p className="live">{c.dpp ? `Antes: ${D.brDate(c.dpp)}${w == null ? '' : `. Hoje: ${w}ª semana`}.` : ''}</p>
        <p className="hint">Lembretes e a lista da fase se ajustam sozinhos. Consultas já marcadas não mudam.</p>
        <Err msg={errs.dpp} /></div>
      <Switch id="g-tw" name="twins" label="São gêmeos?" hint="Seguimos com um perfil só até o nascimento. Depois, cada bebê ganha o seu." on={c.twins} />
      <button type="button" className="row flatrow rose" style={{ marginTop: 10 }} onClick={() => sheets.birthForm(id)}>
        <div className="grow"><p className="t">Seu bebê nasceu? Registrar nascimento</p></div><span><Icons.chevron size={20} /></span>
      </button>
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>Salvar</button>
      <button type="button" className="link center-link muted-link" onClick={() => sheets.endForm(id)}>Encerrar este acompanhamento</button>
    </form>
  );
}

function BirthForm({ id }: { id: string }) {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  const c = useAppState().children.find((x) => x.id === id);
  const [errs, setErrs] = useState<Errs>({});
  if (!c || c.kind !== 'pregnancy') return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = str(fd, 'date');
    const n1 = str(fd, 'n1').trim();
    const n2 = str(fd, 'n2').trim();
    const next: Errs = {};
    if (!ISO.test(date) || date > D.todayISO()) next.date = 'Escolha uma data que já passou.';
    if (!n1) next.n1 = 'Digite o nome.';
    if (c!.twins && !n2) next.n2 = 'Digite o nome.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      const k = st.children.find((x) => x.id === id);
      if (!k) return;
      k.kind = 'born'; k.birth = date; k.name = n1; k.fromPregnancy = true;
      if (k.twins) addChild(st, { kind: 'born', name: n2, birth: date, fromPregnancy: true, twinOf: k.id });
      k.twins = false;
      st.currentChildId = k.id;
    });
    setFilhoTab(null);
    closeSheet();
    router.push('/filho/');
    toast('Nascimento registrado.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <p className="detail muted">Os compromissos e documentos do pré-natal ficam guardados no perfil{c.twins ? ' do primeiro bebê' : ''}.</p>
      <div className="field"><label htmlFor="b-date">Data de nascimento</label>
        <input className="inp" id="b-date" name="date" type="date" defaultValue={D.todayISO()} max={D.todayISO()} aria-invalid={invalid(errs.date)} />
        <Err msg={errs.date} /></div>
      {c.twins ? (
        <div className="grid2">
          <div className="field"><label htmlFor="b-n1">Primeiro bebê</label>
            <input className="inp" id="b-n1" name="n1" maxLength={40} placeholder="Nome ou apelido" aria-invalid={invalid(errs.n1)} /><Err msg={errs.n1} /></div>
          <div className="field"><label htmlFor="b-n2">Segundo bebê</label>
            <input className="inp" id="b-n2" name="n2" maxLength={40} placeholder="Nome ou apelido" aria-invalid={invalid(errs.n2)} /><Err msg={errs.n2} /></div>
        </div>
      ) : (
        <div className="field"><label htmlFor="b-n1">Nome ou apelido</label>
          <input className="inp" id="b-n1" name="n1" maxLength={40} placeholder="Como você vai chamar" aria-invalid={invalid(errs.n1)} /><Err msg={errs.n1} /></div>
      )}
      <button className="btn block big" type="submit" style={{ marginTop: 18 }}>Registrar</button>
    </form>
  );
}

function EndForm({ id }: { id: string }) {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  if (!getState().children.some((x) => x.id === id)) return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mode = str(new FormData(e.currentTarget), 'mode') || 'keep';
    update((st) => {
      if (mode === 'delete') {
        removeChild(st, id);
      } else {
        const k = st.children.find((x) => x.id === id);
        if (k) { k.status = 'ended'; k.endedAt = D.todayISO(); }
        if (st.currentChildId === id) { const nx = activeChildren(st)[0]; st.currentChildId = nx ? nx.id : null; }
      }
    });
    resetChat();
    closeSheet();
    router.push('/');
    toast(mode === 'delete' ? 'Apagado.' : 'Acompanhamento encerrado.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <p className="detail">Sentimos muito. Você não precisa explicar nada.</p>
      <p className="detail">Ao encerrar, o app para todos os lembretes e mensagens deste perfil. Não vamos mandar mais nada sobre ele, nem perguntar o motivo.</p>
      <h3 className="h3">O que fazer com o que foi guardado?</h3>
      <div className="crow card-radio lilac"><input id="en-k" type="radio" name="mode" value="keep" defaultChecked />
        <label htmlFor="en-k"><b>Guardar, só para mim.</b> Consultas e exames ficam salvos, escondidos da tela inicial. Você decide quando apagar.</label></div>
      <div className="crow card-radio"><input id="en-d" type="radio" name="mode" value="delete" />
        <label htmlFor="en-d"><b>Apagar tudo agora.</b> Remove o perfil e os registros. Não dá para desfazer.</label></div>
      <button className="btn block big" type="submit" style={{ marginTop: 16 }}>Encerrar acompanhamento</button>
      <button type="button" className="link center-link" onClick={closeSheet}>Agora não</button>
    </form>
  );
}

function EndedList() {
  const s = useAppState();
  const { closeSheet, toast } = useUi();
  const list = endedChildren(s);
  return (
    <>
      <p className="detail muted">Ficam escondidos e não geram nenhum aviso.</p>
      {list.length ? list.map((k) => (
        <div className="ended" key={k.id}>
          <p className="t">{k.name}</p>
          <p className="s">Encerrado em {D.brDate(k.endedAt || D.todayISO())}</p>
          <div className="actions">
            <button type="button" className="btn line small" onClick={() => {
              update((st) => { const x = st.children.find((c) => c.id === k.id); if (x) { x.status = 'active'; delete x.endedAt; } });
              resetChat();
              closeSheet();
              toast('Acompanhamento retomado.');
            }}>Voltar a acompanhar</button>
            <ArmButton className="btn line small" onConfirm={() => { removeKid(k.id); toast('Removido.'); }}>Apagar de vez</ArmButton>
          </div>
        </div>
      )) : <p className="detail">Nada encerrado.</p>}
    </>
  );
}

/* ---------- Compromissos ---------- */
function EventForm({ category, childId, date }: { category?: Category; childId?: string; date?: string }) {
  const { closeSheet, toast } = useUi();
  const s = useAppState();
  const c = currentChild(s);
  const [errs, setErrs] = useState<Errs>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = str(fd, 'title').trim();
    const d = str(fd, 'date');
    const next: Errs = {};
    if (!title) next.title = 'Digite o nome do compromisso.';
    if (!ISO.test(d)) next.date = 'Escolha a data.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      st.events.push({
        id: uid(), title, date: d, time: str(fd, 'time'),
        childId: str(fd, 'child') || null, category: (str(fd, 'category') || 'outro') as Category,
      });
    });
    closeSheet();
    toast('Compromisso salvo.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="e-title">Compromisso</label>
        <input className="inp" id="e-title" name="title" maxLength={80} autoComplete="off" placeholder="Ex.: Consulta com a pediatra" aria-invalid={invalid(errs.title)} />
        <Err msg={errs.title} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="e-cat">Tipo</label>
          <select className="inp" id="e-cat" name="category" defaultValue={category || 'saude'}>
            {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div className="field"><label htmlFor="e-child">Para quem</label>
          <select className="inp" id="e-child" name="child" defaultValue={childId || (c ? c.id : '')}>
            {activeChildren(s).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            <option value="">Família toda</option>
          </select></div>
      </div>
      <div className="grid2">
        <div className="field"><label htmlFor="e-date">Data</label>
          <input className="inp" id="e-date" name="date" type="date" defaultValue={date || D.addDays(D.todayISO(), 1)} aria-invalid={invalid(errs.date)} />
          <Err msg={errs.date} /></div>
        <div className="field"><label htmlFor="e-time">Hora <span className="muted">(opcional)</span></label>
          <input className="inp" id="e-time" name="time" type="time" /></div>
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
        resetChat();
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
        <input className="inp" id="d-title" name="title" maxLength={80} autoComplete="off" list="d-sugg" placeholder="Ex.: Hemograma completo" aria-invalid={invalid(errs.title)} />
        <datalist id="d-sugg"><option value="Hemograma completo" /><option value="Receita" /><option value="Carteira de vacinação" /><option value="Pedido de exame" /></datalist>
        <Err msg={errs.title} /></div>
      <div className="field"><label htmlFor="d-date">Data</label>
        <input className="inp" id="d-date" name="date" type="date" defaultValue={D.todayISO()} max={D.todayISO()} aria-invalid={invalid(errs.date)} />
        <Err msg={errs.date} /></div>
      <div className="field"><label htmlFor="d-photo">Foto <span className="muted">(opcional)</span></label>
        <input className="inp file" id="d-photo" name="photo" type="file" accept="image/*" aria-invalid={invalid(errs.photo)} />
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
        /* eslint-disable-next-line @next/next/no-img-element */
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
  const [errs, setErrs] = useState<Errs>({});
  const notes: Note[] = subj ? subj.notes : [null, null, null, null];

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
        <input className="inp" id="s-name" name="name" maxLength={40} autoComplete="off" placeholder="Ex.: Matemática" defaultValue={subj ? subj.name : ''} aria-invalid={invalid(errs.name)} />
        <Err msg={errs.name} /></div>
      <div className="grid2">
        {notes.map((n, i) => (
          <div className="field" key={i}><label htmlFor={`n${i}`}>{i + 1}º bimestre</label>
            <input className="inp" id={`n${i}`} name={`n${i}`} inputMode="decimal" autoComplete="off" placeholder="Ex.: 6,5" defaultValue={n == null ? '' : fmt(n)} aria-invalid={invalid(errs[`n${i}`])} />
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

/* ---------- Área da mãe ---------- */
const WD: [string, string, number][] = [['D', 'Domingo', 0], ['S', 'Segunda', 1], ['T', 'Terça', 2], ['Q', 'Quarta', 3], ['Q', 'Quinta', 4], ['S', 'Sexta', 5], ['S', 'Sábado', 6]];

function RoutineForm() {
  const { closeSheet, toast } = useUi();
  const s = useAppState();
  const r = s.routine;
  const [errs, setErrs] = useState<Errs>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const zap = str(fd, 'whatsapp').trim();
    const digits = zap.replace(/\D/g, '');
    const media = parseNote(fd.get('media'));
    const next: Errs = {};
    if (zap && (digits.length < 10 || digits.length > 11)) next.whatsapp = 'Use DDD e número, como (21) 98888-1234.';
    if (media == null || Number.isNaN(media) || media < 1) next.media = 'Use uma média de 1 a 10.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      st.motherName = str(fd, 'name').trim();
      st.routine = {
        ...st.routine,
        days: [0, 1, 2, 3, 4, 5, 6].filter((n) => fd.get(`d${n}`) === 'on'),
        start: str(fd, 'start') || st.routine.start, end: str(fd, 'end') || st.routine.end,
        vacation: str(fd, 'vacation').trim(), whatsapp: zap,
      };
      st.media = media as number;
    });
    closeSheet();
    toast('Rotina salva.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="m-name">Seu nome</label><input className="inp" id="m-name" name="name" maxLength={40} autoComplete="given-name" defaultValue={s.motherName} /></div>
      <h3 className="lbl top-gap">Dias em que você trabalha</h3>
      <div className="days">
        {WD.map(([l, name, n]) => (
          <label className="day dchk" key={n}><input type="checkbox" name={`d${n}`} aria-label={name} defaultChecked={r.days.includes(n)} /><span>{l}</span></label>
        ))}
      </div>
      <div className="grid2">
        <div className="field"><label htmlFor="m-start">Entra às</label><input className="inp" id="m-start" name="start" type="time" defaultValue={r.start} /></div>
        <div className="field"><label htmlFor="m-end">Sai às</label><input className="inp" id="m-end" name="end" type="time" defaultValue={r.end} /></div>
      </div>
      <div className="field"><label htmlFor="m-vac">Próximas férias <span className="muted">(opcional)</span></label><input className="inp" id="m-vac" name="vacation" maxLength={40} placeholder="Ex.: 5 a 19 de janeiro" defaultValue={r.vacation} /></div>
      <div className="field"><label htmlFor="m-zap">WhatsApp para os avisos</label><input className="inp" id="m-zap" name="whatsapp" type="tel" inputMode="tel" maxLength={20} defaultValue={r.whatsapp} aria-invalid={invalid(errs.whatsapp)} /><Err msg={errs.whatsapp} /></div>
      <div className="field"><label htmlFor="m-media">Média para passar de ano (escola dos filhos)</label>
        <input className="inp" id="m-media" name="media" inputMode="decimal" autoComplete="off" defaultValue={fmt(s.media)} aria-invalid={invalid(errs.media)} />
        <p className="hint">A escola define a regra. O cálculo usa a soma dos {BIMESTRES} bimestres dividida por {BIMESTRES}.</p><Err msg={errs.media} /></div>
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>Salvar</button>
    </form>
  );
}

function ConsentView() {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  const c = useAppState().consent;
  const line = (ok: boolean, text: string) => <li>{ok ? 'Autorizado' : 'Não autorizado'}: {text}</li>;
  return (
    <>
      <p className="detail muted">{c.at ? `Dado em ${D.brDate(c.at)}.` : 'Ainda não dado.'}</p>
      <ul className="plain">
        {line(c.health, 'uso dos meus dados de saúde e de gestação')}
        {line(c.legal, 'uso dos dados dos filhos, como responsável legal')}
        {line(c.stats, 'estatísticas sem nome (opcional)')}
      </ul>
      <p className="detail muted">Sem a autorização de saúde o app não consegue funcionar. Por isso, retirar essa autorização apaga tudo o que está guardado neste aparelho.</p>
      <ArmButton className="btn line block" style={{ marginTop: 16 }} onConfirm={() => { resetAll(); resetChat(); closeSheet(); router.push('/'); toast('Tudo apagado.'); }}>Retirar e apagar tudo</ArmButton>
    </>
  );
}

function ApagarView() {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  return (
    <>
      <p className="detail">Isto apaga tudo o que está guardado neste aparelho: filhos, compromissos, documentos, fotos e rotina. Não dá para recuperar.</p>
      <ArmButton className="btn line block" style={{ marginTop: 16 }} onConfirm={() => { resetAll(); resetChat(); closeSheet(); router.push('/'); toast('Tudo apagado.'); }}>Apagar tudo e recomeçar</ArmButton>
    </>
  );
}

function TestView() {
  const { closeSheet, toast } = useUi();
  const router = useRouter();
  const sheets = useSheets();
  return (
    <>
      <p className="detail muted">Para ver o app cheio, sem digitar nada. Os dados de exemplo substituem o que está guardado.</p>
      <ArmButton className="btn line block" onConfirm={() => { loadExample(); resetChat(); closeSheet(); router.push('/'); toast('Dados de exemplo carregados.'); }}>Carregar dados de exemplo</ArmButton>
      <button type="button" className="link" style={{ marginTop: 14 }} onClick={sheets.dados}>Como cuidamos dos dados</button>
    </>
  );
}

function Dados() {
  return (
    <>
      <p className="detail">Nesta versão de teste, tudo o que você digita e fotografa fica salvo só neste aparelho, no navegador. Nada é enviado a servidor, não existe conta nem senha, e nenhuma mensagem de WhatsApp é enviada de verdade.</p>
      <p className="detail">Se você limpar os dados do navegador ou apagar tudo, as informações somem e não dá para recuperar.</p>
      <p className="detail muted">Texto provisório. Antes de lançar de verdade, o consentimento para dados de gestação, de saúde e de crianças precisa de revisão jurídica (LGPD).</p>
    </>
  );
}

/* ---------- Abertura das folhas ---------- */
export function useSheets() {
  const { openSheet, closeSheet, toast, pickPhoto } = useUi();
  const router = useRouter();

  // Escolhe a foto, guarda como boletim do filho atual e leva para a aba Escola dele.
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
    setFilhoTab('escola');
    router.push('/filho/');
    if (getState().subjects.some((x) => x.childId === c.id)) toast('Boletim guardado. Toque em uma matéria para digitar as notas.');
    else subjectForm();
  }

  function subjectForm(id?: string) {
    const s = getState();
    if (!currentChild(s)) { toast('Adicione um filho primeiro.'); return; }
    const subj = id ? s.subjects.find((x) => x.id === id) : undefined;
    openSheet(subj ? `Notas de ${subj.name}` : 'Nova matéria', <SubjectForm id={id} />);
  }

  function birthForm(id: string) {
    openSheet('Registrar nascimento', <BirthForm id={id} />);
  }

  return {
    boletimFlow,
    subjectForm,
    birthForm,
    seletor: () => openSheet('Quem você quer ver?', <Seletor />),
    addMenu: () => openSheet('Adicionar', <AddMenu />),
    pregnancyForm: () => {
      if (activeChildren(getState()).some((c) => c.kind === 'pregnancy')) { toast('Já existe uma gestação sendo acompanhada.'); return; }
      openSheet('Nova gestação', <PregnancyForm />);
    },
    filhoMenu: () => {
      const c: Child | null = currentChild(getState());
      if (!c) return;
      if (c.kind === 'pregnancy') openSheet('Data prevista do parto', <GestacaoForm id={c.id} />);
      else openSheet(`Perfil de ${c.name}`, <EditChild id={c.id} />);
    },
    gestacaoForm: (id: string) => openSheet('Data prevista do parto', <GestacaoForm id={id} />),
    endForm: (id: string) => openSheet('Quer encerrar este acompanhamento?', <EndForm id={id} />),
    endedList: () => openSheet('Acompanhamentos encerrados', <EndedList />),
    eventForm: (opts: { category?: Category; childId?: string; date?: string } = {}) =>
      openSheet('Novo compromisso', <EventForm {...opts} />),
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
    routineForm: () => openSheet('Minha rotina', <RoutineForm />),
    consentView: () => openSheet('Seus consentimentos', <ConsentView />),
    apagarView: () => openSheet('Apagar minha conta', <ApagarView />),
    testView: () => openSheet('Dados de teste', <TestView />),
    dados: () => openSheet('Como cuidamos dos dados', <Dados />),
  };
}
