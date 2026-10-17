'use client';
// Cadastro de filho, com consentimento do responsável.
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { uid, update } from '@/lib/store';
import * as D from '@/lib/dates';
import { Icons } from '@/components/Icons';
import { Err, invalid, useUi } from '@/components/Ui';
import { useSheets } from '@/components/sheets';

export default function NovoFilho() {
  const router = useRouter();
  const { toast } = useUi();
  const sheets = useSheets();
  const [errs, setErrs] = useState<Record<string, string>>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const val = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value || '').trim();
    const name = val('name');
    const birth = val('birth');
    const next: Record<string, string> = {};
    if (!name) next.name = 'Digite o nome da criança.';
    if (birth && birth > D.todayISO()) next.birth = 'A data não pode ser no futuro.';
    if (!(form.elements.namedItem('ok') as HTMLInputElement).checked) next.ok = 'Marque para continuar.';
    setErrs(next);
    if (Object.keys(next).length) return;
    const id = uid();
    update((st) => {
      st.children.push({ id, name, birth, school: val('school'), grade: val('grade') });
      st.currentChildId = id;
    });
    router.push('/');
    toast(`${name} adicionado.`);
  }

  return (
    <>
      <header className="top-back"><Link className="back" href="/" aria-label="Voltar"><Icons.back size={24} /></Link></header>
      <h1 className="h1 big-title">Adicionar filho</h1>
      <form noValidate onSubmit={submit}>
        <div className="field"><label htmlFor="c-name">Nome</label>
          <input className="inp round" id="c-name" name="name" maxLength={40} autoComplete="off" placeholder="Nome da criança" aria-invalid={invalid(errs.name)} />
          <Err msg={errs.name} /></div>
        <div className="field"><label htmlFor="c-birth">Data de nascimento</label>
          <input className="inp round" id="c-birth" name="birth" type="date" max={D.todayISO()} aria-invalid={invalid(errs.birth)} />
          <Err msg={errs.birth} /></div>
        <div className="field"><label htmlFor="c-school">Escola <span className="muted">(opcional)</span></label>
          <input className="inp round" id="c-school" name="school" maxLength={60} autoComplete="off" placeholder="Nome da escola" /></div>
        <div className="field"><label htmlFor="c-grade">Ano ou série</label>
          <input className="inp round" id="c-grade" name="grade" maxLength={30} autoComplete="off" placeholder="Ex.: 3º ano" /></div>
        <div className="consent">
          <input id="c-ok" name="ok" type="checkbox" aria-invalid={invalid(errs.ok)} />
          <label htmlFor="c-ok">Sou responsável legal por esta criança e autorizo o uso dos dados de saúde e de escola dela neste app. <button type="button" className="link" onClick={sheets.dados}>Como cuidamos dos dados</button></label>
        </div>
        <Err msg={errs.ok} />
        <button className="btn block big" type="submit" style={{ marginTop: 18 }}>Salvar</button>
      </form>
    </>
  );
}
