import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  Wallet,
  Crown,
  Gift,
  ArrowUpRight,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CreditAlertCategory } from '../types';
import { playCreditWinChime } from '../utils/soundUtils';

const CATEGORY_THEME: Record<
  CreditAlertCategory,
  {
    gradient: string;
    pillBg: string;
    pillText: string;
    iconBg: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  game_win: {
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    pillBg: 'bg-amber-500/15 border-amber-400/40',
    pillText: 'text-amber-300',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950',
    icon: Trophy,
  },
  escrow: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    pillBg: 'bg-emerald-500/15 border-emerald-400/40',
    pillText: 'text-emerald-300',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950',
    icon: ShieldCheck,
  },
  admin_topup: {
    gradient: 'from-purple-500 via-fuchsia-500 to-indigo-500',
    pillBg: 'bg-purple-500/15 border-purple-400/40',
    pillText: 'text-purple-200',
    iconBg: 'bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white',
    icon: Crown,
  },
  deposit: {
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    pillBg: 'bg-emerald-500/15 border-emerald-400/40',
    pillText: 'text-emerald-300',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-green-600 text-slate-950',
    icon: Wallet,
  },
  refund: {
    gradient: 'from-sky-500 via-indigo-500 to-purple-500',
    pillBg: 'bg-sky-500/15 border-sky-400/40',
    pillText: 'text-sky-200',
    iconBg: 'bg-gradient-to-br from-sky-400 to-indigo-600 text-white',
    icon: Sparkles,
  },
  bill_received: {
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    pillBg: 'bg-pink-500/15 border-pink-400/40',
    pillText: 'text-pink-200',
    iconBg: 'bg-gradient-to-br from-pink-400 to-rose-600 text-white',
    icon: Gift,
  },
  referral: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    pillBg: 'bg-violet-500/15 border-violet-400/40',
    pillText: 'text-violet-200',
    iconBg: 'bg-gradient-to-br from-violet-400 to-fuchsia-600 text-white',
    icon: Zap,
  },
  payout: {
    gradient: 'from-emerald-500 via-purple-500 to-amber-500',
    pillBg: 'bg-emerald-500/15 border-emerald-400/40',
    pillText: 'text-emerald-300',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-purple-600 text-white',
    icon: Sparkles,
  },
};

export const CreditCelebrationModal: React.FC = () => {
  const {
    activeCreditAlert,
    dismissCreditAlert,
    setIsWalletModalOpen,
    CURRENCY_SYMBOLS,
  } = useApp();

  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    if (!activeCreditAlert) return;
    playCreditWinChime();

    const target = Math.max(0, Math.round(activeCreditAlert.amount));
    const startAt = performance.now();
    const durationMs = 550;
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(Math.round(target * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayAmount(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [activeCreditAlert]);

  useEffect(() => {
    if (!activeCreditAlert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissCreditAlert();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCreditAlert, dismissCreditAlert]);

  if (!activeCreditAlert) return null;

  const theme = CATEGORY_THEME[activeCreditAlert.category] || CATEGORY_THEME.payout;
  const IconComp = theme.icon;
  const sym = CURRENCY_SYMBOLS[activeCreditAlert.currency || 'NGN'] || '₦';

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Credit Alert"
      onClick={dismissCreditAlert}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-[#0c0a17] border border-white/15 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gamified Gradient Accent Strip */}
        <div className={`h-2 w-full bg-gradient-to-r ${theme.gradient}`} />

        {/* Ambient Celebration Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Floating Confetti Geometric Sparks */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-2 w-full h-32 opacity-70"
          viewBox="0 0 360 120"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="48" cy="28" r="4" fill="#34D399" />
          <rect x="86" y="18" width="7" height="7" rx="1.5" transform="rotate(24 86 18)" fill="#FBBF24" />
          <polygon points="280,16 286,28 274,28" fill="#A855F7" />
          <circle cx="312" cy="46" r="3.5" fill="#38BDF8" />
          <rect x="40" y="76" width="6" height="6" rx="1" transform="rotate(-18 40 76)" fill="#F472B6" />
          <circle cx="305" cy="90" r="4" fill="#FBBF24" />
          <polygon points="68,52 73,60 63,60" fill="#10B981" />
        </svg>

        {/* Close button */}
        <button
          type="button"
          onClick={dismissCreditAlert}
          aria-label="Dismiss credit alert"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 px-6 pt-7 pb-6 text-center space-y-5">
          {/* Emblem + XP Chip */}
          <div className="flex flex-col items-center gap-2.5">
            <div className={`w-16 h-16 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-xl ring-4 ring-white/10`}>
              <IconComp className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className={`px-3 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wider ${theme.pillBg} ${theme.pillText}`}>
                {activeCreditAlert.categoryLabel}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-[11px] font-mono font-bold tabular-nums inline-flex items-center gap-1">
                <Zap className="w-3 h-3" />
                +{activeCreditAlert.xpEarned} XP
              </span>
            </div>
          </div>

          {/* Credited Amount */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/90">
              Credit Alert
            </div>
            <div className="text-4xl font-black font-display tracking-tight text-white tabular-nums">
              +{sym}{displayAmount.toLocaleString()}
            </div>
            <p className="text-sm font-bold text-slate-100">
              {activeCreditAlert.title}
            </p>
            {activeCreditAlert.subtitle && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeCreditAlert.subtitle}
              </p>
            )}
          </div>

          {/* Updated Wallet Balance Box */}
          <div className="rounded-2xl bg-white/6 border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Available Balance
              </div>
              <div className="text-base font-black font-mono tabular-nums text-emerald-400">
                {sym}{Math.round(activeCreditAlert.newBalance).toLocaleString()}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                dismissCreditAlert();
                setIsWalletModalOpen(true);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>View Wallet</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={dismissCreditAlert}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl bg-gradient-to-r ${theme.gradient} text-slate-950 font-black text-xs shadow-lg transition-all active:scale-[0.98]`}
            >
              Collect &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
