'use client';
// Cadastro de um filho que já nasceu. O consentimento já foi dado no início (Eu, Privacidade).
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addChild, update } from '@/lib/store';
import * as D from '@/lib/dates';
import { phaseLine } from '@/lib/phases';
import { setFilhoTab } from '@/lib/view';
import { resetChat } from '@/lib/chat';
import { Icons } from '@/components/Icons';
import { Err, invalid, useUi } from '@/components/Ui';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default function NovoFilho() {
  const router = useRouter();
  const { toast } = useUi();
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [birth, setBirth] = useState('');

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const val = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value || '').trim();
    const name = val('name');
    const date = val('birth');
    const next: Record<string, string> = {};
    if (!name) next.name = 'Digite o nome da criança.';
    if (!ISO.test(date) || date > D.todayISO()) next.birth = 'Escolha uma data que já passou.';
    setErrs(next);
    if (Object.keys(next).length) return;
    update((st) => {
      const c = addChild(st, { kind: 'born', name, birth: date, school: val('school'), grade: val('grade') });
      st.currentChildId = c.id;
    });
    resetChat();
    setFilhoTab(null);
    router.push('/filho/');
    toast(`${name} adicionado.`);
  }

  return (
    <>
      <header className="top-back"><Link className="back" href="/" aria-label="Voltar"><Icons.back size={24} /></Link></header>
      <h1 className="h1 big-title">Adicionar filho</h1>
      <form noValidate onSubmit={submit}>
        <div className="field"><label htmlFor="c-name">Nome ou apelido</label>
          <input className="inp" id="c-name" name="name" maxLength={40} autoComplete="off" placeholder="Nome da criança" aria-invalid={invalid(errs.name)} />
          <Err msg={errs.name} /></div>
        <div className="field"><label htmlFor="c-birth">Data de nascimento</label>
          <input className="inp" id="c-birth" name="birth" type="date" max={D.todayISO()} aria-invalid={invalid(errs.birth)} onChange={(e) => setBirth(e.target.value)} />
          <Err msg={errs.birth} /></div>
        <p className="live" id="c-phase">{ISO.test(birth) && birth <= D.todayISO() ? `Fase: ${phaseLine({ kind: 'born', birth, dpp: '' })}.` : ''}</p>
        <div className="field"><label htmlFor="c-school">Escola <span className="muted">(opcional)</span></label>
          <input className="inp" id="c-school" name="school" maxLength={60} autoComplete="off" placeholder="Nome da escola" /></div>
        <div className="field"><label htmlFor="c-grade">Ano ou série <span className="muted">(opcional)</span></label>
          <input className="inp" id="c-grade" name="grade" maxLength={30} autoComplete="off" placeholder="Ex.: 3º ano" /></div>
        <p className="hint">Os dados deste filho seguem a autorização que você já deu. Veja em Eu, Privacidade.</p>
        <button className="btn block big" type="submit" style={{ marginTop: 18 }}>Salvar</button>
      </form>
    </>
  );
}
