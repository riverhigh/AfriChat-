import React, { useState } from 'react';
import {
  X,
  Send,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  FastForward,
  User,
  Phone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DelayedTransferModal: React.FC = () => {
  const {
    isTransferModalOpen,
    setIsTransferModalOpen,
    delayedTransfers,
    sendDelayedTransfer,
    cancelDelayedTransfer,
    fastForwardTransferRelease,
    wallet,
    formatPrice,
    deviceContacts,
    securitySettings,
    currency,
    CURRENCY_SYMBOLS,
    CURRENCY_RATES,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'send' | 'pending' | 'history'>('send');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const rate = CURRENCY_RATES[currency] || 1;
  const chipValues = [5000, 10000, 25000, 50000, 100000].map(v => Math.round(v * rate));
  const [amountStr, setAmountStr] = useState(() => String(Math.round(15000 * rate)));
  const [delayHours, setDelayHours] = useState<number>(36); // Default 1.5 days (1-2 days)
  const [note, setNote] = useState('');
  const [paymentPin, setPaymentPin] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isTransferModalOpen) return null;

  const handleSelectContact = (phone: string, name: string) => {
    setRecipientPhone(phone);
    setRecipientName(name);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const amountNum = parseFloat(amountStr);
    if (!amountNum || amountNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid transfer amount.' });
      return;
    }

    const amountInNGN = currency === "NGN" ? amountNum : amountNum / (CURRENCY_RATES[currency] || 1);
    if (amountInNGN > wallet.availableBalance) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient wallet balance. You have ${formatPrice(wallet.availableBalance, 'NGN')} available.`,
      });
      return;
    }

    if (!recipientPhone.trim() || !recipientName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the recipient name and phone number.' });
      return;
    }

    // Verify 4-digit PIN if set
    if (securitySettings.hasPaymentPin && securitySettings.paymentPin) {
      if (paymentPin.trim() !== securitySettings.paymentPin.trim()) {
        setStatusMessage({ type: 'error', text: 'Invalid 4-digit Payment PIN. Please try again.' });
        return;
      }
    }

    const result = sendDelayedTransfer(recipientPhone, recipientName, amountNum, note, delayHours);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message || 'Transfer scheduled with 1-2 days delay!' });
      setPaymentPin('');
      setNote('');
      setActiveTab('pending');
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to dispatch transfer.' });
    }
  };

  const pendingTransfers = delayedTransfers.filter((t) => t.status === 'pending_clearance');
  const pastTransfers = delayedTransfers.filter((t) => t.status !== 'pending_clearance');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-black text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Delayed Money Transfer</span>
                <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full">
                  1-2 Days Buffer
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Anti-fraud delayed escrow settlement & scam cancellation grace
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTransferModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 dark:bg-neutral-950 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => {
              setActiveTab('send');
              setStatusMessage(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'send'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Send Money
          </button>
          <button
            onClick={() => {
              setActiveTab('pending');
              setStatusMessage(null);
            }}
            className={`py-2 rounded-xl transition-all relative ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>In Clearance</span>
            {pendingTransfers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-purple-600 text-white rounded-full">
                {pendingTransfers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              setStatusMessage(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-black text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Past Settlements
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-black">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: SEND MONEY WITH 1-2 DAYS DELAY */}
          {activeTab === 'send' && (
            <form onSubmit={handleSend} className="space-y-4">
              {/* African Fraud Safeguard Banner */}
              <div className="p-3 bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/20 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>How the 1-2 Days Delay Protects You</span>
                </div>
                <p className="text-[11px] text-purple-900/80 dark:text-purple-200/80 leading-relaxed">
                  Money sent is held in <strong>Delayed Escrow</strong> for 24 to 48 hours before final settlement into the recipient&apos;s pocket. If anything looks like a scam, defective product, or duplicate charge, you can cancel and reclaim 100% of your funds at any time.
                </p>
              </div>

              {/* Wallet Available Balance Pill */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-xs text-slate-500 dark:text-neutral-400">Available Wallet Balance:</span>
                <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                  {formatPrice(wallet.availableBalance, 'NGN')}
                </span>
              </div>

              {/* Quick Contact Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1.5">
                  Select Contact on AGC
                </label>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {deviceContacts
                    .filter((c) => c.isRegisteredOnAGC)
                    .slice(0, 5)
                    .map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact.normalizedPhoneNumber, contact.name)}
                        className={`p-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all text-xs ${
                          recipientPhone === contact.normalizedPhoneNumber
                            ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30'
                            : 'border-slate-200 dark:border-neutral-800 hover:border-purple-300'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {contact.name.charAt(0)}
                        </div>
                        <span className="font-medium truncate max-w-[90px]">{contact.name}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Recipient Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Emeka Nwosu"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Recipient Phone / E.164
                  </label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+234 812 345 6789"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Amount & Quick Chips */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Amount to Send ({CURRENCY_SYMBOLS[currency].trim()})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-base font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  {['5000', '10000', '25000', '50000', '100000'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountStr(val)}
                      className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                        amountStr === val
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold'
                          : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ₦{parseInt(val, 10).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Security Delay Duration */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1.5">
                  Select Anti-Fraud Delay Window
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setDelayHours(24)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      delayHours === 24
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-600'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        24 Hours Delay
                      </span>
                      <span className="text-[10px] font-mono bg-purple-600 text-white font-bold px-1.5 py-0.2 rounded">
                        1 Day
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">
                      Ideal for verified friends & routine vendor orders.
                    </p>
                  </div>

                  <div
                    onClick={() => setDelayHours(48)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      delayHours === 48
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-600'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        48 Hours Delay
                      </span>
                      <span className="text-[10px] font-mono bg-purple-600 text-white font-bold px-1.5 py-0.2 rounded">
                        2 Days
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1">
                      Maximum protection for new sellers, electronics & parcels.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note / Memo */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                  Transfer Note / Purpose
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Deposit for 2 bales of lace, Waybill order #492"
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {/* 4-Digit Payment PIN */}
              {securitySettings.hasPaymentPin && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1 flex items-center justify-between">
                    <span>Enter 4-Digit Payment PIN</span>
                    <span className="text-[10px] text-slate-400 font-mono">PIN required</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={paymentPin}
                    onChange={(e) => setPaymentPin(e.target.value)}
                    placeholder="••••"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>Lock & Send with {delayHours}h Delay</span>
              </button>
            </form>
          )}

          {/* TAB 2: PENDING CLEARANCE QUEUE (WITH CANCEL & TEST SIMULATION) */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Active Delayed Transfers ({pendingTransfers.length})
              </div>

              {pendingTransfers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-neutral-400 text-xs">
                  No transfers currently pending clearance. All previous funds have settled!
                </div>
              ) : (
                pendingTransfers.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-purple-200 dark:border-purple-900/60 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-500">Recipient:</div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {tx.recipientName}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {tx.recipientPhone}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black font-mono text-purple-600 dark:text-purple-400">
                          {formatPrice(tx.amount, tx.currency)}
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          {tx.delayHours}h Escrow Lock
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-neutral-900 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>Clearance Release:</span>
                        </span>
                        <strong className="font-mono text-slate-900 dark:text-white">{tx.scheduledReleaseTime}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-neutral-800">
                        &ldquo;{tx.note}&rdquo;
                      </p>
                    </div>

                    {/* Actions: Cancel (Refunds) or Fast-Forward (Simulation) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          const res = cancelDelayedTransfer(tx.id);
                          setStatusMessage({
                            type: res.success ? 'success' : 'error',
                            text: res.message,
                          });
                        }}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-900"
                        title="Cancel this transfer and immediately refund your wallet"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Cancel & Refund</span>
                      </button>

                      <button
                        onClick={() => {
                          const res = fastForwardTransferRelease(tx.id);
                          setStatusMessage({
                            type: res.success ? 'success' : 'error',
                            text: res.message,
                          });
                        }}
                        className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        title="Simulate delay countdown expiration and credit receiver immediately"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        <span>Clear Delay (Test)</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PAST SETTLEMENTS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Settled & Cancelled Transfers
              </div>

              {pastTransfers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-neutral-400 text-xs">
                  No historical delayed transfers yet.
                </div>
              ) : (
                pastTransfers.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {tx.recipientName} ({tx.recipientPhone})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {tx.createdAt} · {tx.note}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                        {formatPrice(tx.amount, tx.currency)}
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase ${
                          tx.status === 'cleared'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.status === 'cleared' ? 'Cleared' : 'Cancelled'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
