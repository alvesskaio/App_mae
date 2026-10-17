'use client';
// Conversa simulada de WhatsApp. O #app ganha a classe "chat" no Shell.
import { useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { ask, bootChat, QUICK, sendPhoto, useChat, isTyping } from '@/lib/chat';
import { Icons } from '@/components/Icons';
import { useUi } from '@/components/Ui';

export default function Whatsapp() {
  const { msgs, typing } = useChat();
  const { pickPhoto, toast } = useUi();
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
    const p = await pickPhoto();
    if (!p) return;
    if (!sendPhoto(p).saved) toast('Sem espaço para guardar a foto neste navegador.');
  }

  return (
    <>
      <div className="chat-head">
        <Link className="back" href="/" aria-label="Voltar ao app"><Icons.back size={24} /></Link>
        <div className="av" aria-hidden="true">A</div>
        <div><p className="nm">App Mãe</p><p className="st">Simulação da conversa no WhatsApp</p></div>
      </div>
      <div className="chat-list" ref={list} role="log" aria-live="polite" aria-label="Conversa">
        <div className="day">Hoje</div>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className={`msg ${m.from}`}>
              {m.img && /* eslint-disable-next-line @next/next/no-img-element */ <img className="chat-img" src={m.img} alt="Foto enviada" />}
              {m.text && <span>{m.text}</span>}
              <time>{m.time}</time>
            </div>
            {m.link && <div className="qr"><Link className="chip line" href={m.link.href}>{m.link.label}</Link></div>}
          </div>
        ))}
        {typing ? (
          <div className="msg bot typing" aria-label="digitando">digitando…</div>
        ) : (
          <div className="qr">
            {QUICK.map((q) => <button key={q} type="button" className="chip line" onClick={() => ask(q)}>{q}</button>)}
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
