import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(true);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(Boolean(isStandalone));

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onPromptReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      setShowIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('pwa-prompt-ready', onPromptReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', onPromptReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (isInstalled) return null;
  if (!deferredPrompt && !isIos) return null;

  const handleClick = async () => {
    const promptEv = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptEv) {
      try {
        await promptEv.prompt();
        const choice = await promptEv.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          (window as any).deferredPwaPrompt = null;
        }
      } catch {}
      return;
    }
    if (isIos) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-white/90 hover:text-white transition-colors p-1.5 rounded-full bg-white/10 hover:bg-white/20"
        aria-label="Install AGC App"
        title="Install AGC App"
      >
        <Download className="w-4 h-4 text-emerald-300" />
      </button>

      {showIosGuide && (
        <div
          onClick={() => setShowIosGuide(false)}
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-[#160b2d] border border-purple-500/40 p-5 text-white shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Install AGC on iPhone / iPad</h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed flex flex-col gap-1.5">
              <span>
                1. Tap the <Share className="w-3.5 h-3.5 inline text-purple-300 mx-0.5" /> <strong>Share</strong> button in Safari.
              </span>
              <span>
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </span>
              <span>
                3. Tap <strong>Add</strong> for fast offline app launch.
              </span>
            </p>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
