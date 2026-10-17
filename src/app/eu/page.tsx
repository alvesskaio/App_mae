'use client';
// Eu: área da mãe (rotina, avisos, privacidade, baixar e apagar dados).
import Link from 'next/link';
import { endedChildren, getState, update, useAppState } from '@/lib/store';
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
  a.download = `app-mae-dados-${D.todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Switch({ id, on, onToggle }: { id: string; on: boolean; onToggle: () => void }) {
  return <button type="button" className="switch" role="switch" aria-checked={on} aria-labelledby={id} onClick={onToggle}><i /></button>;
}

export default function Eu() {
  const s = useAppState();
  const sheets = useSheets();
  const { toast } = useUi();
  const r = s.routine;
  const ended = endedChildren(s);

  const sorted = [...r.days].sort();
  let range = 'Sem dias definidos';
  if (sorted.length) {
    const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
    range = contiguous && sorted.length > 2 ? `${DN[sorted[0]]} a ${DN[sorted[sorted.length - 1]]}` : sorted.map((d) => DN[d]).join(', ');
  }

  return (
    <>
      <header className="top">
        <div><h1 className="h1">Eu</h1><p className="sub">{s.motherName || 'Sua área'}. Só você vê esta área.</p></div>
        <div className="avatar" aria-hidden="true">{initialOf(s)}</div>
      </header>

      <h2 className="h2 sp">Minha rotina</h2>
      <button type="button" className="row flatrow" onClick={sheets.routineForm}>
        <div className="grow"><p className="t">{range}, {D.timeLabel(r.start)} às {D.timeLabel(r.end)}</p>
          <p className="s">{r.vacation ? `Férias: ${r.vacation}` : 'Sem férias informadas'}</p></div>
        <span className="linkish">Editar</span>
      </button>

      <h2 className="h2 sp">Avisos no WhatsApp</h2>
      <div className="list">
        <div className="row static flatrow">
          <div className="grow"><p className="t">{r.whatsapp || 'Sem número'}</p><p className="s">{r.whatsapp ? 'Cadastrado' : 'Sem número, sem avisos'}</p></div>
          <Link className="linkish" href="/whatsapp/">Ver mensagens</Link>
        </div>
        <div className="row static flatrow">
          <div className="grow"><p className="t" id="sw-sil">Silêncio das 22h às 7h</p><p className="s">Sem mensagens de madrugada</p></div>
          <Switch id="sw-sil" on={r.silence} onToggle={() => update((st) => { st.routine.silence = !st.routine.silence; })} />
        </div>
      </div>

      <h2 className="h2 sp">Privacidade</h2>
      <div className="list">
        <button type="button" className="row lilacrow" onClick={sheets.consentView}>
          <div className="grow"><p className="t">Dados de saúde e filhos</p>
            <p className="s">{s.consent.at ? `Autorizado em ${D.brDate(s.consent.at)}` : 'Autorização pendente'}</p></div>
          <span className="linkish">Ver ou retirar</span>
        </button>
        <div className="row static flatrow">
          <div className="grow"><p className="t" id="sw-est">Estatísticas sem nome</p>
            <p className="s">{s.consent.stats ? 'Ligado. Nesta versão de teste nada é enviado.' : 'Desligado. Você pode mudar quando quiser.'}</p></div>
          <Switch id="sw-est" on={s.consent.stats} onToggle={() => update((st) => { st.consent.stats = !st.consent.stats; })} />
        </div>
        {ended.length > 0 && (
          <button type="button" className="row flatrow" onClick={sheets.endedList}>
            <div className="grow"><p className="t">Acompanhamentos encerrados</p>
              <p className="s">{ended.length} guardado{ended.length > 1 ? 's' : ''}, escondido{ended.length > 1 ? 's' : ''} da tela inicial</p></div>
            <span className="muted"><Icons.chevron size={20} /></span>
          </button>
        )}
      </div>
      <div className="actions">
        <button type="button" className="btn line grow" onClick={() => { download(); toast('Arquivo baixado.'); }}>Baixar meus dados</button>
        <button type="button" className="btn line grow" onClick={sheets.apagarView}>Apagar minha conta</button>
      </div>
      <button type="button" className="link foot-link" onClick={sheets.testView}>Dados de teste e exemplo</button>
    </>
  );
}
