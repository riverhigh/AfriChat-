import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  CheckCircle2,
  Building2,
  CreditCard,
  RotateCcw,
  Receipt,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ResolvedBankAccount } from '../types';
import { openPaystackPopup } from '../services/paystack';

export const WalletModal: React.FC = () => {
  const {
    wallet,
    isWalletModalOpen,
    setIsWalletModalOpen,
    setIsSendBillModalOpen,
    refreshWalletFromServer,
    topUpWallet,
    withdrawWallet,
    fetchLiveBanks,
    resolveBankAccount,
    formatPrice,
    currentUser,
    currency,
    CURRENCY_SYMBOLS,
    CURRENCY_RATES,
  } = useApp();

  const [walletTab, setWalletTab] = useState<'overview' | 'history' | 'topup' | 'withdraw'>('overview');
  const [txFilter, setTxFilter] = useState<'all' | 'incoming' | 'outgoing' | 'escrow'>('all');
  const rate = CURRENCY_RATES[currency] || 1;
  const topUpOptions = [10000, 25000, 50000, 100000].map((v) => Math.round(v * rate));
  const [topUpAmount, setTopUpAmount] = useState<number>(() => Math.round(25000 * rate));
  const [withdrawAmount, setWithdrawAmount] = useState<number>(10000);
  const [accountNumber, setAccountNumber] = useState('');
  const [liveBanksCount, setLiveBanksCount] = useState<number>(0);
  const [liveBanksSource, setLiveBanksSource] = useState<string>('');
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [resolvedMatches, setResolvedMatches] = useState<ResolvedBankAccount[]>([]);
  const [selectedResolvedIndex, setSelectedResolvedIndex] = useState(0);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [candidateBankHints, setCandidateBankHints] = useState<Array<{ name: string; code: string }>>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Always pull true wallet balance & ledger transactions + live Nigerian banks index when opening WalletModal
  useEffect(() => {
    if (isWalletModalOpen) {
      refreshWalletFromServer();
      fetchLiveBanks().then((res) => {
        if (res.success && res.count > 0) {
          setLiveBanksCount(res.count);
          setLiveBanksSource(res.source);
        }
      });
    }
  }, [isWalletModalOpen, fetchLiveBanks]);

  // Automatically resolve destination bank & account full name as soon as 10 digits are entered
  useEffect(() => {
    const clean = accountNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setIsResolvingAccount(false);
      setResolvedMatches([]);
      setSelectedResolvedIndex(0);
      setResolveError(null);
      setCandidateBankHints([]);
      return;
    }

    const controller = new AbortController();
    setIsResolvingAccount(true);
    setResolveError(null);
    setResolvedMatches([]);
    setSelectedResolvedIndex(0);
    setCandidateBankHints([]);

    const timer = setTimeout(async () => {
      const res = await resolveBankAccount(clean, controller.signal);
      if (controller.signal.aborted) return;
      setIsResolvingAccount(false);
      if (res.banksTotal && res.banksTotal > 0) {
        setLiveBanksCount(res.banksTotal);
      }
      if (res.success && res.matches && res.matches.length > 0) {
        setResolvedMatches(res.matches);
        setSelectedResolvedIndex(0);
        setResolveError(null);
      } else {
        setResolvedMatches([]);
        if (res.candidateBanks && res.candidateBanks.length > 0) {
          setCandidateBankHints(res.candidateBanks);
        }
        if (res.message) {
          setResolveError(res.message);
        }
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accountNumber, resolveBankAccount]);

  if (!isWalletModalOpen) return null;

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (topUpAmount <= 0) return;

    setIsProcessing(true);
    setFeedback(null);

    const userEmail = currentUser.email || `${currentUser.phoneNumber.replace(/[^0-9]/g, '')}@AGC.africa`;
    const fee = Math.min(Math.round(topUpAmount * 0.01), Math.round(3000 * rate));
    const totalCharge = topUpAmount + fee;

    openPaystackPopup({
      email: userEmail,
      amount: totalCharge,
      currency: currency,
      metadata: {
        userId: currentUser.id,
        phoneNumber: currentUser.phoneNumber,
        creditedAmountNgn: topUpAmount,
        feeAmountNgn: fee,
        type: 'wallet_topup',
      },
      onSuccess: async (response) => {
        const res = await topUpWallet(topUpAmount, response.reference);
        setIsProcessing(false);
        if (res.success) {
          setFeedback({
            type: 'success',
            text: `${res.message || `${CURRENCY_SYMBOLS[currency]}${topUpAmount.toLocaleString()} credited!`} Ref: ${response.reference || res.reference}`,
          });
          setWalletTab('overview');
        } else {
          setFeedback({
            type: 'error',
            text: res.message || `Payment received (Ref: ${response.reference}) — awaiting signed Paystack webhook verification.`,
          });
          setWalletTab('overview');
        }
      },
      onClose: () => {
        setIsProcessing(false);
        setFeedback({
          type: 'error',
          text: 'Paystack top-up cancelled. Wallet was not credited.',
        });
      },
      onError: (err) => {
        setIsProcessing(false);
        setFeedback({
          type: 'error',
          text: `Payment error: ${err.message || 'Could not complete Paystack'}`,
        });
      },
    });
  };

  const activeResolvedAccount = resolvedMatches[selectedResolvedIndex] || resolvedMatches[0] || null;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (withdrawAmount <= 0 || !activeResolvedAccount) return;

    setIsProcessing(true);
    setFeedback(null);
    const res = await withdrawWallet(
      withdrawAmount,
      activeResolvedAccount.bankName,
      activeResolvedAccount.accountNumber,
      activeResolvedAccount.accountName,
      activeResolvedAccount.bankCode
    );
    setIsProcessing(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        text: res.message,
      });
      setAccountNumber('');
      setResolvedMatches([]);
      setWalletTab('overview');
    } else {
      setFeedback({
        type: 'error',
        text: res.message,
      });
    }
  };

  const handleClose = () => {
    setFeedback(null);
    setWalletTab('overview');
    setIsWalletModalOpen(false);
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-end justify-center animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#18152e] rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 border-t border-slate-200 dark:border-slate-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                AGC Wallet
              </h3>
              <p className="text-[10px] text-slate-400">
                Secured by Paystack & Escrow Vault
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Navigation Bar */}
        <div className="px-5 pt-2.5 pb-1 border-b border-slate-100 dark:border-slate-800 shrink-0 grid grid-cols-4 gap-1 bg-slate-50/70 dark:bg-[#141126]">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'history', label: 'History' },
            { id: 'topup', label: 'Top Up' },
            { id: 'withdraw', label: 'Withdraw' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFeedback(null);
                setWalletTab(tab.id);
                if (tab.id === 'history') {
                  void refreshWalletFromServer();
                }
              }}
              className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                walletTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
              >
                ✓•
              </button>
            </div>
          )}

          {walletTab === 'overview' && (
            <>
              {/* Wallet Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span>Available Balance</span>
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-300">
                    Paystack Ready
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-black font-mono tracking-tight">
                    {formatPrice(wallet.availableBalance, 'NGN')}
                  </div>
                  <div className="text-[11px] text-indigo-200 mt-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>In Escrow Protection: {formatPrice(wallet.escrowLockedBalance, 'NGN')}</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setWalletTab('topup');
                    }}
                    className="py-2.5 px-3 bg-white text-indigo-900 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>Top-up (Paystack)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setWalletTab('withdraw');
                    }}
                    className="py-2.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4 text-amber-400" />
                    <span>Withdraw to Bank</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setIsSendBillModalOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Send My Bill (AGC Features)</span>
                </button>
              </div>

              {/* Recent Activity Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  <span>Recent Activity</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWalletTab('history');
                      void refreshWalletFromServer();
                    }}
                    className="font-mono text-[11px] normal-case text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Full Payment History →
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-[#11101e] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {wallet.transactions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No wallet activity yet. Top up, fund escrow, or pay bills to record transactions.
                    </div>
                  ) : (
                    wallet.transactions.slice(0, 5).map((tx) => {
                      const isIncoming = ['topup', 'deposit', 'received', 'game_win', 'refund', 'escrow_release', 'bill_received', 'task_earn', 'outside_payout', 'errand_release', 'referral_bonus', 'transfer_in'].includes(tx.type);
                      const isEscrow = ['escrow_lock', 'errand_escrow'].includes(tx.type);
                      return (
                        <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isIncoming
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : isEscrow
                                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
                              {isIncoming && <ArrowDownLeft className="w-4 h-4" />}
                              {isEscrow && <Lock className="w-4 h-4" />}
                              {!isIncoming && !isEscrow && <ArrowUpRight className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {tx.description || tx.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.timestamp} · {tx.referenceId || tx.reference}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <div
                              className={`font-mono font-bold ${
                                isIncoming
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isEscrow
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIncoming ? '+' : isEscrow ? '🔒 ' : '-'}
                              {formatPrice(Math.abs(tx.amount), tx.currency || 'NGN')}
                            </div>
                            {typeof tx.balanceAfter === 'number' && (
                              <span className="text-[9px] text-slate-400 font-mono block">
                                Bal: ₦{tx.balanceAfter.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* Full Payment & Activity History Tab (Unified Ledger) */}
          {walletTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Payment &amp; Activity History
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Unified immutable ledger across Paystack, escrow, bills, games &amp; stores ({wallet.transactions.length})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshWalletFromServer()}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-500"
                  title="Refresh ledger"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'incoming', label: 'Incoming' },
                  { id: 'outgoing', label: 'Outgoing' },
                  { id: 'escrow', label: 'Escrow' },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTxFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${
                      txFilter === f.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {(() => {
                const incomingTypes = ['topup', 'deposit', 'received', 'game_win', 'refund', 'escrow_release', 'bill_received', 'task_earn', 'outside_payout', 'errand_release', 'referral_bonus', 'transfer_in'];
                const escrowTypes = ['escrow_lock', 'errand_escrow'];
                const filteredTxs = wallet.transactions.filter((tx) => {
                  if (txFilter === 'incoming') return incomingTypes.includes(tx.type);
                  if (txFilter === 'escrow') return escrowTypes.includes(tx.type);
                  if (txFilter === 'outgoing') return !incomingTypes.includes(tx.type) && !escrowTypes.includes(tx.type);
                  return true;
                });

                if (filteredTxs.length === 0) {
                  return (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#11101e] border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400">
                      No transactions recorded for this filter.
                    </div>
                  );
                }

                return (
                  <div className="bg-slate-50 dark:bg-[#11101e] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTxs.map((tx) => {
                      const isIncoming = incomingTypes.includes(tx.type);
                      const isEscrow = escrowTypes.includes(tx.type);
                      return (
                        <div key={tx.id} className="p-3 flex items-start justify-between gap-2 text-xs">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isIncoming
                                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : isEscrow
                                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
                              {isIncoming && <ArrowDownLeft className="w-4 h-4" />}
                              {isEscrow && <Lock className="w-4 h-4" />}
                              {!isIncoming && !isEscrow && <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {tx.description || tx.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.timestamp}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-2 mt-0.5">
                                <span>Ref: {tx.referenceId || tx.reference}</span>
                                {typeof tx.fee === 'number' && tx.fee > 0 && (
                                  <span>· Fee: ₦{tx.fee.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`font-mono font-bold ${
                                isIncoming
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isEscrow
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIncoming ? '+' : isEscrow ? '🔒 ' : '-'}
                              {formatPrice(Math.abs(tx.amount), tx.currency || 'NGN')}
                            </div>
                            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                              {tx.type.replace('_', ' ')}
                            </span>
                            {typeof tx.balanceAfter === 'number' && (
                              <span className="text-[9px] text-slate-400 font-mono block">
                                Bal: ₦{tx.balanceAfter.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Top-Up View (via Paystack) */}
          {walletTab === 'topup' && (
            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Paystack Instant Wallet Funding</span>
                </div>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-400 leading-relaxed">
                  Top up securely with Nigerian Debit Cards, Bank Transfer, USSD, or Apple Pay powered by Paystack.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Amount ({CURRENCY_SYMBOLS[currency].trim()})
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2 font-mono">
                  {topUpOptions.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        topUpAmount === amt
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {CURRENCY_SYMBOLS[currency]}{amt >= 1000 ? `${Math.round(amt / 1000)}k` : amt}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Math.max(1000, Number(e.target.value)))}
                  min={1000}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Top-up Fee Breakdown: 1% with ₦3,000 max cap */}
              {(() => {
                const fee = Math.min(Math.round(topUpAmount * 0.01), 3000);
                const totalCharge = topUpAmount + fee;
                return (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Credited to Wallet</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {CURRENCY_SYMBOLS[currency]}{topUpAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span>Top-up Fee (1%)</span>
                        {topUpAmount * 0.01 > 3000 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full">
                            Platform Protected
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {CURRENCY_SYMBOLS[currency]}{fee.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-slate-900 dark:text-slate-100">
                      <span>Total Debit / Payable</span>
                      <span className="font-mono text-sm text-[#0ba4db]">
                        {CURRENCY_SYMBOLS[currency]}{totalCharge.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setWalletTab('overview')}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-[#0ba4db] hover:bg-[#0993c5] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authorizing via Paystack...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        Pay {CURRENCY_SYMBOLS[currency]}{(topUpAmount + Math.min(Math.round(topUpAmount * 0.01), Math.round(3000 * rate))).toLocaleString()} with Paystack
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Withdraw View (Account Number Only -> Auto Bank & Full Name Lookup) */}
          {walletTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-bold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Instant Auto-Detect Bank Payout</span>
                  </span>
                  {liveBanksCount > 0 && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {liveBanksCount} live banks{liveBanksSource === 'paystack_live_api' ? ' · Paystack' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Just enter your 10-digit account number — the system automatically finds your bank and pulls your full account name.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Withdrawal Amount (Available: {formatPrice(wallet.availableBalance, 'NGN')})
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
                  min={100}
                  max={wallet.availableBalance}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  10-Digit Account Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter 10-digit account number (e.g. 0123456789)"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    className="w-full px-3 py-2.5 pr-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                    {accountNumber.length}/10
                  </span>
                </div>
              </div>

              {/* Live Account Lookup Status */}
              {isResolvingAccount && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <div>
                    <div className="font-semibold">Searching live banks automatically...</div>
                    <div className="text-[11px] opacity-80">
                      Matching NUBAN &amp; pulling verified full name for {accountNumber}
                    </div>
                  </div>
                </div>
              )}

              {!isResolvingAccount && activeResolvedAccount && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Account Holder Full Name
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white break-words">
                          {activeResolvedAccount.accountName}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                            {activeResolvedAccount.bankName}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono">{activeResolvedAccount.accountNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {resolvedMatches.length > 1 && (
                    <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-800/50 space-y-1.5">
                      <div className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                        {resolvedMatches.length} matching accounts found — select yours:
                      </div>
                      <div className="space-y-1">
                        {resolvedMatches.map((m, idx) => (
                          <button
                            key={`${m.bankCode}-${idx}`}
                            type="button"
                            onClick={() => setSelectedResolvedIndex(idx)}
                            className={`w-full text-left px-2.5 py-2 rounded-xl text-xs border transition-colors flex items-center justify-between gap-2 ${
                              idx === selectedResolvedIndex
                                ? 'bg-white dark:bg-[#1a1732] border-emerald-500 text-slate-900 dark:text-white font-semibold shadow-2xs'
                                : 'bg-white/50 dark:bg-black/20 border-transparent text-slate-600 dark:text-slate-300 hover:border-emerald-400/50'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{m.accountName}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {m.bankName} ({m.bankCode})
                              </div>
                            </div>
                            {idx === selectedResolvedIndex && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isResolvingAccount && resolveError && accountNumber.length === 10 && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{resolveError}</span>
                  </div>
                  {candidateBankHints.length > 0 && (
                    <div className="pl-6 text-[11px] text-slate-600 dark:text-slate-400">
                      NUBAN checksum candidates: {candidateBankHints.slice(0, 6).map((b) => b.name).join(', ')}
                      {candidateBankHints.length > 6 ? '…' : ''}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setWalletTab('overview')}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={
                    isProcessing ||
                    isResolvingAccount ||
                    !activeResolvedAccount ||
                    withdrawAmount <= 0 ||
                    withdrawAmount > wallet.availableBalance
                  }
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isProcessing
                    ? 'Processing Payout...'
                    : activeResolvedAccount
                    ? `Withdraw ₦${withdrawAmount.toLocaleString()} to ${activeResolvedAccount.accountName.split(' ')[0]}`
                    : `Withdraw ₦${withdrawAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


