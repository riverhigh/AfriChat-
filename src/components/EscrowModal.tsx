import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { useApp, phonesMatch } from '../context/AppContext';

export const EscrowModal: React.FC = () => {
  const {
    activeEscrowModalOrder,
    setActiveEscrowModalOrder,
    escrowOrders,
    currentUser,
    approveEscrowRelease,
    claimEscrowWithCode,
    disputeEscrowOrder,
    formatPrice,
  } = useApp();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);

  if (!activeEscrowModalOrder) return null;

  const order = escrowOrders.find((o) => o.id === activeEscrowModalOrder.id) || activeEscrowModalOrder;
  const myPhone = currentUser.phoneNumber || '';

  const isSeller = Boolean(order.sellerPhone && myPhone && phonesMatch(myPhone, order.sellerPhone)) &&
    !(order.buyerPhone && myPhone && phonesMatch(myPhone, order.buyerPhone));
  const isBuyer = !isSeller;

  const subtotal = order.subtotalAmount ?? Math.max(0, order.totalAmount - (order.escrowFee || 0));
  const fee = order.escrowFee ?? Math.min(Math.round(subtotal * 0.01), 4000);
  const total = order.totalAmount || subtotal + fee;

  const isHeld = order.status === 'escrow_secured' || order.status === 'shipped';
  const isReleaseApproved = order.status === 'release_approved';
  const isReleased = order.status === 'funds_released';
  const isDisputed = order.status === 'disputed';

  const handleApproveRelease = async () => {
    setIsBusy(true);
    setFeedback(null);
    const res = await approveEscrowRelease(order.id);
    setIsBusy(false);
    setFeedback({ type: res.success ? 'success' : 'error', message: res.message });
  };

  const handleClaimWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredCode.trim()) {
      setFeedback({ type: 'error', message: 'Enter the 4-digit system code shared by the buyer.' });
      return;
    }
    setIsBusy(true);
    setFeedback(null);
    const res = await claimEscrowWithCode(order.id, enteredCode.trim());
    setIsBusy(false);
    setFeedback({ type: res.success ? 'success' : 'error', message: res.message });
    if (res.success) setEnteredCode('');
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    const res = await disputeEscrowOrder(order.id, disputeReason.trim() || 'Issue reported with delivery or deal');
    setIsBusy(false);
    setShowDisputeForm(false);
    setDisputeReason('');
    setFeedback({ type: res.success ? 'error' : 'error', message: res.message });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-[#18152e] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#1e1b4b] text-white flex items-center justify-between border-b border-indigo-950 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-sm">AGC Escrow Protection</h3>
              <p className="text-[11px] text-indigo-200 font-mono">
                Order #{order.id} · {isBuyer ? 'Buyer View' : 'Recipient View'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveEscrowModalOrder(null);
              setFeedback(null);
              setShowDisputeForm(false);
            }}
            className="p-1 text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs overflow-y-auto">
          {/* Status Banner visible to BOTH parties */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isReleased
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                : isDisputed
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                : isReleaseApproved
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-200'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {isHeld && 'Funds Held in Escrow Vault — Awaiting Buyer Approval'}
                {isReleaseApproved && 'Buyer Approved Release — Awaiting Code Entry by Recipient'}
                {isReleased && 'Funds Released & Credited to Recipient Wallet'}
                {isDisputed && 'Order Disputed — Funds Frozen Pending Admin Review'}
              </div>
              <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
                {isHeld &&
                  (isBuyer
                    ? 'Money is safely held. Click "Approve & Release Funds" after verifying your item or service.'
                    : 'Buyer’s payment is locked in AGC Escrow. Funds are held awaiting buyer approval before you can claim payout.')}
                {isReleaseApproved &&
                  (isBuyer
                    ? 'You approved release. Share your 4-digit system code below with the recipient so they can claim their payout.'
                    : 'The buyer approved release! Ask the buyer for their 4-digit system code and enter it below to credit your wallet.')}
                {isReleased && `${formatPrice(subtotal, order.currency)} has been credited to ${order.sellerName}.`}
                {isDisputed && (order.disputeReason || 'Escrow locked for admin arbitration.')}
              </p>
            </div>
          </div>

          {/* Order Item + Fee Breakdown */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11101e] border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-3">
              {order.product.imageUrl &&
                !order.product.id.startsWith('deal_') &&
                !order.product.tags?.includes('Escrow') && (
                  <img
                    src={order.product.imageUrl}
                    alt={order.product.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {order.product.title}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {order.buyerName} → {order.sellerName}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Recipient Payout</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatPrice(subtotal, order.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Escrow Fee (1%, max ₦4,000)</span>
                <span className="font-mono">{formatPrice(fee, order.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-200/80 dark:border-slate-800">
                <span>Total Locked</span>
                <span className="font-mono">{formatPrice(total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* 3-Step Tracker */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 font-medium">
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
              <span>1. Funds Held</span>
            </div>
            <div
              className={`p-2 rounded-xl font-medium ${
                isReleaseApproved || isReleased
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <KeyRound className="w-4 h-4 mx-auto mb-1" />
              <span>2. Buyer Approved</span>
            </div>
            <div
              className={`p-2 rounded-xl font-medium ${
                isReleased
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {isReleased ? (
                <Unlock className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
              ) : (
                <Lock className="w-4 h-4 mx-auto mb-1 text-slate-400" />
              )}
              <span>3. Claimed</span>
            </div>
          </div>

          {/* System Release PIN — Strictly visible ONLY to Buyer/Creator */}
          {isBuyer && order.escrowPin && !isReleased && (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-center">
              <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                Your Secret System Release Code
              </div>
              <div className="flex items-center justify-center gap-2 my-1">
                <span className="text-2xl font-bold font-mono tracking-widest text-amber-800 dark:text-amber-300">
                  {order.escrowPin}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(order.escrowPin);
                    setCopiedPin(true);
                    setTimeout(() => setCopiedPin(false), 1800);
                  }}
                  className="p-1.5 rounded-lg bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200"
                  title="Copy release code"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
                {isReleaseApproved
                  ? 'Give this 4-digit code to the recipient so they can claim their escrow payout.'
                  : 'Keep this code private until you inspect delivery and click "Approve & Release Funds" below.'}
              </p>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Actions */}
          {!isReleased && !isDisputed && (
            <div className="space-y-2 pt-1">
              {isBuyer && isHeld && (
                <button
                  type="button"
                  onClick={handleApproveRelease}
                  disabled={isBusy}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isBusy ? 'Approving...' : 'Approve & Release Funds'}</span>
                </button>
              )}

              {isSeller && isHeld && (
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-600 dark:text-slate-300">
                  Waiting for buyer ({order.buyerName}) to approve release before you can enter the claim code.
                </div>
              )}

              {isSeller && isReleaseApproved && (
                <form onSubmit={handleClaimWithCode} className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Enter 4-Digit System Release Code from Buyer
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4-digit code"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-slate-700 font-mono text-center tracking-widest text-sm font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isBusy || enteredCode.length < 4}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs whitespace-nowrap"
                    >
                      {isBusy ? 'Verifying...' : 'Claim Funds'}
                    </button>
                  </div>
                </form>
              )}

              {!showDisputeForm ? (
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(true)}
                  className="w-full py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-medium transition-colors"
                >
                  Report Issue / Dispute Order
                </button>
              ) : (
                <form onSubmit={handleDisputeSubmit} className="space-y-2 p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                  <input
                    type="text"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Reason for dispute (e.g. item not delivered)"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-rose-200 dark:border-rose-800 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDisputeForm(false)}
                      className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                    >
                      Submit Dispute
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {isReleased && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-center font-semibold text-xs">
              Delivery confirmed & {formatPrice(subtotal, order.currency)} released to {order.sellerName}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

