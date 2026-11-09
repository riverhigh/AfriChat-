import React, { useState } from 'react';
import {
  X,
  Vote,
  Lock,
  Plus,
  Trash2,
  DollarSign,
  Send,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const FinancialPollModal: React.FC = () => {
  const {
    isFinancialPollModalOpen,
    setIsFinancialPollModalOpen,
    createFinancialPoll,
    activeChatId,
    wallet,
    formatPrice,
  } = useApp();

  const [pollTitle, setPollTitle] = useState('Weekend Hangout & Dinner (Lock Stake to Confirm RSVP)');
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [options, setOptions] = useState<string[]>([
    'Danfo Bistro & Bar, Ikoyi (Cocktails & Asun)',
    'Hard Rock Cafe, Victoria Island (Live Band)',
    'Amala Shitta, Surulere (Point & Kill Catfish)',
  ]);

  if (!isFinancialPollModalOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 5) return;
    setOptions((prev) => [...prev, `Option ${prev.length + 1}`]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateOption = (index: number, val: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? val : opt)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId) return;

    createFinancialPoll(activeChatId, pollTitle, stakeAmount, options);
    setIsFinancialPollModalOpen(false);
  };

  return (
    <div
      onClick={() => setIsFinancialPollModalOpen(false)}
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
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Poll with Financial Stakes
              </h3>
              <p className="text-[10px] text-slate-400">
                Lock commitment funds in escrow upon voting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFinancialPollModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Explainer Note */}
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Zero Flake Guarantee:</strong> When group members vote on this poll, their stake is automatically locked in the group escrow vault to ensure commitment!
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Poll Title or Decision Topic
            </label>
            <input
              type="text"
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Financial Stake Required Per Vote (NGN)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2 font-mono">
              {[5000, 10000, 20000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStakeAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    stakeAmount === amt
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ₦{(amt / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Math.max(1000, Number(e.target.value)))}
              min={1000}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Poll Options ({options.length}/5)
              </label>
              {options.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Choice
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 text-center font-mono text-slate-400 text-xs">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleUpdateOption(idx, e.target.value)}
                    required
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsFinancialPollModalOpen(false)}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4" />
              <span>Launch Financial Poll in Group</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
