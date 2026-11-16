import React, { useState } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DelayedTransferModal: React.FC = () => {
  const {
    isTransferModalOpen,
    setIsTransferModalOpen,
    setIsSecurityModalOpen,
    delayedTransfers,
    sendDelayedTransfer,
    getTransferLimitsUsage,
    wallet,
    formatPrice,
    deviceContacts,
    securitySettings,
    currency,
    CURRENCY_SYMBOLS,
    CURRENCY_RATES,
    systemConfig,
    chats,
    adminUsers,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const rate = CURRENCY_RATES[currency] || 1;
  const chipValues = [5000, 10000, 25000, 50000, 100000].map((v) => Math.round(v * rate));
  const [amountStr, setAmountStr] = useState(() => String(Math.round(15000 * rate)));
  const [note, setNote] = useState('');
  const [paymentPin, setPaymentPin] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-resolve recipient username whenever recipientPhone changes
  React.useEffect(() => {
    if (!recipientPhone.trim()) {
      setRecipientName('');
      return;
    }
    const cleanDigits = recipientPhone.replace(/\D/g, '');
    const matchedContact = deviceContacts.find((contact: any) => {
      const c1 = (contact.rawPhoneNumber || '').replace(/\D/g, '');
      const c2 = (contact.normalizedPhoneNumber || '').replace(/\D/g, '');
      return (c1 && cleanDigits.endsWith(c1.slice(-9))) || (c2 && cleanDigits.endsWith(c2.slice(-9)));
    });
    const matchedChat = (chats || []).find((chatItem: any) => {
      if (chatItem.isGroup || chatItem.isChannel) return false;
      const cPhone = (chatItem.phone || chatItem.phoneNumber || '').replace(/\D/g, '');
      return cPhone && cleanDigits.endsWith(cPhone.slice(-9));
    });
    const matchedAdmin = (adminUsers || []).find((u: any) => {
      const uPhone = (u.phoneNumber || '').replace(/\D/g, '');
      return uPhone && cleanDigits.endsWith(uPhone.slice(-9));
    });

    const detectedName =
      matchedContact?.name ||
      matchedChat?.name ||
      matchedAdmin?.fullName ||
      (cleanDigits.length >= 10 ? User  : '');

    if (detectedName) {
      setRecipientName(detectedName);
    }
  }, [recipientPhone, deviceContacts, chats, adminUsers]);

  if (!isTransferModalOpen) return null;

  const { dailyUsed, dailyLimit, weeklyUsed, weeklyLimit } = getTransferLimitsUsage();
  const dailyPct = dailyLimit > 0 ? Math.min(100, Math.round((dailyUsed / dailyLimit) * 100)) : 0;
  const weeklyPct = weeklyLimit > 0 ? Math.min(100, Math.round((weeklyUsed / weeklyLimit) * 100)) : 0;
  const hasPinConfigured = Boolean(securitySettings.hasPaymentPin && securitySettings.paymentPin);

  const handleSelectContact = (phone: string, name: string) => {
    setRecipientPhone(phone);
    setRecipientName(name);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setStatusMessage(null);

    if (!hasPinConfigured) {
      setStatusMessage({
        type: 'error',
        text: 'Please create your Security Questions & 4-Digit Payment PIN in Hub before sending money.',
      });
      return;
    }

    const amountNum = parseFloat(amountStr);
    if (!amountNum || amountNum <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid transfer amount.' });
      return;
    }

    const amountInNGN = Math.round(currency === 'NGN' ? amountNum : amountNum / rate);
    const minTransfer = systemConfig?.minTransferAmountNgn ?? 100;
    if (amountInNGN < minTransfer) {
      setStatusMessage({
        type: 'error',
        text: `Minimum transfer amount is ${formatPrice(minTransfer, 'NGN')}.`,
      });
      return;
    }
    if (dailyLimit > 0 && dailyUsed + amountInNGN > dailyLimit) {
      setStatusMessage({
        type: 'error',
        text: `Transfer exceeds your Daily Limit (${formatPrice(dailyLimit, 'NGN')}). Remaining today: ${formatPrice(Math.max(0, dailyLimit - dailyUsed), 'NGN')}.`,
      });
      return;
    }
    if (weeklyLimit > 0 && weeklyUsed + amountInNGN > weeklyLimit) {
      setStatusMessage({
        type: 'error',
        text: `Transfer exceeds your Weekly Limit (${formatPrice(weeklyLimit, 'NGN')}). Remaining this week: ${formatPrice(Math.max(0, weeklyLimit - weeklyUsed), 'NGN')}.`,
      });
      return;
    }
    if (amountInNGN > wallet.availableBalance) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient wallet balance. You have ${formatPrice(wallet.availableBalance, 'NGN')} available.`,
      });
      return;
    }

    const effectiveRecipientName = recipientName.trim() || User  || recipientPhone.trim();
    if (!recipientPhone.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the recipient name and phone number.' });
      return;
    }

    if (paymentPin.trim() !== securitySettings.paymentPin?.trim()) {
      setStatusMessage({ type: 'error', text: 'Invalid 4-digit Payment PIN. Please try again.' });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendDelayedTransfer(recipientPhone, effectiveRecipientName, amountInNGN, note);
      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: result.message || `${formatPrice(amountInNGN, 'NGN')} sent instantly to ${recipientName}!`,
        });
        setPaymentPin('');
        setNote('');
        setActiveTab('history');
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Instant transfer failed.' });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-black text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Instant P2P Transfer</span>
                <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                  Paystack Secured
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Real-time wallet settlement with Daily & Weekly Limits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-neutral-950 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold shrink-0">
          <button
            type="button"
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
            Send Money Instantly
          </button>
          <button
            type="button"
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
            Transfer History ({delayedTransfers.length})
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

          {/* TAB 1: INSTANT P2P TRANSFER */}
          {activeTab === 'send' && (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Missing PIN Guard Banner */}
              {!hasPinConfigured && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Lock className="w-4 h-4" />
                    <span>Payment PIN Not Set Yet</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                    To protect your funds, please set 2 Security Questions and create your 4-digit Payment PIN in Hub before making instant transfers.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTransferModalOpen(false);
                      setIsSecurityModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors"
                  >
                    Set Up Security PIN
                  </button>
                </div>
              )}

              {/* Daily & Weekly Limits Card */}
              <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-950/25 border border-purple-500/20 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Transfer Limits & Instant Settlement</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Live</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-600 dark:text-neutral-300">Daily Limit (24h)</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatPrice(dailyUsed, 'NGN')} / {formatPrice(dailyLimit, 'NGN')}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${dailyPct >= 90 ? 'bg-rose-500' : 'bg-purple-600'}`}
                        style={{ width: `${dailyPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-600 dark:text-neutral-300">Weekly Limit (7d)</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatPrice(weeklyUsed, 'NGN')} / {formatPrice(weeklyLimit, 'NGN')}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${weeklyPct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${weeklyPct}%` }}
                      />
                    </div>
                  </div>
                </div>
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
                    {CURRENCY_SYMBOLS[currency].trim()}
                  </span>
                  <input
                    type="number"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-base font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {chipValues.map((val) => {
                    const strVal = String(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountStr(strVal)}
                        className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                          amountStr === strVal
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold'
                            : 'border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {CURRENCY_SYMBOLS[currency].trim()}{val.toLocaleString()}
                      </button>
                    );
                  })}
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
                  placeholder="e.g. Payment for invoice #492"
                  className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>

              {/* 4-Digit Payment PIN */}
              {hasPinConfigured && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1 flex items-center justify-between">
                    <span>Enter 4-Digit Payment PIN</span>
                    <span className="text-[10px] text-slate-400 font-mono">PIN required</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={paymentPin}
                    onChange={(e) => setPaymentPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="â€¢â€¢â€¢â€¢"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSending || !hasPinConfigured}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isSending ? 'Settling Transfer...' : 'Send Money Instantly'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: TRANSFER HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Recent P2P Transfers
              </div>

              {delayedTransfers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-neutral-400 text-xs">
                  No P2P transfers sent yet.
                </div>
              ) : (
                delayedTransfers.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {tx.recipientName} ({tx.recipientPhone})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {tx.createdAt} · {tx.note}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                        {formatPrice(tx.amount, tx.currency)}
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold uppercase ${
                          tx.status === 'cancelled_by_sender'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {tx.status === 'cancelled_by_sender' ? 'Cancelled' : 'Settled'}
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


