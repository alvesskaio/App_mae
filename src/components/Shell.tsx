'use client';
// Casca do app: boas-vindas na primeira vez, menu de baixo e área da tela atual.
import { useEffect, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { loadExample, update, useAppState } from '@/lib/store';
import { Icons } from './Icons';
import { UiProvider } from './Ui';

const ROUTES: Record<string, { title: string; nav: boolean; cls?: string }> = {
  '': { title: 'Início', nav: true },
  escola: { title: 'Escola', nav: true },
  saude: { title: 'Saúde', nav: true },
  whatsapp: { title: 'Conversa', nav: false, cls: 'chat' },
  'novo-filho': { title: 'Adicionar filho', nav: false },
};

const TABS: [string, string, string, keyof typeof Icons][] = [
  ['', '/', 'Início', 'home'],
  ['escola', '/escola/', 'Escola', 'book'],
  ['saude', '/saude/', 'Saúde', 'heart'],
  ['whatsapp', '/whatsapp/', 'WhatsApp', 'chat'],
];

const noop = () => () => {};

function Welcome() {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String((e.currentTarget.elements.namedItem('name') as HTMLInputElement).value || '').trim();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter && submitter.value === 'example') loadExample(name);
    else update((st) => { st.onboarded = true; st.motherName = name; });
  }

  return (
    <div className="welcome">
      <div className="mark" aria-hidden="true" />
      <h1 className="h1 xl">Bem-vinda</h1>
      <p className="lead">Organize escola, saúde e compromissos dos seus filhos num lugar só.</p>
      <p className="lead small">Esta é uma versão de teste: o que você digitar fica salvo só neste aparelho.</p>
      <form noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="w-name">Como você se chama?</label>
          <input className="inp" id="w-name" name="name" autoComplete="given-name" maxLength={40} placeholder="Seu nome" />
        </div>
        <button className="btn block" type="submit" name="intent" value="empty" style={{ marginTop: 20 }}>Começar do zero</button>
        <button className="btn line block" type="submit" name="intent" value="example" style={{ marginTop: 10 }}>Ver com dados de exemplo</button>
      </form>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const onboarded = useAppState().onboarded;
  const key = (usePathname() || '/').replace(/^\/|\/$/g, '');
  const def = ROUTES[key] || ROUTES[''];
  const welcome = hydrated && !onboarded;
  const navOn = def.nav && !welcome;

  // Troca de tela volta ao topo e atualiza o título da aba.
  useEffect(() => {
    document.getElementById('app')?.scrollTo({ top: 0 });
    document.title = `${welcome ? 'Bem-vinda' : def.title} · App Mãe`;
  }, [key, welcome, def.title]);

  return (
    <div id="shell" data-nav={navOn ? 'on' : 'off'}>
      <UiProvider>
        <main id="app" className={welcome ? '' : def.cls || ''}>
          {hydrated && (welcome ? <Welcome /> : children)}
        </main>
        <nav id="nav" aria-label="Navegação principal">
          {navOn && TABS.map(([k, href, label, icon]) => {
            const on = k === key;
            const Icon = Icons[icon];
            return (
              <Link key={k} href={href} aria-label={label} aria-current={on ? 'page' : undefined}>
                <Icon size={22} />{on && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
      </UiProvider>
    </div>
  );
}
