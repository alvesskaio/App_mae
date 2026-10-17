'use client';
import { useEffect } from 'react';

// Registra o service worker (abre o app sem internet). Só em https ou localhost.
export default function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
