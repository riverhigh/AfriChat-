import React, { useState } from 'react';
import { ShieldAlert, KeyRound, X, CheckCircle2, Lock } from 'lucide-react';

interface DualAdminApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (secondaryAdminName: string, secondaryAdminPin: string) => Promise<void> | void;
  actionLabel: string;
  targetSummary: string;
  amountNgn: number;
  thresholdNgn?: number;
  errorMsg?: string | null;
  isSubmitting?: boolean;
}

export const DualAdminApprovalModal: React.FC<DualAdminApprovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionLabel,
  targetSummary,
  amountNgn,
  thresholdNgn = 100000,
  errorMsg,
  isSubmitting = false,
}) => {
  const [secondaryName, setSecondaryName] = useState('');
  const [pin, setPin] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secondaryName.trim() || !pin.trim() || isSubmitting) return;
    await onConfirm(secondaryName.trim(), pin.trim());
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#09090b] border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100">
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Dual-Admin Sign-Off Required</h3>
              <p className="text-[11px] font-mono text-zinc-400">
                Threshold ≥ ₦{thresholdNgn.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Requested Action</span>
              <span className="font-semibold text-violet-300">{actionLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Target Reference</span>
              <span className="font-mono text-zinc-200 truncate max-w-[210px]">{targetSummary}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Transaction Value</span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">
                ₦{amountNgn.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Co-Signing Secondary Admin Name / ID
              </label>
              <input
                type="text"
                required
                value={secondaryName}
                onChange={(e) => setSecondaryName(e.target.value)}
                placeholder="e.g. Chinedu O. (Compliance Lead)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                  <span>Secondary Security PIN / Token</span>
                </label>
                <span className="text-[11px] font-mono text-zinc-500">Default PIN: 2468</span>
              </div>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit co-signer PIN"
                className="w-full px-3 py-2 text-xs font-mono tracking-widest rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!secondaryName.trim() || !pin.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {isSubmitting ? <Lock className="w-3.5 h-3.5 animate-pulse" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Verifying Sign-Off...' : 'Authorize & Execute'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
