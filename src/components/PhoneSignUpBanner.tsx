import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare, Sparkles, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PhoneSignUpBanner: React.FC = () => {
  const { isAuthenticated } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) || null;
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [showAndroidTip, setShowAndroidTip] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // If authenticated or already running in standalone PWA, don't show
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isAuthenticated || isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Only pop up ONCE during the sign-up session
    const alreadySeen = sessionStorage.getItem('AGC_install_prompt_seen');
    const dismissedAt = localStorage.getItem('AGC_install_prompt_dismissed');

    if (alreadySeen || dismissedAt) {
      setIsDismissed(true);
      return;
    }

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIos(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Initial check for globally cached prompt
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    // Capture standard PWA install prompt
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
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      handleDismiss();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Pop up once after brief delay (1.2s)
    const timer = setTimeout(() => {
      setIsVisible(true);
      sessionStorage.setItem('AGC_install_prompt_seen', 'true');
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isAuthenticated]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 300);
    localStorage.setItem('AGC_install_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).deferredPwaPrompt);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          handleDismiss();
          if (typeof window !== 'undefined') (window as any).deferredPwaPrompt = null;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isAndroid) {
      // Direct Android instructions (Chrome 3 dots)
      setShowAndroidTip(true);
      setShowIosTip(false);
    } else if (isIos) {
      // iOS Safari instructions
      setShowIosTip(true);
      setShowAndroidTip(false);
    } else {
      setShowAndroidTip(true);
    }
  };

  if (isAuthenticated || isInstalled || isDismissed) return null;

  return (
    <div
      style={{
        top: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 16px)',
      }}
      className={`fixed left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-[200] transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div className="relative rounded-2xl bg-gradient-to-b from-[#1f103b]/95 via-[#160b2d]/95 to-[#0e061e]/98 backdrop-blur-xl border border-purple-500/35 p-4 shadow-2xl shadow-purple-950/90 text-white">
        {/* Close / Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/70 hover:text-white flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          <img
            src="/icon-192.png"
            alt="AGC App"
            className="w-11 h-11 rounded-xl object-cover shadow-md shadow-purple-900/50 ring-1 ring-purple-400/40 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-purple-300 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Web App</span>
              </span>
            </div>
            <h3 className="text-sm font-black font-display text-white tracking-tight leading-tight mt-0.5">
              Install App to Device
            </h3>
            <p className="text-[11px] text-purple-200/70 leading-snug mt-1">
              Add AGC to your home screen for fast 1-tap access, offline speed, and instant notifications.
            </p>
          </div>
        </div>

        {/* Android Step Guide if expanded */}
        {showAndroidTip && (
          <div className="mt-3 p-3 bg-emerald-950/70 border border-emerald-400/40 rounded-xl text-[11px] text-emerald-100 space-y-1.5 animate-in fade-in duration-200">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install on Android:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center font-bold text-[10px] text-emerald-300">1</span>
              <span>Tap the <strong>three dots (⋮)</strong> menu in Chrome</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center font-bold text-[10px] text-emerald-300">2</span>
              <span>Tap <strong>Install app</strong> (or Add to Home screen)</span>
            </div>
          </div>
        )}

        {/* iOS Step Guide if expanded */}
        {showIosTip && (
          <div className="mt-3 p-3 bg-purple-900/40 border border-purple-400/30 rounded-xl text-[11px] text-purple-100 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center font-bold text-[10px]">1</span>
              <span>Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-purple-300" /> <strong>Share</strong> button in Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center font-bold text-[10px]">2</span>
              <span>Scroll down & tap <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-purple-300" /> <strong>Add to Home Screen</strong></span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-purple-500/20">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2 text-xs font-semibold text-purple-300/80 hover:text-white rounded-xl transition-colors text-center"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-700/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
