'use client';
// Casca do app: cadastro na primeira vez, menu de baixo e área da tela atual.
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeChildren, currentChild, useAppState } from '@/lib/store';
import { Icons } from './Icons';
import { UiProvider } from './Ui';
import Onboarding, { ONB_TITLES } from './Onboarding';
import { first } from './parts';

const ROUTES: Record<string, { title: string; nav: boolean; cls?: string }> = {
  '': { title: 'Hoje', nav: true },
  filho: { title: 'Filho', nav: true },
  eu: { title: 'Eu', nav: true },
  whatsapp: { title: 'Conversa', nav: false, cls: 'chat' },
  'novo-filho': { title: 'Adicionar filho', nav: false },
};

const noop = () => () => {};

export default function Shell({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const s = useAppState();
  const key = (usePathname() || '/').replace(/^\/|\/$/g, '');
  const def = ROUTES[key] || ROUTES[''];
  const onboarding = hydrated && !s.onboarded;
  const navOn = def.nav && !onboarding;
  const title = onboarding ? ONB_TITLES[s.onb.step] : def.title;

  const c = currentChild(s);
  const kids = activeChildren(s);
  const tabs: [string, string, string, keyof typeof Icons][] = [
    ['', '/', 'Hoje', 'home'],
    ['filho', '/filho/', kids.length === 1 && c ? first(c.name) : 'Filhos', 'heart'],
    ['eu', '/eu/', 'Eu', 'user'],
  ];

  // Troca de tela (ou de etapa do cadastro) volta ao topo e atualiza o título da aba.
  useEffect(() => {
    document.getElementById('app')?.scrollTo({ top: 0 });
    document.title = `${title} · App Mãe`;
  }, [key, title, onboarding]);

  return (
    <div id="shell" data-nav={navOn ? 'on' : 'off'}>
      <UiProvider>
        <main id="app" className={onboarding ? '' : def.cls || ''}>
          {hydrated && (onboarding ? <Onboarding /> : children)}
        </main>
        <nav id="nav" aria-label="Navegação principal">
          {navOn && tabs.map(([k, href, label, icon]) => {
            const on = k === key;
            const Icon = Icons[icon];
            const aria = k === 'filho' ? (c ? `Filho: ${c.name}` : 'Filhos') : label;
            return (
              <Link key={k} href={href} aria-label={aria} aria-current={on ? 'page' : undefined}>
                <Icon size={22} />{on && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </UiProvider>
    </div>
  );
}
