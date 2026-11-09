import React, { useState } from 'react';
import {
  QrCode,
  Scan,
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
  HeartPulse,
  Scale,
  Ticket,
  Music,
  X,
  Coins,
  LockKeyhole,
  Share2,
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
    setIsScanQrModalOpen,
    setIsHealthModalOpen,
    setIsLegalModalOpen,
    setIsCreatorModalOpen,
    setIsAjoModalOpen,
    setIsSecurityModalOpen,
    setIsReferralModalOpen,
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
              <>
                {/* Backdrop click away */}
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
                  onClick={() => setShowMenu(false)}
                />

                {/* 2-by-2 Stacked Scrollable Feature Menu */}
                <div className="fixed top-12 left-2 right-2 sm:absolute sm:left-0 sm:right-auto sm:w-[360px] z-50 bg-white dark:bg-neutral-950 text-slate-800 dark:text-white rounded-3xl shadow-2xl p-3 border border-slate-200 dark:border-neutral-800 max-h-[82vh] overflow-y-auto animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-neutral-800 px-1">
                    <div>
                      <h4 className="text-sm font-black font-display text-slate-900 dark:text-white">
                        Super-App Features
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                        Select any African tool or service
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMenu(false)}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 2 by 2 Feature Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. AfriCreator Hub (NEW) */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsCreatorModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-200 dark:border-purple-900/50 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Creator Hub
                      </span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 block mt-0.5 leading-tight">
                        VIP Fans, Shows & Songs
                      </span>
                    </button>

                    {/* 2. AfriHealth */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsHealthModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/80 dark:border-rose-900/50 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <HeartPulse className="w-4 h-4 animate-pulse" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        AfriHealth
                      </span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-0.5 leading-tight">
                        Queues & Telehealth
                      </span>
                    </button>

                    {/* 3. AfriLaw & Smart Contracts */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsLegalModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-900/50 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Scale className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        AfriLaw
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block mt-0.5 leading-tight">
                        Contracts & Lawyers
                      </span>
                    </button>

                    {/* 4. AfriChat Wallet */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsWalletModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/80 dark:border-purple-900/50 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Wallet
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 leading-tight">
                        Paystack & Escrow
                      </span>
                    </button>

                    {/* 5. Street Radio */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        const liveSpace = audioSpaces.find((s) => s.isLive) || audioSpaces[0];
                        if (liveSpace) joinAudioSpace(liveSpace);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Radio className="w-4 h-4 animate-pulse" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Street Radio
                      </span>
                      <span className="text-[10px] text-rose-500 block mt-0.5 leading-tight">
                        Live 12kbps Audio
                      </span>
                    </button>

                    {/* 6. African Artisan Stations & Services */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsServicesModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-purple-500/10 dark:bg-purple-950/30 hover:bg-purple-500/20 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Artisan Stations
                      </span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold block mt-0.5 leading-tight">
                        ₦5k Reg • ₦500 List
                      </span>
                    </button>

                    {/* Invite & Earn ₦500 Anti-Ghost Referral */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsReferralModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Invite & Earn
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold block mt-0.5 leading-tight">
                        ₦500/Friend (Anti-Ghost)
                      </span>
                    </button>

                    {/* 7. Delayed Transfer */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsTransferModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Delayed Send
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        1-2 Days Anti-Fraud
                      </span>
                    </button>

                    {/* 8. Payroll Auto-Debit */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsPayrollModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Repeat className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Payroll
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        Auto-Debit Staff Pay
                      </span>
                    </button>

                    {/* 9. Scam Checker */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsScamCheckerOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Scam Checker
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        Verify Phone/Bank
                      </span>
                    </button>

                    {/* 10. Dispatch Couriers */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsDispatchModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Dispatch
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        Gokada & PickkR
                      </span>
                    </button>

                    {/* 11. Job Board */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsJobBoardModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Job Board
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        Hire & Earn Gigs
                      </span>
                    </button>

                    {/* 12. Meme Studio */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsMemeStudioOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Meme Studio
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        African Stickers
                      </span>
                    </button>

                    {/* 13. Ajo & Esusu Savings */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsAjoModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <Coins className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Ajo & Esusu
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        Rotating Savings
                      </span>
                    </button>

                    {/* 14. Payment PIN & Security */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsSecurityModalOpen(true);
                      }}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-left transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                        <LockKeyhole className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                        Security PIN
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mt-0.5 leading-tight">
                        Wallet Auth & Safe
                      </span>
                    </button>
                  </div>

                  {/* System Settings Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setIsContactsModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 flex items-center gap-2 text-xs font-semibold"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Contacts</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 flex items-center gap-2 text-xs font-semibold"
                      >
                        <Lock className="w-3.5 h-3.5 text-purple-500" />
                        <span>Phone ID</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onOpenLanguageModal();
                        }}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 flex items-center justify-center gap-1 font-mono uppercase font-bold text-purple-600 dark:text-purple-400"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{language}</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleLowDataMode}
                        className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                          lowDataMode
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-50 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400'
                        }`}
                      >
                        <span>Low Data</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 flex items-center justify-center gap-1 text-slate-600 dark:text-neutral-400"
                      >
                        {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                        <span>Theme</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
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

          {/* Scan QR & My UID Button */}
          <button
            type="button"
            onClick={() => setIsScanQrModalOpen(true)}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            aria-label="Scan QR Code & View UID"
            title="Scan QR Code & View Your Unique UID"
          >
            <Scan className="w-5 h-5 text-purple-200 hover:text-white" />
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
