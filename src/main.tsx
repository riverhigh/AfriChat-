import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerCurrentSW = () => {
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
  };

  if (import.meta.env.DEV) {
    // In dev mode, clean up any legacy /sw.js registration before activating VitePWA dev-sw
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        Promise.all(
          regs
            .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '').endsWith('/sw.js'))
            .map((r) => r.unregister())
        )
      )
      .catch(() => {})
      .finally(registerCurrentSW);
  } else {
    registerCurrentSW();
  }
}

createRoot(document.getElementById('root')!).render(<App />);
