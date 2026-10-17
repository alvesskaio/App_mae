// Ícones de traço, desenhados em SVG simples. Todos são decorativos (aria-hidden).
import type { ReactNode } from 'react';

const make = (paths: ReactNode, sw = 1.8) =>
  function Icon({ size = 22 }: { size?: number }) {
    return (
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {paths}
      </svg>
    );
  };

export const Icons = {
  home: make(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></>),
  book: make(<><path d="M4 4.5h6.5a2 2 0 0 1 1.5.7 2 2 0 0 1 1.5-.7H20v14h-6.5a2 2 0 0 0-1.5.7 2 2 0 0 0-1.5-.7H4z" /><path d="M12 5.2v14" /></>),
  heart: make(<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />),
  chat: make(<path d="M4 5h16v11H9l-5 4z" />),
  camera: make(<><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></>),
  file: make(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></>),
  plus: make(<path d="M12 5v14M5 12h14" />, 2),
  chevron: make(<path d="M9 5l7 7-7 7" />),
  back: make(<path d="M15 5l-7 7 7 7" />, 2),
  close: make(<path d="M6 6l12 12M18 6 6 18" />, 2),
  send: make(<path d="M5 12h14M13 6l6 6-6 6" />, 2),
};
