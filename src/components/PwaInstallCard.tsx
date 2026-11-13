import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, Smartphone, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallCard: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) || null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState(true);

  const APP_VERSION = 'v2.4.0';
  const LATEST_VERSION = 'v2.5.0';

  useEffect(() => {
    // Check if running as installed standalone app
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(isStandaloneMode));

    // Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIos(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Initial check for globally cached prompt
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    // Listen for PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptReady = () => {
      if ((window as any).deferredPwaPrompt) {
        setDeferredPrompt((window as any).deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      setShowAndroidInstructions(false);
      setShowIosInstructions(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).deferredPwaPrompt);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') (window as any).deferredPwaPrompt = null;
          setIsStandalone(true);
          setShowAndroidInstructions(false);
          setShowIosInstructions(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isAndroid) {
      // Direct Android instructions (Chrome 3 dots)
      setShowAndroidInstructions((prev) => !prev);
      setShowIosInstructions(false);
    } else if (isIos) {
      // iOS Safari Share instructions
      setShowIosInstructions((prev) => !prev);
      setShowAndroidInstructions(false);
    } else {
      setShowAndroidInstructions((prev) => !prev);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 800));

      setHasNewUpdate(true);
      setUpdateStatus(`New release ${LATEST_VERSION} ready! Tap "Download Newest" to install.`);
    } catch {
      setHasNewUpdate(true);
      setUpdateStatus(`New build ${LATEST_VERSION} available for download.`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadNewest = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
    // Force refresh bypassing cache
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
  };

  const handleHardReload = handleDownloadNewest;

  return (
    <div className="bg-white dark:bg-[#18152e] rounded-3xl p-4 border border-purple-500/20 dark:border-purple-500/20 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon-192.png"
            alt="AGC Logo"
            className="w-10 h-10 rounded-2xl object-cover shadow-sm ring-1 ring-purple-500/20"
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">AGC App & PWA</h4>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {APP_VERSION}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Newest: {LATEST_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              {isStandalone ? 'Installed on home screen' : 'Install native web app for offline speed'}
            </p>
          </div>
        </div>

        {isStandalone ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Installed</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}
      </div>

      {/* Android Chrome manual instructions banner */}
      {showAndroidInstructions && (
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-300/60 dark:border-emerald-800/40 text-xs text-slate-700 dark:text-neutral-300 space-y-1.5 animate-in fade-in duration-200">
          <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Install directly on Android</span>
          </div>
          <ol className="list-decimal list-inside text-[11px] space-y-1 text-slate-700 dark:text-neutral-300 font-medium">
            <li>Tap the <strong>three dots (⋮)</strong> in the top-right corner of Chrome</li>
            <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
            <li>Tap <strong>Install</strong> to add AGC to your phone's app drawer</li>
          </ol>
        </div>
      )}

      {/* iOS Safari manual instructions banner */}
      {showIosInstructions && (
        <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/60 dark:border-purple-900/30 text-xs text-slate-700 dark:text-neutral-300 space-y-1">
          <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Install on iOS Safari</span>
          </div>
          <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-slate-600 dark:text-neutral-400">
            <li>Tap the <strong>Share</strong> button (⎋ with arrow) in Safari</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong> (➕)</li>
            <li>Tap <strong>Add</strong> in the top right corner</li>
          </ol>
        </div>
      )}

      {/* Update checker row */}
      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Release channel: <strong>Production {APP_VERSION}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadNewest}
              className="text-[11px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
              title={`Download and apply newest build ${LATEST_VERSION}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Newest</span>
            </button>
          </div>
        </div>

        {updateStatus && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/40 rounded-xl flex items-center justify-between text-[11px] text-emerald-900 dark:text-emerald-200 animate-fadeIn gap-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{updateStatus}</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadNewest}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Download Newest ({LATEST_VERSION})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
