'use client';
// Exames do pré-natal: lista por semana (agora, atrasados, próximos, feitos) e registro de cada um.
import { useState, type FormEvent } from 'react';
import { uid, update, useAppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { shrink } from '@/lib/photo';
import { EXAMS, prenatalOf, weeksLabel } from '@/lib/prenatal';
import { ArmButton, Err, invalid, useUi } from './Ui';
import { Icons } from './Icons';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) || '');

// Abertura de outras folhas (vem de useSheets, passada por quem chama, para não haver import circular).
interface Nav {
  prenatalList: (childId: string) => void;
  prenatalForm: (childId: string, examId: string) => void;
  gestacaoForm: (childId: string) => void;
}

export function PrenatalList({ childId, nav }: { childId: string; nav: Nav }) {
  const s = useAppState();
  const c = s.children.find((x) => x.id === childId);
  if (!c) return null;
  const p = prenatalOf(c, s.prenatal);
  const examOf = (id: string) => EXAMS.find((e) => e.id === id);

  const row = (e: (typeof EXAMS)[number], tone?: string) => (
    <button type="button" className="row flatrow" key={e.id} onClick={() => nav.prenatalForm(childId, e.id)}>
      <div className="grow"><p className="t">{e.exame}</p><p className="s">{weeksLabel(e)}{tone ? `. ${tone}` : ''}</p></div>
      <span className="linkish">Feito</span>
    </button>
  );

  return (
    <>
      <p className="hint">Rascunho a validar com a equipe de saúde. A obstetra define o que você faz e quando.</p>
      {p.weeks == null && (
        <div className="alert soft">
          <p>Informe a data prevista do parto para ver os exames da sua semana.</p>
          <button type="button" className="link" onClick={() => nav.gestacaoForm(childId)}>Informar data prevista</button>
        </div>
      )}
      {p.now.length > 0 && <><h3 className="h3 tight">Nesta fase, semana {p.weeks}</h3><div className="list">{p.now.map((e) => row(e))}</div></>}
      {p.late.length > 0 && <><h3 className="h3 tight">Passou da semana</h3><div className="list">{p.late.map((e) => row(e, 'Já passou'))}</div></>}
      {p.next.length > 0 && <><h3 className="h3 tight">{p.weeks == null ? 'Todos os exames' : 'Próximos'}</h3><div className="list">{p.next.map((e) => row(e))}</div></>}
      {p.done.length > 0 && (
        <>
          <h3 className="h3 tight">Feitos</h3>
          <div className="list">
            {p.done.map((r) => (
              <button type="button" className="row flatrow" key={r.id} onClick={() => nav.prenatalForm(childId, r.examId)}>
                <div className="grow"><p className="t">{examOf(r.examId)?.exame || r.examId}</p>
                  <p className="s">Feito em {D.brDate(r.date)}{r.note || r.photo ? ', com anotação' : ''}</p></div>
                <span className="muted"><Icons.chevron size={20} /></span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function PrenatalForm({ childId, examId, nav }: { childId: string; examId: string; nav: Nav }) {
  const { toast } = useUi();
  const s = useAppState();
  const exam = EXAMS.find((e) => e.id === examId);
  const rec = s.prenatal.find((r) => r.childId === childId && r.examId === examId);
  const [err, setErr] = useState<Record<string, string>>({});
  if (!exam) return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = str(fd, 'date');
    if (!ISO.test(date) || date > D.todayISO()) { setErr({ date: 'Escolha uma data que já passou ou hoje.' }); return; }
    let photo = fd.get('removePhoto') === 'on' ? null : (rec?.photo ?? null);
    const file = fd.get('photo');
    if (file instanceof File && file.size > 0) {
      try { photo = await shrink(file); } catch { setErr({ photo: 'Não consegui abrir essa foto.' }); return; }
    }
    const data = { date, note: str(fd, 'note').trim(), photo };
    const ok = update((st) => {
      const cur = st.prenatal.find((r) => r.childId === childId && r.examId === examId);
      if (cur) Object.assign(cur, data);
      else st.prenatal.push({ id: uid(), childId, examId, ...data });
    });
    if (!ok) {
      update((st) => { const cur = st.prenatal.find((r) => r.childId === childId && r.examId === examId); if (cur) cur.photo = rec?.photo ?? null; });
      toast('A foto não coube neste navegador. O exame foi guardado sem ela.');
    } else toast('Exame registrado.');
    nav.prenatalList(childId);
  }

  return (
    <form noValidate onSubmit={submit}>
      <p className="detail">{exam.exame}</p>
      <div className="field"><label htmlFor="px-date">Data em que foi feito</label>
        <input className="inp" id="px-date" name="date" type="date" max={D.todayISO()} defaultValue={rec?.date || D.todayISO()} aria-invalid={invalid(err.date)} /><Err msg={err.date} /></div>
      <div className="field"><label htmlFor="px-note">Como foi <span className="muted">(opcional)</span></label>
        <textarea className="inp" id="px-note" name="note" rows={4} maxLength={2000} defaultValue={rec?.note} placeholder="Resultado, o que a médica disse" style={{ height: 'auto', padding: '12px 16px' }} /></div>
      <div className="field"><label htmlFor="px-photo">Foto do resultado <span className="muted">(opcional)</span></label>
        {rec?.photo && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo-prev" src={rec.photo} alt="Foto atual do resultado" style={{ marginBottom: 10 }} />
            <label className="crow"><input type="checkbox" name="removePhoto" /><span>Remover esta foto</span></label>
          </>
        )}
        <input className="inp file" id="px-photo" name="photo" type="file" accept="image/*" aria-invalid={invalid(err.photo)} /><Err msg={err.photo} /></div>
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>{rec ? 'Salvar' : 'Marcar como feito'}</button>
      {rec && (
        <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => {
          update((st) => { st.prenatal = st.prenatal.filter((r) => !(r.childId === childId && r.examId === examId)); });
          toast('Voltou para a lista.');
          nav.prenatalList(childId);
        }}>Desmarcar como feito</ArmButton>
      )}
    </form>
  );
}
