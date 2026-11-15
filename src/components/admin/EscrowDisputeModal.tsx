import React, { useState } from 'react';
import { X, Lock, MessageSquare, ShieldCheck, RotateCcw, FileSearch, AlertTriangle, MapPin, KeyRound } from 'lucide-react';
import { ChatMessage, EscrowOrder, CurrencyCode } from '../../types';

interface EscrowDisputeModalProps {
  order: EscrowOrder | null;
  onClose: () => void;
  onInspectAudit: (refId: string) => void;
  onResolveRequest: (order: EscrowOrder, action: 'release_to_seller' | 'refund_to_buyer', note: string) => void;
  messages: Record<string, ChatMessage[]>;
  formatPrice: (amount: number, fromCurrency?: CurrencyCode) => string;
}

export const EscrowDisputeModal: React.FC<EscrowDisputeModalProps> = ({
  order,
  onClose,
  onInspectAudit,
  onResolveRequest,
  messages,
  formatPrice,
}) => {
  const [adminNote, setAdminNote] = useState('');

  if (!order) return null;

  const chatThreadMessages = messages[order.chatId] || [];

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#09090b] border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
        {/* Top Bar */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Escrow Arbitration Desk</h3>
                <span className="text-xs font-mono text-zinc-400">#{order.id}</span>
              </div>
              <p className="text-xs text-zinc-400 truncate">
                {order.buyerName} ↔ {order.sellerName} · {order.product.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onInspectAudit(order.paystackRef || order.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5 text-violet-400" />
              <span>Audit Log</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          {/* Left: Order & Escrow Evidence */}
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <img
                src={order.product.imageUrl}
                alt={order.product.title}
                className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white leading-snug">{order.product.title}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Qty: {order.quantity} · Channel: {order.paymentMethod.toUpperCase()}</p>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1 tabular-nums">
                  {formatPrice(order.totalAmount, order.currency)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 divide-y divide-zinc-800/80 text-xs">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-zinc-400">Buyer</span>
                <span className="font-medium text-white">{order.buyerName}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-zinc-400">Vendor / Store</span>
                <span className="font-medium text-white">{order.sellerName}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-zinc-400 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Delivery PIN
                </span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">{order.escrowPin}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-zinc-400">Gateway Ref</span>
                <span className="font-mono text-zinc-200">{order.paystackRef || order.id}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                <span className="text-zinc-400 flex items-center gap-1 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  Delivery
                </span>
                <span className="text-right text-zinc-300">{order.deliveryAddress}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-zinc-300 block">
                Arbitration Ruling Note (logged permanently to audit trail)
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Document buyer/seller verification, waybill confirmation, or dispute decision..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Right: Live Buyer <-> Vendor Chat Transcript */}
          <div className="p-5 flex flex-col bg-zinc-950/40 min-h-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                Order Chat Log ({order.chatId})
              </span>
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                {chatThreadMessages.length} messages
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[320px] pr-1">
              {chatThreadMessages.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                  <Lock className="w-5 h-5 text-zinc-600 mb-2" />
                  <p className="text-xs font-medium text-zinc-400">No decrypted messages in current session</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    End-to-end encrypted thread for <span className="font-mono">{order.chatId}</span>.
                  </p>
                </div>
              ) : (
                chatThreadMessages.slice(-25).map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border text-xs ${
                      m.sender === 'user'
                        ? 'bg-violet-950/30 border-violet-500/30 text-zinc-100 ml-6'
                        : m.sender === 'system'
                        ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400 font-mono text-[11px]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-400 mb-1">
                      <span>{m.senderName || (m.sender === 'user' ? order.buyerName : order.sellerName)}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="leading-relaxed break-words">{m.text || `[${m.type}]`}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Decision Controls */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-mono text-zinc-400">
            {order.totalAmount >= 100000
              ? 'Dual-Admin Sign-Off will trigger automatically (≥ ₦100,000).'
              : 'Single-Admin authorization sufficient (< ₦100,000).'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onResolveRequest(
                  order,
                  'refund_to_buyer',
                  adminNote.trim() || 'Admin arbitration refund to buyer'
                )
              }
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refund Buyer</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onResolveRequest(
                  order,
                  'release_to_seller',
                  adminNote.trim() || 'Admin arbitration release to vendor'
                )
              }
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approve Release to Vendor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
