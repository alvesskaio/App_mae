'use client';
// Utilidades de interface: folhas (bottom sheets), avisos e seletor de foto.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icons } from './Icons';
import { shrink } from '@/lib/photo';
import { setSaveErrorHandler } from '@/lib/store';

interface SheetData { title: string; body: ReactNode }

interface UiApi {
  toast: (msg: string) => void;
  openSheet: (title: string, body: ReactNode) => void;
  closeSheet: () => void;
  sheetOpen: boolean;
  pickPhoto: () => Promise<string | null>;
}

const Ctx = createContext<UiApi | null>(null);

export function useUi(): UiApi {
  const ui = useContext(Ctx);
  if (!ui) throw new Error('useUi fora do UiProvider');
  return ui;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(null), 2800);
  }, []);

  const openSheet = useCallback((title: string, body: ReactNode) => {
    setSheet((cur) => {
      if (!cur) lastFocus.current = document.activeElement as HTMLElement | null;
      return { title, body };
    });
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  const pickPhoto = useCallback(() => new Promise<string | null>((resolve) => {
    const input = fileInput.current;
    if (!input) { resolve(null); return; }
    input.value = '';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) { resolve(null); return; }
      try {
        resolve(await shrink(file));
      } catch {
        toast('Não consegui abrir essa foto. Tente outra.');
        resolve(null);
      }
    };
    input.click();
  }), [toast]);

  useEffect(() => {
    setSaveErrorHandler(() => toast('Não consegui salvar neste navegador. Os dados podem se perder ao fechar.'));
  }, [toast]);

  // Com a folha aberta, o resto da tela fica inerte e o foco vai para ela.
  const open = !!sheet;
  useEffect(() => {
    const app = document.getElementById('app');
    const nav = document.getElementById('nav');
    if (open) {
      if (app) app.inert = true;
      if (nav) nav.inert = true;
      sheetRef.current?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        if (app) app.inert = false;
        if (nav) nav.inert = false;
        const back = lastFocus.current;
        if (back && back.isConnected) back.focus({ preventScroll: true });
        lastFocus.current = null;
      };
    }
  }, [open]);

  const api = useMemo<UiApi>(
    () => ({ toast, openSheet, closeSheet, sheetOpen: open, pickPhoto }),
    [toast, openSheet, closeSheet, open, pickPhoto],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div id="sheet-root">
        {sheet && (
          <>
            <div className="backdrop" onClick={closeSheet} />
            <section ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1}>
              <div className="sheet-top">
                <h2 className="h2" id="sheet-title">{sheet.title}</h2>
                <button type="button" className="close" onClick={closeSheet} aria-label="Fechar"><Icons.close size={22} /></button>
              </div>
              {sheet.body}
            </section>
          </>
        )}
      </div>
      <div id="toast-root" role="status" aria-live="polite">
        {message && <div className="toast">{message}</div>}
      </div>
      <input ref={fileInput} type="file" accept="image/*" hidden />
    </Ctx.Provider>
  );
}

// Mensagem de erro de campo. Vazia, fica escondida pelo CSS (.err:empty).
export function Err({ msg }: { msg?: string }) {
  return <p className="err">{msg || ''}</p>;
}

export const invalid = (msg?: string) => (msg ? ('true' as const) : undefined);

// Botão de ação destrutiva: o primeiro toque pede confirmação, o segundo executa.
export function ArmButton({ className, onConfirm, style, children }: {
  className?: string;
  onConfirm: () => void;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className={`${className || ''}${armed ? ' danger' : ''}`}
      style={style}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setArmed(false), 4000);
        } else {
          clearTimeout(timer.current);
          setArmed(false);
          onConfirm();
        }
      }}
    >
      {armed ? 'Toque de novo para confirmar' : children}
    </button>
  );
}
