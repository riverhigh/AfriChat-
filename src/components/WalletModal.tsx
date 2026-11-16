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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { openPaystackPopup } from '../services/paystack';

export const WalletModal: React.FC = () => {
  const {
    wallet,
    isWalletModalOpen,
    setIsWalletModalOpen,
    refreshWalletFromServer,
    topUpWallet,
    withdrawWallet,
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
  const [selectedBank, setSelectedBank] = useState('GTBank Nigeria');
  const [accountNumber, setAccountNumber] = useState('0123456789');
  const [accountName, setAccountName] = useState(currentUser.fullName || '');
  const [withdrawPin, setWithdrawPin] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Always pull true wallet balance & ledger transactions from server when opening WalletModal
  useEffect(() => {
    if (isWalletModalOpen) {
      refreshWalletFromServer();
      if (currentUser.fullName && !accountName) {
        setAccountName(currentUser.fullName);
      }
    }
  }, [isWalletModalOpen]);

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
            text: res.message || `Payment received (Ref: ${response.reference}) â€” awaiting signed Paystack webhook verification.`,
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

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (withdrawAmount <= 0) return;

    setIsProcessing(true);
    setFeedback(null);
    const res = await withdrawWallet(withdrawAmount, selectedBank, accountNumber, accountName);
    setIsProcessing(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        text: res.message,
      });
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
                âœ•
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
              </div>

              {/* Recent Activity Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  <span>Recent Activity</span>
                  <button
                    type="button"
                    onClick={() => setWalletTab('history')}
                    className="font-mono text-[11px] normal-case text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Full Payment History â†’
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-[#11101e] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {wallet.transactions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No wallet activity yet. Top up or transfer funds to record transactions.
                    </div>
                  ) : (
                    wallet.transactions.slice(0, 5).map((tx) => {
                      const isIncoming = ['topup', 'deposit', 'received', 'game_win', 'refund', 'escrow_release'].includes(tx.type);
                      const isEscrow = tx.type === 'escrow_lock';
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
                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.timestamp} Â· {tx.referenceId || tx.reference}
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
                              {isIncoming ? '+' : isEscrow ? 'ðŸ”’ ' : '-'}
                              {formatPrice(Math.abs(tx.amount), tx.currency || 'NGN')}
                            </div>
                            {typeof tx.balanceAfter === 'number' && (
                              <span className="text-[9px] text-slate-400 font-mono block">
                                Bal: â‚¦{tx.balanceAfter.toLocaleString()}
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
                    Unified immutable ledger across transfers, Paystack, stores &amp; escrow
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
                const incomingTypes = ['topup', 'deposit', 'received', 'game_win', 'refund', 'escrow_release'];
                const escrowTypes = ['escrow_lock'];
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
                                  <span>Â· Fee: â‚¦{tx.fee.toLocaleString()}</span>
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
                              {isIncoming ? '+' : isEscrow ? 'ðŸ”’ ' : '-'}
                              {formatPrice(Math.abs(tx.amount), tx.currency || 'NGN')}
                            </div>
                            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                              {tx.type.replace('_', ' ')}
                            </span>
                            {typeof tx.balanceAfter === 'number' && (
                              <span className="text-[9px] text-slate-400 font-mono block">
                                Bal: â‚¦{tx.balanceAfter.toLocaleString()}
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

              {/* Top-up Fee Breakdown: 1% with â‚¦3,000 max cap */}
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

          {/* Withdraw View */}
          {walletTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                <div className="font-bold mb-0.5">Direct Bank Payout</div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Withdraw available wallet funds directly into your Nigerian or African bank account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Withdrawal Amount (Available: {formatPrice(wallet.availableBalance, 'NGN')})
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  max={wallet.availableBalance}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Bank
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option>GTBank Nigeria</option>
                  <option>Access Bank</option>
                  <option>Zenith Bank</option>
                  <option>FirstBank</option>
                  <option>Kuda Microfinance</option>
                  <option>OPay Digital Bank</option>
                  <option>M-Pesa Kenya (Safaricom)</option>
                  <option>MTN MoMo Ghana</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

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
                  disabled={isProcessing || withdrawAmount > wallet.availableBalance}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isProcessing ? 'Processing Payout...' : `Withdraw â‚¦${withdrawAmount.toLocaleString()}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


