'use client';
// Lembretes livres da mãe (não são de nenhum filho): texto, data, hora opcional e repetição.
import { useState, type FormEvent } from 'react';
import { uid, update, useAppState } from '@/lib/store';
import * as D from '@/lib/dates';
import { REPEATS, WEEKDAYS, firstWeekly, repeatOf, type Repeat } from '@/lib/reminders';
import { ArmButton, Err, invalid, useUi } from './Ui';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) || '');

export function ReminderForm({ id }: { id?: string }) {
  const { closeSheet, toast } = useUi();
  const r = useAppState().reminders.find((x) => x.id === id);
  const [rep, setRep] = useState<Repeat>(r ? repeatOf(r) : 'none');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [date0, setDate0] = useState(r?.date || D.addDays(D.todayISO(), 1));
  // Sugestão de dia da semana: o dia da data escolhida (vale quando a repetição semanal é aberta).
  const picked = r?.weekdays && r.weekdays.length ? r.weekdays : [ISO.test(date0) ? D.dow(date0) : 1];

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = str(fd, 'text').trim();
    let date = str(fd, 'date');
    const until = rep === 'none' ? '' : str(fd, 'until');
    const weekdays = WEEKDAYS.map((w) => w[2]).filter((n) => fd.get(`d${n}`) === 'on');
    const next: Record<string, string> = {};
    if (!text) next.text = 'Escreva do que você quer lembrar.';
    if (!ISO.test(date)) next.date = 'Escolha a data.';
    if (rep === 'weekly' && !weekdays.length) next.weekdays = 'Escolha pelo menos um dia da semana.';
    if (until && (!ISO.test(until) || until < date)) next.until = 'A data final deve ser depois do primeiro dia.';
    setErrs(next);
    if (Object.keys(next).length) return;
    // Semanal: o primeiro aviso cai no primeiro dia escolhido a partir da data. Mensal e anual guardam o dia de origem.
    if (rep === 'weekly') date = firstWeekly(date, weekdays);
    const data = {
      text, date, time: str(fd, 'time'), repeat: rep, until,
      weekdays: rep === 'weekly' ? weekdays : [], day: rep === 'monthly' || rep === 'yearly' ? D.parseISO(date).getDate() : 0,
    };
    update((st) => {
      if (r) Object.assign(st.reminders.find((x) => x.id === r.id)!, data, { done: false });
      else st.reminders.push({ id: uid(), done: false, ...data });
    });
    closeSheet();
    toast('Lembrete salvo.');
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field first"><label htmlFor="l-text">Do que lembrar</label>
        <input className="inp" id="l-text" name="text" maxLength={120} autoComplete="off" placeholder="Ex.: pagar a mensalidade da escola" defaultValue={r?.text} aria-invalid={invalid(errs.text)} /><Err msg={errs.text} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="l-date">{rep === 'none' ? 'Dia' : 'A partir do dia'}</label>
          <input className="inp" id="l-date" name="date" type="date" value={date0} onChange={(e) => setDate0(e.target.value)} aria-invalid={invalid(errs.date)} /><Err msg={errs.date} /></div>
        <div className="field"><label htmlFor="l-time">Hora <span className="muted">(opcional)</span></label>
          <input className="inp" id="l-time" name="time" type="time" defaultValue={r?.time} /></div>
      </div>
      <div className="field"><label htmlFor="l-rep">Repetir</label>
        <select className="inp" id="l-rep" value={rep} onChange={(e) => setRep(e.target.value as Repeat)}>
          {REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select></div>
      {rep === 'weekly' && (
        <>
          <h3 className="lbl">Em quais dias da semana</h3>
          <div className="days">
            {WEEKDAYS.map(([l, name, n]) => (
              <label className="day dchk" key={n}><input type="checkbox" name={`d${n}`} aria-label={name} defaultChecked={picked.includes(n)} /><span>{l}</span></label>
            ))}
          </div>
          <Err msg={errs.weekdays} />
        </>
      )}
      {rep === 'monthly' && <p className="hint">Repete todo mês no mesmo dia do número escolhido. Em meses mais curtos, vale o último dia.</p>}
      {rep !== 'none' && (
        <div className="field"><label htmlFor="l-until">Repetir até <span className="muted">(opcional)</span></label>
          <input className="inp" id="l-until" name="until" type="date" defaultValue={r?.until || ''} aria-invalid={invalid(errs.until)} /><Err msg={errs.until} /></div>
      )}
      <p className="hint">É um lembrete seu, não de um filho. Aparece na tela inicial. O aviso por WhatsApp ainda não existe.</p>
      <button className="btn block big" type="submit" style={{ marginTop: 14 }}>Salvar lembrete</button>
      {r && (
        <ArmButton className="btn line block" style={{ marginTop: 10 }} onConfirm={() => {
          update((st) => { st.reminders = st.reminders.filter((x) => x.id !== r.id); });
          closeSheet();
          toast('Removido.');
        }}>{repeatOf(r) === 'none' ? 'Remover lembrete' : 'Remover este e os próximos'}</ArmButton>
      )}
    </form>
  );
}
