'use client';
// Cadastro inicial: boas-vindas, consentimento e 3 etapas (gestação, filhos, rotina).
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  addChild, emptyOnb, loadExample, quiet, uid, update, useAppState, type OnbStep,
} from '@/lib/store';
import * as D from '@/lib/dates';
import { phaseLine, weeksOf } from '@/lib/phases';
import { resetChat } from '@/lib/chat';
import { Icons } from './Icons';
import { Err, invalid, useUi } from './Ui';
import { first, pal } from './parts';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (fd: FormData, k: string) => String(fd.get(k) || '').trim();
const goto = (step: OnbStep) => update((st) => { st.onb.step = step; });
type Errs = Record<string, string>;

function StepHeader({ n, back, onBack }: { n: number; back: OnbStep; onBack?: () => void }) {
  return (
    <header className="steps">
      <button type="button" className="back" aria-label="Voltar" onClick={() => { onBack?.(); goto(back); }}><Icons.back size={24} /></button>
      <div className="bars" role="img" aria-label={`Etapa ${n} de 3`}>
        {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
      </div>
      <span className="count">{n} de 3</span>
    </header>
  );
}

/* ---------- Boas-vindas ---------- */
function Welcome() {
  const router = useRouter();
  const name0 = useAppState().motherName;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = str(new FormData(e.currentTarget), 'name');
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter && submitter.value === 'example') {
      loadExample(name);
      resetChat();
      router.push('/');
    } else {
      update((st) => { st.motherName = name; st.onb.step = 'consent'; });
    }
  }

  return (
    <div className="welcome">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mark" src="/icons/owl.png" alt="" width={96} height={96} />
      <h1 className="h1 xl">Bem-vinda</h1>
      <p className="lead">Organize saúde, escola e compromissos dos seus filhos num lugar só, da gestação até os 14 anos.</p>
      <p className="lead small">O que você digitar fica salvo só neste aparelho.</p>
      <form noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="w-name">Como você se chama?</label>
          <input className="inp" id="w-name" name="name" autoComplete="given-name" maxLength={40} placeholder="Seu nome" defaultValue={name0} />
        </div>
        <button className="btn block" type="submit" name="intent" value="empty" style={{ marginTop: 20 }}>Começar</button>
        {process.env.NODE_ENV !== 'production' && (
          <button className="btn line block" type="submit" name="intent" value="example" style={{ marginTop: 10 }}>Ver com dados de exemplo</button>
        )}
      </form>
    </div>
  );
}

/* ---------- Consentimento ---------- */
function Consent() {
  const { dados } = useDados();
  const c = useAppState().consent;
  const [health, setHealth] = useState(c.health);
  const [legal, setLegal] = useState(c.legal);
  const [stats, setStats] = useState(c.stats);
  const [err, setErr] = useState('');

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!(health && legal)) { setErr('Marque as duas primeiras para continuar.'); return; }
    update((st) => {
      st.consent = { health, legal, stats, at: D.todayISO() };
      st.onb.step = 'e1';
    });
  }

  // Guarda a cada marcação, para o rascunho sobreviver a "Voltar".
  const save = (h: boolean, l: boolean, s: boolean) => quiet((st) => { st.consent.health = h; st.consent.legal = l; st.consent.stats = s; });

  return (
    <div className="onb">
      <p className="kicker-dark">Antes de perguntar qualquer coisa</p>
      <h1 className="h1">Seus dados e os dos seus filhos</h1>
      <p className="lead small-lead">Para lembrar de consultas e da escola, o app guarda informações de saúde: gestação, consultas, exames e vacinas. Só você vê. Nós não vendemos nem repassamos esses dados.</p>
      <form noValidate onSubmit={submit}>
        <div className="consent col">
          <div className="crow"><input id="k-health" name="health" type="checkbox" checked={health} onChange={(e) => { setHealth(e.target.checked); save(e.target.checked, legal, stats); }} />
            <label htmlFor="k-health"><b>Obrigatório.</b> Autorizo o uso dos meus dados de saúde e de gestação para criar lembretes e organizar minha agenda.</label></div>
          <div className="crow"><input id="k-legal" name="legal" type="checkbox" checked={legal} onChange={(e) => { setLegal(e.target.checked); save(health, e.target.checked, stats); }} />
            <label htmlFor="k-legal"><b>Obrigatório.</b> Sou responsável legal pelos filhos que vou cadastrar e autorizo o uso dos dados deles.</label></div>
          <div className="crow sep"><input id="k-stats" name="stats" type="checkbox" checked={stats} onChange={(e) => { setStats(e.target.checked); save(health, legal, e.target.checked); }} />
            <label htmlFor="k-stats"><b>Opcional.</b> Aceito que minhas respostas, sem nome e sem identificação, entrem em estatísticas do app. Posso desligar isso depois.</label></div>
        </div>
        <p className="hint pad">A terceira opção fica desmarcada de propósito. Dá para usar o app inteiro sem ela. Você pode apagar tudo quando quiser, em Eu.</p>
        <button type="button" className="link pad" onClick={dados}>Ler como cuidamos dos dados, por inteiro</button>
        <Err msg={err} />
        <button className="btn block big" type="submit" style={{ marginTop: 14 }} disabled={!(health && legal)}>Aceitar e continuar</button>
        <p className="hint center">O botão só libera com as duas primeiras marcadas.</p>
      </form>
      <button type="button" className="link center-link" onClick={() => goto('welcome')}>Voltar</button>
    </div>
  );
}

function useDados() {
  const { openSheet } = useUi();
  return {
    dados: () => openSheet('Como cuidamos dos dados', (
      <>
        <p className="detail">Nesta versão de teste, tudo o que você digita e fotografa fica salvo só neste aparelho, no navegador. Nada é enviado a servidor, não existe conta nem senha, e nenhuma mensagem de WhatsApp é enviada de verdade.</p>
        <p className="detail">Se você limpar os dados do navegador ou apagar tudo, as informações somem e não dá para recuperar.</p>
        <p className="detail muted">Texto provisório. Antes de lançar de verdade, o consentimento para dados de gestação, de saúde e de crianças precisa de revisão jurídica (LGPD).</p>
      </>
    )),
  };
}

/* ---------- Etapa 1: está grávida? ---------- */
function E1() {
  const o = useAppState().onb;
  const [dpp, setDpp] = useState(o.dpp);
  const [errs, setErrs] = useState<Errs>({});
  const w = weeksOf(dpp);

  const pick = (v: 'sim' | 'nao' | 'pular') => update((st) => { st.onb.pregnant = v; st.onb.dpp = v === 'sim' ? dpp : ''; });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!o.pregnant) { setErrs({ pregnant: 'Escolha uma das opções.' }); return; }
    let value = '';
    if (o.pregnant === 'sim') {
      value = dpp;
      if (value && (!ISO.test(value) || value < D.todayISO() || value > D.addDays(D.todayISO(), 300))) {
        setErrs({ dpp: 'Use uma data entre hoje e os próximos 10 meses, ou deixe em branco.' });
        return;
      }
    }
    update((st) => { st.onb.dpp = value; st.onb.step = 'e2'; });
  }

  const opt = (v: 'sim' | 'nao' | 'pular', label: string) => (
    <button type="button" className={`opt${o.pregnant === v ? ' on' : ''}`} aria-pressed={o.pregnant === v} onClick={() => pick(v)}>{label}</button>
  );

  return (
    <div className="onb">
      <StepHeader n={1} back="consent" onBack={() => quiet((st) => { st.onb.dpp = dpp; })} />
      <h1 className="h1">Você está grávida?</h1>
      <p className="sub">É só para organizar as consultas do pré-natal. Você pode mudar isso depois.</p>
      <form noValidate onSubmit={submit}>
        <div className="opts">{opt('sim', 'Sim, estou grávida')}{opt('nao', 'Não')}{opt('pular', 'Prefiro não responder agora')}</div>
        {o.pregnant === 'sim' && (
          <>
            <div className="card">
              <label htmlFor="o-dpp" className="lbl">Data prevista do parto</label>
              <input className="inp" id="o-dpp" name="dpp" type="date" value={dpp} min={D.todayISO()} max={D.addDays(D.todayISO(), 300)} aria-invalid={invalid(errs.dpp)}
                onChange={(e) => { setDpp(e.target.value); quiet((st) => { st.onb.dpp = e.target.value; }); }} />
              <p className="live" id="o-weeks">{w == null ? '' : `Com essa data, você está na ${w}ª semana.`}</p>
              <p className="hint">Ainda não sabe a data? Deixe em branco e preencha quando souber. A data muda com o ultrassom, e dá para corrigir a qualquer momento.</p>
              <Err msg={errs.dpp} />
            </div>
            <p className="note-lilac">É gestação de gêmeos? Isso você marca depois, em Editar gestação.</p>
          </>
        )}
        <Err msg={errs.pregnant} />
        <button className="btn block big" type="submit" style={{ marginTop: 18 }}>Continuar</button>
      </form>
    </div>
  );
}

/* ---------- Etapa 2: já tem filhos? ---------- */
function E2() {
  const o = useAppState().onb;
  const [errs, setErrs] = useState<Errs>({});
  const [birth, setBirth] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const phaseOk = ISO.test(birth) && birth <= D.todayISO();

  // Lê nome e data do formulário. Devolve false se algum estiver inválido; vazios não contam.
  function addKid(): boolean {
    const f = formRef.current!;
    const name = (f.elements.namedItem('name') as HTMLInputElement).value.trim();
    const date = (f.elements.namedItem('birth') as HTMLInputElement).value;
    const next: Errs = {};
    if (!name) next.name = 'Digite o nome da criança.';
    if (!ISO.test(date) || date > D.todayISO()) next.birth = 'Escolha uma data que já passou.';
    setErrs(next);
    if (Object.keys(next).length) return false;
    update((st) => { st.onb.kids.push({ id: uid(), name, birth: date }); });
    f.reset();
    setBirth('');
    return true;
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const skip = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.name === 'skip';
    const f = e.currentTarget;
    const filled = (f.elements.namedItem('name') as HTMLInputElement).value.trim() || (f.elements.namedItem('birth') as HTMLInputElement).value;
    if (!skip && filled && !addKid()) return;
    goto('e3');
  }

  return (
    <div className="onb">
      <StepHeader n={2} back="e1" />
      <h1 className="h1">Você já tem filhos?</h1>
      <p className="sub">Um apelido serve. Cada filho ganha o próprio perfil.</p>
      {o.kids.length > 0 && (
        <>
          <h2 className="h3 tight">Já adicionados</h2>
          <div className="list">
            {o.kids.map((k, i) => (
              <div className={`row static ${pal({ color: i + (o.pregnant === 'sim' ? 1 : 0) })}`} key={k.id}>
                <div className="tile sq"><b>{k.name.charAt(0).toUpperCase()}</b></div>
                <div className="grow"><p className="t">{k.name}</p><p className="s">Nasceu em {D.brDate(k.birth)}. {phaseLine({ kind: 'born', birth: k.birth, dpp: '' })}.</p></div>
                <button type="button" className="x" aria-label={`Remover ${k.name}`} onClick={() => update((st) => { st.onb.kids = st.onb.kids.filter((x) => x.id !== k.id); })}><Icons.close size={20} /></button>
              </div>
            ))}
          </div>
        </>
      )}
      <form noValidate ref={formRef} onSubmit={submit}>
        <div className="card">
          <div className="field first"><label htmlFor="k-name">Nome ou apelido</label>
            <input className="inp" id="k-name" name="name" maxLength={40} autoComplete="off" placeholder="Nome da criança" aria-invalid={invalid(errs.name)} /><Err msg={errs.name} /></div>
          <div className="field"><label htmlFor="k-birth">Data de nascimento</label>
            <input className="inp" id="k-birth" name="birth" type="date" max={D.todayISO()} aria-invalid={invalid(errs.birth)} onChange={(e) => setBirth(e.target.value)} /><Err msg={errs.birth} /></div>
          <p className="live" id="k-phase">{phaseOk ? `Fase: ${phaseLine({ kind: 'born', birth, dpp: '' })}.` : ''}</p>
          <button type="button" className="btn line block" style={{ marginTop: 12 }} onClick={addKid}>Adicionar filho</button>
        </div>
        <button className="btn block big" type="submit" style={{ marginTop: 16 }}>Continuar</button>
        <button type="submit" className="link center-link" name="skip" value="1">Não tenho{o.kids.length ? ' outros' : ''} filhos</button>
      </form>
    </div>
  );
}

/* ---------- Etapa 3: rotina ---------- */
const WD: [string, string, number][] = [['D', 'Domingo', 0], ['S', 'Segunda', 1], ['T', 'Terça', 2], ['Q', 'Quarta', 3], ['Q', 'Quinta', 4], ['S', 'Sexta', 5], ['S', 'Sábado', 6]];

function E3() {
  const router = useRouter();
  const r = useAppState().routine;
  const [errs, setErrs] = useState<Errs>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Guarda horário, férias e WhatsApp sem redesenhar (antes de voltar ou trocar um dia).
  function draft() {
    const f = formRef.current;
    if (!f) return;
    quiet((st) => {
      st.routine.start = (f.elements.namedItem('start') as HTMLInputElement).value || st.routine.start;
      st.routine.end = (f.elements.namedItem('end') as HTMLInputElement).value || st.routine.end;
      st.routine.vacation = (f.elements.namedItem('vacation') as HTMLInputElement).value.trim();
      st.routine.whatsapp = (f.elements.namedItem('whatsapp') as HTMLInputElement).value.trim();
    });
  }

  function toggleDay(n: number) {
    draft();
    update((st) => {
      const set = new Set(st.routine.days);
      if (set.has(n)) set.delete(n); else set.add(n);
      st.routine.days = [...set].sort();
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const zap = str(fd, 'whatsapp');
    const digits = zap.replace(/\D/g, '');
    if (zap && (digits.length < 10 || digits.length > 11)) {
      setErrs({ whatsapp: 'Use DDD e número, como (21) 98888-1234.' });
      return;
    }
    update((st) => {
      st.routine = { ...st.routine, start: str(fd, 'start') || st.routine.start, end: str(fd, 'end') || st.routine.end, vacation: str(fd, 'vacation'), whatsapp: zap };
      const made = [];
      if (st.onb.pregnant === 'sim') {
        made.push(addChild(st, { kind: 'pregnancy', name: `Bebê da ${first(st.motherName) || 'mamãe'}`, dpp: st.onb.dpp }));
      }
      st.onb.kids.forEach((k) => made.push(addChild(st, { kind: 'born', name: k.name, birth: k.birth })));
      st.currentChildId = made[0] ? made[0].id : null;
      st.onboarded = true;
      st.onb = emptyOnb();
    });
    resetChat();
    router.push('/');
  }

  return (
    <div className="onb">
      <StepHeader n={3} back="e2" onBack={draft} />
      <h1 className="h1">E a sua rotina?</h1>
      <p className="sub">Com isso o app sugere dias bons para consultas e não manda aviso na hora errada.</p>
      <form noValidate ref={formRef} onSubmit={submit}>
        <h2 className="lbl top-gap">Dias em que você trabalha</h2>
        <div className="days">
          {WD.map(([l, name, n]) => (
            <button key={n} type="button" className={`day${r.days.includes(n) ? ' on' : ''}`} aria-pressed={r.days.includes(n)} aria-label={name} onClick={() => toggleDay(n)}>{l}</button>
          ))}
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="r-start">Entra às</label><input className="inp" id="r-start" name="start" type="time" defaultValue={r.start} /></div>
          <div className="field"><label htmlFor="r-end">Sai às</label><input className="inp" id="r-end" name="end" type="time" defaultValue={r.end} /></div>
        </div>
        <div className="field"><label htmlFor="r-vac">Próximas férias <span className="muted">(opcional)</span></label>
          <input className="inp" id="r-vac" name="vacation" maxLength={40} placeholder="Ex.: 5 a 19 de janeiro" defaultValue={r.vacation} /></div>
        <div className="card">
          <label htmlFor="r-zap" className="lbl">Seu WhatsApp, para os avisos <span className="muted">(opcional)</span></label>
          <input className="inp" id="r-zap" name="whatsapp" type="tel" inputMode="tel" maxLength={20} placeholder="(21) 98888-1234" defaultValue={r.whatsapp} aria-invalid={invalid(errs.whatsapp)} />
          <p className="hint">Todo aviso diz de qual filho é. Nesta versão de teste nenhuma mensagem é enviada de verdade.</p>
          <Err msg={errs.whatsapp} />
        </div>
        <button className="btn block big" type="submit" style={{ marginTop: 18 }}>Concluir e ver meu dia</button>
      </form>
    </div>
  );
}

export const ONB_TITLES: Record<OnbStep, string> = {
  welcome: 'Bem-vinda', consent: 'Seus dados', e1: 'Cadastro, etapa 1', e2: 'Cadastro, etapa 2', e3: 'Cadastro, etapa 3',
};

export default function Onboarding() {
  const step = useAppState().onb.step;
  switch (step) {
    case 'consent': return <Consent />;
    case 'e1': return <E1 />;
    case 'e2': return <E2 />;
    case 'e3': return <E3 />;
    default: return <Welcome />;
  }
}
