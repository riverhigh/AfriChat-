import React from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Building,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const InvoiceViewerModal: React.FC = () => {
  const { viewingInvoice, setViewingInvoice, formatPrice } = useApp();

  if (!viewingInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert(`Downloading ${viewingInvoice.invoiceNumber}.pdf... Ready to send to customer!`);
  };

  return (
    <div
      onClick={() => setViewingInvoice(null)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
              {viewingInvoice.invoiceNumber}
            </span>
            <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase text-[10px]">
              {viewingInvoice.paymentStatus === 'paid_escrow' ? 'Escrow Secured' : 'Pending'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-200 rounded-xl transition-colors"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-200 rounded-xl transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewingInvoice(null)}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 font-sans print:p-0">
          {/* Header Row */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  Af
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {viewingInvoice.sellerBusinessName}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {viewingInvoice.sellerAddress}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Tel: {viewingInvoice.sellerPhone}
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black font-display text-indigo-900 uppercase">
                INVOICE
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Date: <strong className="font-mono text-slate-800">{viewingInvoice.date}</strong>
              </div>
              <div className="text-xs text-slate-500">
                Due: <strong className="font-mono text-slate-800">{viewingInvoice.dueDate}</strong>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To (Customer):
              </span>
              <div className="font-bold text-sm text-slate-900">{viewingInvoice.buyerName}</div>
              <div className="text-xs text-slate-600 mt-0.5">{viewingInvoice.buyerAddress}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{viewingInvoice.buyerPhone}</div>
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Paystack Escrow Protection
                </span>
                <div className="text-xs font-mono font-semibold text-indigo-600">
                  Ref: {viewingInvoice.paystackRef || 'PSK_DIRECT_992'}
                </div>
              </div>
              {viewingInvoice.escrowPin && (
                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded-lg self-end mt-2">
                  Release PIN: <strong className="font-mono">{viewingInvoice.escrowPin}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewingInvoice.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {it.description}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {it.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      ₦{it.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ₦{it.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">₦{viewingInvoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery / Waybill:</span>
                <span className="font-mono font-medium">+₦{viewingInvoice.deliveryFee.toLocaleString()}</span>
              </div>
              {viewingInvoice.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-₦{viewingInvoice.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono text-base text-indigo-600">
                  ₦{viewingInvoice.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Guarantee Footer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                Verified AGC digital invoice powered by Paystack Direct & Escrow Vault.
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              AFR-DOC-VERIFIED
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
