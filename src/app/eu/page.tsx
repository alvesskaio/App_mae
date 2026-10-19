'use client';
// Eu: área da mãe (perfil, rotina, WhatsApp, privacidade e conta).
import Link from 'next/link';
import { activeChildren, endedChildren, getState, update, useAppState, type AlertPrefs } from '@/lib/store';
import * as D from '@/lib/dates';
import { Icons } from '@/components/Icons';
import { initialOf } from '@/components/parts';
import { useSheets } from '@/components/sheets';
import { useUi } from '@/components/Ui';

const DN = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function download() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `owl-day-dados-${D.todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Switch({ id, on, onToggle }: { id: string; on: boolean; onToggle: () => void }) {
  return <button type="button" className="switch" role="switch" aria-checked={on} aria-labelledby={id} onClick={onToggle}><i /></button>;
}

const ALERTS: [keyof AlertPrefs, string][] = [['exames', 'exames'], ['vacinas', 'vacinas'], ['remedios', 'remédios']];

// Ferramenta de desenvolvimento: o Next troca NODE_ENV por "production" no build, então some da versão publicada.
const DEV = process.env.NODE_ENV !== 'production';

export default function Eu() {
  const s = useAppState();
  const sheets = useSheets();
  const { toast } = useUi();
  const r = s.routine;
  const ended = endedChildren(s);
  const active = activeChildren(s);

  // Gestante e mãe recente saem dos filhos cadastrados; só a experiência é guardada à parte.
  const born = active.filter((c) => c.kind === 'born');
  const pregnant = active.some((c) => c.kind === 'pregnancy');
  const recent = born.some((c) => (D.ageMonths(c.birth) ?? 99) < 12);
  const experienced = s.profile.experienced === true || born.length > 1;
  const traits = [pregnant && 'Gestante', recent && 'Mãe recente', experienced && 'Já tem experiência'].filter(Boolean) as string[];

  const sorted = [...r.days].sort();
  let range = 'Sem dias definidos';
  if (sorted.length) {
    const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
    range = contiguous && sorted.length > 2 ? `${DN[sorted[0]]} a ${DN[sorted[sorted.length - 1]]}` : sorted.map((d) => DN[d]).join(', ');
  }

  return (
    <>
      <header className="top">
        <div><h1 className="h1">Eu</h1><p className="sub">Só você vê esta área.</p></div>
        <div className="avatar" aria-hidden="true">{initialOf(s)}</div>
      </header>

      <h2 className="h2 sp">Perfil</h2>
      <div className="gcard">
        <button type="button" className="gline" onClick={sheets.profileForm}>
          <div className="grow"><p className="t">{s.motherName || 'Sem nome'}</p>
            <p className="s">{traits.length ? traits.join(' · ') : 'Conte um pouco sobre você'}</p></div>
          <span className="linkish">Editar</span>
        </button>
        {!pregnant && (
          <button type="button" className="gline" onClick={sheets.pregnancyForm}>
            <div className="grow"><p className="t">Estou grávida</p><p className="s">Acompanhe o pré-natal</p></div>
            <span className="linkish">Adicionar</span>
          </button>
        )}
        {ended.length > 0 && (
          <button type="button" className="gline" onClick={sheets.endedList}>
            <div className="grow"><p className="t">Acompanhamentos encerrados</p>
              <p className="s">{ended.length} guardado{ended.length > 1 ? 's' : ''}, escondido{ended.length > 1 ? 's' : ''} da tela inicial</p></div>
            <span className="muted"><Icons.chevron size={20} /></span>
          </button>
        )}
      </div>

      <h2 className="h2 sp">Minha rotina</h2>
      <div className="gcard">
        <button type="button" className="gline" onClick={sheets.routineForm}>
          <div className="grow"><p className="t">{range}, {D.timeLabel(r.start)} às {D.timeLabel(r.end)}</p>
            <p className="s">{r.vacation ? `Férias: ${r.vacation}` : 'Sem férias informadas'}</p></div>
          <span className="linkish">Editar</span>
        </button>
      </div>

      <h2 className="h2 sp">WhatsApp</h2>
      <div className="gcard">
        <button type="button" className="gline" onClick={sheets.whatsappForm}>
          <div className="grow"><p className="t">{r.whatsapp || 'Sem número'}</p><p className="s">{r.whatsapp ? 'Número dos avisos' : 'Sem número, sem avisos'}</p></div>
          <span className="linkish">{r.whatsapp ? 'Editar' : 'Adicionar número'}</span>
        </button>
        <div className="gline">
          <div className="grow"><p className="t" id="sw-sil">Silêncio das 22h às 7h</p><p className="s">Sem mensagens de madrugada</p></div>
          <Switch id="sw-sil" on={r.silence} onToggle={() => update((st) => { st.routine.silence = !st.routine.silence; })} />
        </div>
        {r.whatsapp && (
          <>
            {ALERTS.map(([k, label]) => (
              <div className="gline" key={k}>
                <div className="grow"><p className="t" id={`sw-${k}`}>Avisos de {label}</p></div>
                <Switch id={`sw-${k}`} on={r.alerts[k]} onToggle={() => update((st) => { st.routine.alerts[k] = !st.routine.alerts[k]; })} />
              </div>
            ))}
            <Link className="gline" href="/whatsapp/">
              <div className="grow"><p className="t">Ver mensagens</p></div>
              <span className="muted"><Icons.chevron size={20} /></span>
            </Link>
          </>
        )}
      </div>

      <h2 className="h2 sp">Privacidade e dados</h2>
      <div className="gcard">
        <button type="button" className="gline" onClick={sheets.consentView}>
          <div className="grow"><p className="t">Dados de saúde e filhos</p>
            <p className="s">{s.consent.at ? `Autorizado em ${D.brDate(s.consent.at)}` : 'Autorização pendente'}</p></div>
          <span className="linkish">Ver ou retirar</span>
        </button>
        <div className="gline">
          <div className="grow"><p className="t" id="sw-est">Estatísticas anônimas</p>
            <p className="s">Não identificam você nem seu filho. Hoje nenhum dado sai do seu aparelho; sua escolha fica guardada.</p></div>
          <Switch id="sw-est" on={s.consent.stats} onToggle={() => update((st) => { st.consent.stats = !st.consent.stats; })} />
        </div>
        <button type="button" className="gline" onClick={() => { download(); toast('Arquivo baixado.'); }}>
          <div className="grow"><p className="t">Baixar meus dados</p><p className="s">Um arquivo com tudo o que está guardado</p></div>
          <span className="linkish">Baixar</span>
        </button>
      </div>

      <h2 className="h2 sp">Conta</h2>
      <button type="button" className="danger-text" onClick={sheets.apagarView}>Apagar minha conta</button>
      {DEV && <button type="button" className="link foot-link" onClick={sheets.testView}>Dados de exemplo (só desenvolvimento)</button>}
    </>
  );
}
