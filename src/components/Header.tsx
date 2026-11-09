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
  Eye,
  EyeOff,
  Truck,
  Briefcase,
  Users,
  Lock,
  Clock,
  Repeat,
  Wrench,
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
    hideBalanceOnNav,
    toggleHideBalance,
    setIsWalletModalOpen,
    setIsMemeStudioOpen,
    setIsScamCheckerOpen,
    setIsDispatchModalOpen,
    setIsJobBoardModalOpen,
    setIsContactsModalOpen,
    setIsAuthModalOpen,
    setIsServicesModalOpen,
    setIsTransferModalOpen,
    setIsPayrollModalOpen,
    joinAudioSpace,
    audioSpaces,
  } = useApp();

  const [showMenu, setShowMenu] = useState(false);

  const formattedShortBalance = `₦${Math.floor(wallet.availableBalance / 1000)}k`;

  return (
    <header className="sticky top-0 z-30 bg-purple-900 dark:bg-black text-white transition-colors border-b border-purple-950 dark:border-neutral-800">
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
              <div className="absolute left-0 top-10 z-50 w-60 bg-white dark:bg-black text-slate-800 dark:text-white rounded-2xl shadow-2xl py-2 text-sm border border-slate-200 dark:border-neutral-800 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsServicesModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center gap-2.5 text-purple-600 dark:text-purple-400 font-bold"
                >
                  <Wrench className="w-4 h-4" />
                  <span>African Services & Bookings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold"
                >
                  <Clock className="w-4 h-4" />
                  <span>Send (1-2 Days Delay)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsPayrollModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold"
                >
                  <Repeat className="w-4 h-4" />
                  <span>Payroll Auto-Debit</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-neutral-800" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsWalletModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-neutral-900 flex items-center gap-2.5"
                >
                  <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsDispatchModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Truck className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Gokada & PickkR Dispatch</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsJobBoardModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span>Job Board (Hire & Earn)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsContactsModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Sync Device Contacts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Lock className="w-4 h-4 text-purple-500" />
                  <span>Phone OTP Account & ID</span>
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

        <div className="flex items-center gap-1.5">
          {/* Paystack Wallet Balance Pill with Toggle to Turn Off Figure */}
          <div className="flex items-center rounded-full bg-white/10 hover:bg-white/15 text-indigo-200 text-xs font-mono font-bold transition-all border border-white/10 shadow-xs">
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"
              title="Open AfriChat Wallet"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>{hideBalanceOnNav ? '₦ ••••••' : formattedShortBalance}</span>
            </button>

            {/* Eye toggle button to turn off balance figure on the nav */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleHideBalance();
              }}
              className="pr-2 pl-1 py-1 text-white/60 hover:text-white transition-colors"
              title={hideBalanceOnNav ? 'Show balance figure on nav' : 'Hide balance figure on nav (privacy mode)'}
              aria-label="Toggle balance privacy"
            >
              {hideBalanceOnNav ? (
                <Eye className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              )}
            </button>
          </div>

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
            onClick={() => setIsContactsModalOpen(true)}
            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform active:scale-95"
            aria-label="Quick Action"
            title="Start New Chat / Find Contacts"
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
};
