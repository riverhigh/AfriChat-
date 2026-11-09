import React, { useState } from 'react';
import {
  X,
  Coins,
  ShieldCheck,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AjoLedgerModal: React.FC = () => {
  const {
    isAjoModalOpen,
    setIsAjoModalOpen,
    activeAjoGroup,
    contributeToAjo,
    activeChatId,
    wallet,
    formatPrice,
  } = useApp();

  const [notification, setNotification] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isAjoModalOpen || !activeAjoGroup) return null;

  const myMember = activeAjoGroup.members.find((m) => m.id === 'm1');
  const hasPaidCurrent = myMember?.hasPaidCurrentCycle ?? false;

  const handlePayContribution = () => {
    if (!activeChatId) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const res = contributeToAjo(
        activeChatId,
        activeAjoGroup.id,
        activeAjoGroup.cycleContributionAmount
      );
      if (res.success) {
        setNotification(res.message);
        setTimeout(() => setNotification(null), 3500);
      } else {
        alert(res.message);
      }
    }, 600);
  };

  return (
    <div
      onClick={() => setIsAjoModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Ajo / Esusu Savings Club
              </h3>
              <p className="text-[10px] text-slate-400">
                Rotational community savings & automated payout ledger
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAjoModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {notification && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {/* Group Pot Hero Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                {activeAjoGroup.name}
              </span>
              <span className="font-mono bg-white/15 px-2 py-0.5 rounded-full text-[10px] text-amber-300 font-bold">
                Round {activeAjoGroup.currentRound} of {activeAjoGroup.totalRounds}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-indigo-200 block">Total Round Payout Pot:</span>
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  ₦{activeAjoGroup.totalPoolPerRound.toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-indigo-200 block">Each Member:</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  ₦{activeAjoGroup.cycleContributionAmount.toLocaleString()}/cycle
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-indigo-100">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Next Beneficiary: <strong>{activeAjoGroup.currentRecipientName}</strong></span>
              </div>
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md text-[10px]">
                {activeAjoGroup.nextPayoutDate}
              </span>
            </div>
          </div>

          {/* Contribution Action Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Your Round 2 Status
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {hasPaidCurrent
                  ? '✓ ₦50,000 paid into group escrow'
                  : 'Pending contribution for this cycle'}
              </div>
            </div>

            {hasPaidCurrent ? (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold font-mono text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Paid
              </span>
            ) : (
              <button
                type="button"
                onClick={handlePayContribution}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Pay ₦50,000 Now'}
              </button>
            )}
          </div>

          {/* Rotational Payout Roster */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <span>Rotational Payout Schedule</span>
              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                Transparent Ledger
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {activeAjoGroup.members.map((member) => (
                <div key={member.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-slate-400 text-xs w-4">
                      #{member.payoutPosition}
                    </span>
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Payout: {member.payoutDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {member.isReceivedPayout ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Collected
                      </span>
                    ) : member.hasPaidCurrentCycle ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Paid Current
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules & Guarantee Note */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Smart Escrow Rules</span>
            </div>
            <p className="leading-relaxed opacity-90">
              {activeAjoGroup.rules}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#121020] flex gap-2">
          <button
            type="button"
            onClick={() => setIsAjoModalOpen(false)}
            className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
