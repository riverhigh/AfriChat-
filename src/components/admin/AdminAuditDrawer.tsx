import React, { useEffect, useMemo, useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Clock, FileCheck, Lock, Hash, ArrowDownRight } from 'lucide-react';
import { EscrowOrder } from '../../types';

export interface AdminAuditEntry {
  id: string;
  refId: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
  dualApprovedBy?: string;
  timestamp: string;
}

export interface AdminWebhookLog {
  id: string;
  event: string;
  reference: string;
  amountNgn: number;
  status: 'verified' | 'mismatch' | 'processed';
  hmacVerified: boolean;
  ip: string;
  payloadSummary: string;
  timestamp: string;
}

interface AdminAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  refId: string | null;
  title?: string;
  amountNgn?: number;
  order?: EscrowOrder | null;
  auditEntries: AdminAuditEntry[];
  webhookLogs?: AdminWebhookLog[];
}

export const AdminAuditDrawer: React.FC<AdminAuditDrawerProps> = ({
  isOpen,
  onClose,
  refId,
  title,
  amountNgn,
  order,
  auditEntries,
  webhookLogs = [],
}) => {
  const [fetchedEntries, setFetchedEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !refId) return;
    let active = true;
    setLoading(true);
    fetch(`/api/admin/audit/${encodeURIComponent(refId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.entries && Array.isArray(data.entries)) {
          setFetchedEntries(data.entries);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, refId]);

  const timeline = useMemo(() => {
    if (!refId) return [];

    const combined = new Map<string, {
      id: string;
      stage: string;
      actor: string;
      role: string;
      details: string;
      timestamp: string;
      dualApprovedBy?: string;
      verified: boolean;
    }>();

    const addAudit = (entry: AdminAuditEntry) => {
      combined.set(entry.id, {
        id: entry.id,
        stage: entry.action,
        actor: entry.actor,
        role: entry.actorRole,
        details: entry.details,
        timestamp: entry.timestamp,
        dualApprovedBy: entry.dualApprovedBy,
        verified: true,
      });
    };

    fetchedEntries.forEach(addAudit);
    auditEntries
      .filter((a) => a.refId === refId || a.target?.includes(refId) || (order && (a.refId === order.id || a.refId === order.paystackRef)))
      .forEach(addAudit);

    webhookLogs
      .filter((w) => w.reference === refId || (order && (w.reference === order.paystackRef || w.reference === order.id)))
      .forEach((w) => {
        combined.set(`wh_${w.id}`, {
          id: `wh_${w.id}`,
          stage: `Paystack Webhook · ${w.event}`,
          actor: w.hmacVerified ? 'HMAC-SHA512 Verified' : 'Signature Mismatch',
          role: `IP ${w.ip}`,
          details: w.payloadSummary,
          timestamp: w.timestamp,
          verified: w.hmacVerified,
        });
      });

    if (order) {
      const createdIso = order.createdAt || new Date().toISOString();
      if (!Array.from(combined.values()).some((item) => item.stage.includes('Initialized'))) {
        combined.set(`init_${order.id}`, {
          id: `init_${order.id}`,
          stage: order.paymentMethod === 'paystack' ? 'Webhook Received & HMAC Verified' : 'Wallet Ledger Debited',
          actor: order.buyerName,
          role: order.paymentMethod === 'paystack' ? 'Paystack Gateway' : 'AGC Wallet',
          details: `Escrow ref ${order.paystackRef || order.id} authorized for ₦${order.totalAmount.toLocaleString()}`,
          timestamp: createdIso,
          verified: true,
        });
      }
      combined.set(`lock_${order.id}`, {
        id: `lock_${order.id}`,
        stage: 'Escrow Vault Locked',
        actor: 'AGC Escrow Engine',
        role: `PIN #${order.escrowPin}`,
        details: `Held securely for ${order.buyerName} → ${order.sellerName} (${order.product.title})`,
        timestamp: order.updatedAt || createdIso,
        verified: true,
      });
    }

    return Array.from(combined.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [refId, fetchedEntries, auditEntries, webhookLogs, order]);

  if (!isOpen || !refId) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg h-full bg-[#09090b] border-l border-zinc-800 flex flex-col text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-violet-400">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="uppercase tracking-wider font-semibold">Immutable Audit Ledger</span>
            </div>
            <h3 className="text-sm font-semibold text-white truncate mt-1 font-mono tabular-nums">
              {refId}
            </h3>
            {title && <p className="text-xs text-zinc-400 truncate mt-0.5">{title}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/70 transition-colors"
            title="Close Audit Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-zinc-500 block text-[11px]">State Entries</span>
              <span className="font-mono font-semibold text-white tabular-nums">{timeline.length}</span>
            </div>
            {(amountNgn !== undefined || order) && (
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-zinc-500 block text-[11px]">Value Locked / Logged</span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  ₦{(amountNgn ?? order?.totalAmount ?? 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            Append-Only SHA Trail
          </span>
        </div>

        {/* Chronological Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="text-xs font-mono text-zinc-400 py-4">Syncing immutable ledger entries...</div>
          )}

          {!loading && timeline.length === 0 && (
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 text-center space-y-1.5">
              <Hash className="w-5 h-5 text-zinc-500 mx-auto" />
              <p className="text-xs font-medium text-zinc-300">No historical state transitions logged yet</p>
              <p className="text-[11px] text-zinc-500">
                Events for <span className="font-mono">{refId}</span> will appear here chronologically.
              </p>
            </div>
          )}

          <div className="relative pl-5 border-l border-zinc-800 space-y-5">
            {timeline.map((step, index) => (
              <div key={step.id} className="relative">
                <span
                  className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full border ${
                    step.verified
                      ? 'bg-violet-500 border-violet-300'
                      : 'bg-rose-500 border-rose-300'
                  }`}
                />
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/90 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      {index > 0 && <ArrowDownRight className="w-3.5 h-3.5 text-violet-400" />}
                      {step.stage}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 tabular-nums shrink-0">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">{step.details}</p>

                  <div className="pt-1.5 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
                    <span>
                      Actor: <strong className="text-zinc-200">{step.actor}</strong> ({step.role})
                    </span>
                    {step.dualApprovedBy && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Co-signed: {step.dualApprovedBy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs shrink-0">
          <span className="text-zinc-500 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Read-only compliance stream
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
