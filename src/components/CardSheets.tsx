'use client';
// Carteirinha do filho: nascimento, alergias e remédios contínuos, e lista de medidas (peso, altura, perímetro cefálico).
import { useState, type FormEvent } from 'react';
import { uid, update, useAppState } from '@/lib/store';
import * as D from '@/lib/dates';
import {
  BLOOD_TYPES, DELIVERY, birthLine, heightWord, measureLine, measuresOf, parseApgar, parseDecimal, parseInt0, showHead,
} from '@/lib/growth';
import { Icons } from './Icons';
import { ArmButton, Err, invalid, useUi } from './Ui';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) || '');
type Errs = Record<string, string>;

// Abertura de outra folha (vem de useSheets, passada por quem chama, para não haver import circular).
interface Nav {
  cardView: (childId: string) => void;
  birthDataForm: (childId: string) => void;
  healthForm: (childId: string) => void;
  measureForm: (childId: string, id?: string) => void;
}

const dec = (n: number | null | undefined) => (n != null ? String(n).replace('.', ',') : '');

export function CardView({ childId, nav }: { childId: string; nav: Nav }) {
  const s = useAppState();
  const c = s.children.find((x) => x.id === childId);
  if (!c) return null;
  const list = measuresOf(s.measures, c);
  const apgar = c.apgar1 != null || c.apgar5 != null;
  const hasBirth = apgar || c.blood || birthLine(c);
  const head = [apgar ? `Apgar ${c.apgar1 ?? '-'} e ${c.apgar5 ?? '-'}` : '', c.blood ? `sangue ${c.blood}` : ''].filter(Boolean).join(', ');
  return (
    <>
      <h3 className="h3 tight">Nascimento</h3>
      <button type="button" className="row flatrow" onClick={() => nav.birthDataForm(childId)}>
        <div className="grow">
          <p className="t">{head || (hasBirth ? 'Dados do nascimento' : 'Apgar, tipo sanguíneo e mais')}</p>
          <p className="s">{birthLine(c) || (hasBirth ? 'Toque para completar' : 'Ainda não preenchidos')}</p>
        </div>
        <span className="linkish">{hasBirth ? 'Editar' : 'Preencher'}</span>
      </button>

      <h3 className="h3 tight">Alergias e remédios contínuos</h3>
      <button type="button" className="row flatrow" onClick={() => nav.healthForm(childId)}>
        <div className="grow">
          <p className="t">{c.allergies ? `Alergias: ${c.allergies}` : 'Alergias: não informado'}</p>
          <p className="s">{c.ongoing ? `Contínuo: ${c.ongoing}` : 'Remédios e condições contínuas: não informado'}</p>
        </div>
        <span className="linkish">Editar</span>
      </button>

      <h3 className="h3 tight">Peso e altura</h3>
      {list.length ? (
        <div className="list">
          {list.map((m) => (
            <button type="button" className="row flatrow" key={m.id} onClick={() => nav.measureForm(childId, m.id)}>
              <div className="grow"><p className="t">{D.brDate(m.date)}</p><p className="s">{measureLine(m, c)}</p></div>
              <span className="muted"><Icons.chevron size={20} /></span>
            </button>
          ))}
        </div>
      ) : <p className="muted pad">Nenhuma medida registrada.</p>}
      <button type="button" className="btn block" style={{ marginTop: 14 }} onClick={() => nav.measureForm(childId)}><Icons.plus size={18} />Registrar medida</button>
    </>
  );
}

export function BirthDataForm({ childId, nav }: { childId: string; nav: Nav }) {
  const { toast } = useUi();
  const c = useAppState().children.find((x) => x.id === childId);
  const [errs, setErrs] = useState<Errs>({});
  if (!c) return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const a1 = parseApgar(fd.get('apgar1'));
    const a5 = parseApgar(fd.get('apgar5'));
    const w = parseDecimal(fd.get('bw'), 10);
    const l = parseDecimal(fd.get('bl'), 80);
    const g = parseInt0(fd.get('gest'), 20, 45);
    const next: Errs = {};
    if (a1 === undefined) next.apgar1 = 'Use um número de 0 a 10.';
    if (a5 === undefined) next.apgar5 = 'Use um número de 0 a 10.';
    if (w === undefined) next.bw = 'Digite em kg, como 3,250.';
    if (l === undefined) next.bl = 'Digite em cm, como 49.';
    if (g === undefined) next.gest = 'Use de 20 a 45 semanas.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      const k = st.children.find((x) => x.id === childId);
      if (!k) return;
      k.apgar1 = a1 as number | null; k.apgar5 = a5 as number | null; k.blood = str(fd, 'blood');
      k.birthWeightKg = w as number | null; k.birthLengthCm = l as number | null;
      k.gestWeeks = g as number | null; k.delivery = str(fd, 'delivery');
    });
    toast('Dados salvos.');
    nav.cardView(childId);
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="grid2">
        <div className="field"><label htmlFor="b-a1">Apgar, 1º minuto</label>
          <input className="inp" id="b-a1" name="apgar1" inputMode="numeric" autoComplete="off" defaultValue={c.apgar1 ?? ''} aria-invalid={invalid(errs.apgar1)} /><Err msg={errs.apgar1} /></div>
        <div className="field"><label htmlFor="b-a5">Apgar, 5º minuto</label>
          <input className="inp" id="b-a5" name="apgar5" inputMode="numeric" autoComplete="off" defaultValue={c.apgar5 ?? ''} aria-invalid={invalid(errs.apgar5)} /><Err msg={errs.apgar5} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label htmlFor="b-bw">Peso ao nascer (kg)</label>
          <input className="inp" id="b-bw" name="bw" inputMode="decimal" autoComplete="off" placeholder="3,250" defaultValue={dec(c.birthWeightKg)} aria-invalid={invalid(errs.bw)} /><Err msg={errs.bw} /></div>
        <div className="field"><label htmlFor="b-bl">Comprimento ao nascer (cm)</label>
          <input className="inp" id="b-bl" name="bl" inputMode="decimal" autoComplete="off" placeholder="49" defaultValue={dec(c.birthLengthCm)} aria-invalid={invalid(errs.bl)} /><Err msg={errs.bl} /></div>
      </div>
      <div className="grid2">
        <div className="field"><label htmlFor="b-gest">Semanas de gestação</label>
          <input className="inp" id="b-gest" name="gest" inputMode="numeric" autoComplete="off" placeholder="39" defaultValue={c.gestWeeks ?? ''} aria-invalid={invalid(errs.gest)} /><Err msg={errs.gest} /></div>
        <div className="field"><label htmlFor="b-del">Tipo de parto</label>
          <select className="inp" id="b-del" name="delivery" defaultValue={c.delivery || ''}>
            <option value="">Não informado</option>
            {DELIVERY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
      </div>
      <div className="field"><label htmlFor="b-blood">Tipo sanguíneo</label>
        <select className="inp" id="b-blood" name="blood" defaultValue={c.blood || ''}>
          <option value="">Não informado</option>
          {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select></div>
      <p className="hint">Copie da carteirinha ou da certidão da maternidade. O app só guarda.</p>
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>Salvar</button>
    </form>
  );
}

export function HealthForm({ childId, nav }: { childId: string; nav: Nav }) {
  const { toast } = useUi();
  const c = useAppState().children.find((x) => x.id === childId);
  if (!c) return null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update((st) => {
      const k = st.children.find((x) => x.id === childId);
      if (k) { k.allergies = str(fd, 'allergies').trim(); k.ongoing = str(fd, 'ongoing').trim(); }
    });
    toast('Salvo.');
    nav.cardView(childId);
  }

  const area = { height: 'auto', padding: '12px 16px' } as const;
  return (
    <form noValidate onSubmit={submit}>
      <div className="field first"><label htmlFor="h-all">Alergias</label>
        <textarea className="inp" id="h-all" name="allergies" rows={3} maxLength={300} defaultValue={c.allergies} placeholder="Ex.: dipirona, leite de vaca. Escreva nenhuma se não houver." style={area} /></div>
      <div className="field"><label htmlFor="h-ong">Remédios e condições contínuas</label>
        <textarea className="inp" id="h-ong" name="ongoing" rows={3} maxLength={300} defaultValue={c.ongoing} placeholder="Ex.: asma, usa bombinha. Escreva nenhum se não houver." style={area} /></div>
      <p className="hint">Para mostrar a outro médico ou à escola. Siga sempre a orientação do pediatra.</p>
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>Salvar</button>
    </form>
  );
}

export function MeasureForm({ childId, id, nav }: { childId: string; id?: string; nav: Nav }) {
  const { toast } = useUi();
  const s = useAppState();
  const c = s.children.find((x) => x.id === childId);
  const m = s.measures.find((x) => x.id === id);
  const [errs, setErrs] = useState<Errs>({});
  if (!c) return null;
  // O perímetro cefálico só aparece até os 3 anos (ou se esta medida já tem um valor).
  const head = showHead(c) || m?.headCm != null;
  const word = heightWord(D.ageMonths(c.birth) ?? 99);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = str(fd, 'date');
    const w = parseDecimal(fd.get('weight'), 200);
    const ht = parseDecimal(fd.get('height'), 250);
    const hd = head ? parseDecimal(fd.get('head'), 200) : null;
    const next: Errs = {};
    if (!ISO.test(date) || date > D.todayISO()) next.date = 'Escolha uma data que já passou ou hoje.';
    if (w === undefined) next.weight = 'Digite o peso em kg, como 6,2.';
    if (ht === undefined) next.height = 'Digite em cm, como 62.';
    if (hd === undefined) next.head = 'Digite em cm, como 41,5.';
    if (!next.weight && !next.height && !next.head && w == null && ht == null && hd == null) next.weight = 'Preencha pelo menos uma medida.';
    setErrs(next);
    if (Object.keys(next).length) return;
    const data = { date, weightKg: w as number | null, heightCm: ht as number | null, headCm: hd as number | null };
    update((st) => {
      if (m) Object.assign(st.measures.find((x) => x.id === m.id)!, data);
      else st.measures.push({ id: uid(), childId, ...data });
    });
    toast('Medida salva.');
    nav.cardView(childId);
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field"><label htmlFor="ms-date">Data</label>
        <input className="inp" id="ms-date" name="date" type="date" max={D.todayISO()} defaultValue={m?.date || D.todayISO()} aria-invalid={invalid(errs.date)} /><Err msg={errs.date} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="ms-w">Peso (kg)</label>
          <input className="inp" id="ms-w" name="weight" inputMode="decimal" autoComplete="off" placeholder="6,2" defaultValue={dec(m?.weightKg)} aria-invalid={invalid(errs.weight)} /><Err msg={errs.weight} /></div>
        <div className="field"><label htmlFor="ms-ht">{word === 'altura' ? 'Altura' : 'Comprimento'} (cm)</label>
          <input className="inp" id="ms-ht" name="height" inputMode="decimal" autoComplete="off" placeholder="62" defaultValue={dec(m?.heightCm)} aria-invalid={invalid(errs.height)} /><Err msg={errs.height} /></div>
      </div>
      {head && (
        <div className="field"><label htmlFor="ms-h">Perímetro cefálico (cm) <span className="muted">(até 3 anos)</span></label>
          <input className="inp" id="ms-h" name="head" inputMode="decimal" autoComplete="off" placeholder="41,5" defaultValue={dec(m?.headCm)} aria-invalid={invalid(errs.head)} /><Err msg={errs.head} /></div>
      )}
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>Salvar medida</button>
      {m && (
        <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => {
          update((st) => { st.measures = st.measures.filter((x) => x.id !== m.id); });
          toast('Removida.');
          nav.cardView(childId);
        }}>Remover medida</ArmButton>
      )}
    </form>
  );
}
