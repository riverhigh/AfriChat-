import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onOfflineReady() {
            window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
          },
          onNeedRefresh() {
            window.dispatchEvent(new CustomEvent('pwa-need-refresh'));
          },
        });
      })
      .catch(() => {});
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k.includes('workbox') || k.includes('agc-')).map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }
}

createRoot(document.getElementById('root')!).render(<App />);
