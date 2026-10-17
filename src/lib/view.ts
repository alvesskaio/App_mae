// Aba aberta na tela do filho (Escola ou Saúde). Vale só durante a sessão.
import { useSyncExternalStore } from 'react';
import type { Module } from './phases';

let tab: Module | null = null;
const listeners = new Set<() => void>();

export function setFilhoTab(t: Module | null) {
  tab = t;
  listeners.forEach((l) => l());
}

export const useFilhoTab = (): Module | null =>
  useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => tab,
    () => null,
  );
