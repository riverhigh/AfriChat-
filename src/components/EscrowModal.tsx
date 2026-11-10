import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const EscrowModal: React.FC = () => {
  const {
    activeEscrowModalOrder,
    setActiveEscrowModalOrder,
    releaseEscrowFunds,
    formatPrice,
  } = useApp();

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isReleasing, setIsReleasing] = useState(false);
  const [releasePin, setReleasePin] = useState('');

  if (!activeEscrowModalOrder) return null;

  const order = activeEscrowModalOrder;
  const isReleased = order.status === 'funds_released';

  const handleRelease = () => {
    setIsReleasing(true);
    setFeedback(null);

    setTimeout(() => {
      setIsReleasing(false);
      const res = releaseEscrowFunds(order.id, order.escrowPin);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-[#18152e] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 bg-[#1e1b4b] text-white flex items-center justify-between border-b border-indigo-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-sm">AGC Escrow Protection</h3>
              <p className="text-[11px] text-indigo-200 font-mono">Order #{order.id}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveEscrowModalOrder(null);
              setFeedback(null);
            }}
            className="p-1 text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          {/* Order Item */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11101e] border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
            <img
              src={order.product.imageUrl}
              alt={order.product.title}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {order.product.title}
              </h4>
              <p className="text-[11px] text-slate-500">
                Seller: {order.sellerName}
              </p>
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                {formatPrice(order.totalAmount, order.currency)}
              </div>
            </div>
          </div>

          {/* Status Tracker */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 font-medium">
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
              <span>1. Funds Vaulted</span>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 font-medium">
              <Truck className="w-4 h-4 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
              <span>2. Dispatched</span>
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
              <span>3. Delivered</span>
            </div>
          </div>

          {/* Release PIN */}
          <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-center">
            <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
              Delivery Confirmation PIN
            </div>
            <div className="text-2xl font-bold font-mono tracking-widest text-amber-800 dark:text-amber-300 my-1">
              {order.escrowPin}
            </div>
            <p className="text-[10px] text-amber-800 dark:text-amber-300">
              Share this PIN with the dispatch rider only after inspecting your parcel.
            </p>
          </div>

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
          {!isReleased ? (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleRelease}
                disabled={isReleasing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                <span>Confirm Delivery & Release Payment</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  alert(
                    `Dispute Flagged for Order #${order.id}. AGC Arbiter assigned. Funds will remain safely held in escrow.`
                  );
                }}
                className="w-full py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-medium transition-colors"
              >
                Report Issue with Delivery
              </button>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-center font-semibold text-xs">
              Delivery confirmed & funds released to seller.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
