'use client';
// Conversa simulada de WhatsApp. O #app ganha a classe "chat" no Shell.
import { useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { ask, bootChat, boletimTarget, isTyping, quickQuestions, sendPhoto, useChat, type Msg } from '@/lib/chat';
import { useAppState } from '@/lib/store';
import { PHASES, phaseOf } from '@/lib/phases';
import { Icons } from '@/components/Icons';
import { kidOf, pal, useGotoKid } from '@/components/parts';
import { useSheets } from '@/components/sheets';
import { useUi } from '@/components/Ui';

export default function Whatsapp() {
  const s = useAppState();
  const { msgs, typing } = useChat();
  const { pickPhoto, toast } = useUi();
  const sheets = useSheets();
  const goto = useGotoKid();
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => { bootChat(); }, []);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('msg') as HTMLInputElement;
    const text = input.value;
    input.value = '';
    ask(text);
  }

  async function photo() {
    if (isTyping()) return;
    const target = boletimTarget();
    if (!target) { toast('O boletim vale a partir dos 6 anos. Nenhum filho está nessa fase.'); return; }
    const p = await pickPhoto();
    if (!p) return;
    if (!sendPhoto(p, target).saved) toast('Sem espaço para guardar a foto neste navegador.');
  }

  function linkOf(m: Msg) {
    const l = m.link;
    if (!l) return null;
    if (l.href) return <div className="qr"><Link className="chip line" href={l.href}>{l.label}</Link></div>;
    const onClick = l.kid ? () => goto(l.kid!.id, l.kid!.tab) : sheets.addMenu;
    return <div className="qr"><button type="button" className="chip line" onClick={onClick}>{l.label}</button></div>;
  }

  return (
    <>
      <div className="chat-head">
        <Link className="back" href="/" aria-label="Voltar ao app"><Icons.back size={24} /></Link>
        <div className="av" aria-hidden="true">A</div>
        <div><p className="nm">Owl Day</p><p className="st">Simulação da conversa no WhatsApp</p></div>
      </div>
      <div className="chat-list" ref={list} role="log" aria-live="polite" aria-label="Conversa">
        <div className="day">Hoje</div>
        {msgs.map((m, i) => {
          const k = m.child ? kidOf(s, m.child) : null;
          return (
            <div key={i} style={{ display: 'contents' }}>
              <div className={`msg ${m.from}`}>
                {k && <span className={`tag ${pal(k)}`}>{k.name} · {PHASES[phaseOf(k)].label}</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.img && <img className="chat-img" src={m.img} alt="Foto enviada" />}
                {m.text && <span className="txt">{m.text}</span>}
                <time>{m.time}</time>
              </div>
              {linkOf(m)}
              {m.chips && (
                <div className="qr">
                  {m.chips.map((n) => <button key={n} type="button" className="chip line" onClick={() => ask(`O que tem esta semana para ${n}?`)}>{n}</button>)}
                </div>
              )}
            </div>
          );
        })}
        {typing ? (
          <div className="msg bot typing" aria-label="digitando">digitando…</div>
        ) : (
          <div className="qr">
            {quickQuestions(s).map((q) => <button key={q} type="button" className="chip line" onClick={() => ask(q)}>{q}</button>)}
          </div>
        )}
      </div>
      <form className="chat-form" onSubmit={submit} autoComplete="off">
        <label className="sr" htmlFor="chat-msg">Mensagem</label>
        <input className="inp" id="chat-msg" name="msg" placeholder="Mensagem" maxLength={200} />
        <button type="button" className="cam sm" onClick={photo} aria-label="Enviar foto do boletim"><Icons.camera size={22} /></button>
        <button type="submit" className="cam sm" aria-label="Enviar"><Icons.send size={22} /></button>
      </form>
    </>
  );
}
