import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev/preview mode, unregister any lingering Workbox SW (/sw.js or /dev-sw.js) and purge stale SW caches
    // while keeping standalone /sw-push.js intact for Web Push lock-screen alerts.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        Promise.all(
          regs
            .filter((r) => {
              const scriptUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
              return !scriptUrl.includes('/sw-push.js');
            })
            .map((r) => r.unregister())
        )
      )
      .catch(() => {});
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('workbox-') || k.startsWith('vite-pwa') || k.startsWith('agc-'))
              .map((k) => caches.delete(k))
          )
        )
        .catch(() => {});
    }
  } else {
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const updateSW = registerSW({
          immediate: true,
          onOfflineReady() {
            window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
          },
          onNeedRefresh() {
            window.dispatchEvent(new CustomEvent('pwa-need-refresh'));
          },
        });
        (window as any).__agcUpdateSW = updateSW;
      })
      .catch(() => {});
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
