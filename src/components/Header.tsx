import React, { useState } from 'react';
import {
  Camera,
  MoreVertical,
  Moon,
  Sun,
  Globe,
  Check,
  Wallet,
  Radio,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onOpenLanguageModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLanguageModal }) => {
  const {
    t,
    isDarkMode,
    toggleDarkMode,
    lowDataMode,
    toggleLowDataMode,
    language,
    wallet,
    setIsWalletModalOpen,
    setIsMemeStudioOpen,
    setIsScamCheckerOpen,
    joinAudioSpace,
    audioSpaces,
  } = useApp();

  const [showMenu, setShowMenu] = useState(false);

  const formattedShortBalance = `₦${Math.floor(wallet.availableBalance / 1000)}k`;

  return (
    <header className="sticky top-0 z-30 bg-[#1e1b4b] dark:bg-[#0f0e1c] text-white transition-colors border-b border-indigo-950/40">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Left Three Dots / Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute left-0 top-10 z-50 w-56 bg-white dark:bg-[#1a172e] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl py-2 text-sm border border-slate-200 dark:border-slate-800 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsWalletModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold">AfriChat Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    const liveSpace = audioSpaces.find((s) => s.isLive) || audioSpaces[0];
                    if (liveSpace) joinAudioSpace(liveSpace);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Street Radio Spaces</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsScamCheckerOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Scam & Fraud Checker</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsMemeStudioOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Meme & Sticker Studio</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenLanguageModal();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>Language</span>
                  </span>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-mono font-bold">
                    {language}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleLowDataMode();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>Low Data Mode</span>
                  {lowDataMode && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleDarkMode();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>Dark Mode</span>
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <div className="px-4 py-1.5 text-[11px] text-slate-400">
                  AfriChat · Super-App for Africa
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-lg tracking-tight text-white">
              AfriChat
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Paystack Wallet Balance Pill */}
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-indigo-200 text-xs font-mono font-bold transition-all border border-white/10 shadow-xs"
            title="Open AfriChat Wallet"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>{formattedShortBalance}</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={() => alert('Camera ready to snap photo, scan QR, or post 24h status.')}
            className="text-white/80 hover:text-white transition-colors p-1.5"
            aria-label="Camera"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Plus Action Button */}
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform active:scale-95"
            aria-label="Quick Action"
            title="AfriChat Quick Action"
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
};
