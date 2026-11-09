import React, { useState } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Send,
  Building,
  User,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InvoiceData, InvoiceItem } from '../types';

export const InvoiceGeneratorModal: React.FC = () => {
  const {
    isInvoiceGeneratorOpen,
    setIsInvoiceGeneratorOpen,
    sendInvoiceReceipt,
    activeChatId,
    chats,
    formatPrice,
  } = useApp();

  const currentChat = chats.find((c) => c.id === activeChatId);

  const [businessName, setBusinessName] = useState(
    currentChat?.verifiedStore ? currentChat.name : 'Chioma Adebayo Wholesale Store'
  );
  const [buyerName, setBuyerName] = useState('Customer / Client');
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'it_1',
      description: 'Dutch Super-Wax Premium Cotton (6 Yards)',
      quantity: 1,
      unitPrice: 45000,
      total: 45000,
    },
  ]);
  const [deliveryFee, setDeliveryFee] = useState(3000);
  const [discount, setDiscount] = useState(0);

  if (!isInvoiceGeneratorOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `it_${Date.now()}`,
        description: 'New Item / Parcel',
        quantity: 1,
        unitPrice: 10000,
        total: 10000,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: 'description' | 'quantity' | 'unitPrice', val: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  };

  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const totalAmount = Math.max(0, subtotal + deliveryFee - discount);

  const handleGenerateAndSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId) return;

    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice: InvoiceData = {
      id: `inv_${Date.now()}`,
      invoiceNumber: invoiceNum,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      dueDate: 'Due on delivery inspection',
      sellerBusinessName: businessName,
      sellerPhone: '+234 803 123 4567',
      sellerAddress: 'Balogun Trade Arcade, Lagos Island',
      buyerName,
      buyerPhone: '+234 803 000 1122',
      buyerAddress: '14 Admiralty Way, Lekki Phase 1, Lagos',
      items,
      subtotal,
      deliveryFee,
      discount,
      totalAmount,
      currency: 'NGN',
      paymentStatus: 'paid_escrow',
      paystackRef: `PSK_${Math.floor(10000000 + Math.random() * 90000000)}`,
      escrowPin: `${Math.floor(1000 + Math.random() * 9000)}`,
    };

    sendInvoiceReceipt(activeChatId, newInvoice);
    setIsInvoiceGeneratorOpen(false);
  };

  return (
    <div
      onClick={() => setIsInvoiceGeneratorOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Invoice & Receipt Generator
              </h3>
              <p className="text-[10px] text-slate-400">
                Official branded digital receipt with Paystack Escrow seal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsInvoiceGeneratorOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerateAndSend} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Business & Buyer Info */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Seller Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Items & Services
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                      placeholder="Item name / spec..."
                      className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 text-xs py-0.5 focus:outline-none"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-slate-400 hover:text-rose-500 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(it.id, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Unit (₦):</span>
                      <input
                        type="number"
                        min={0}
                        value={it.unitPrice}
                        onChange={(e) => handleUpdateItem(it.id, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Total:</span>
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 py-1">
                        ₦{it.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Discount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 mb-1">Waybill / Delivery Fee (₦)</label>
              <input
                type="number"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Customer Discount (₦)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          {/* Invoice Summary Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono">₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Delivery Fee:</span>
              <span className="font-mono">+₦{deliveryFee.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-₦{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-indigo-200 dark:border-indigo-800 flex justify-between font-bold text-sm text-indigo-950 dark:text-indigo-200">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                ₦{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsInvoiceGeneratorOpen(false)}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4" />
              <span>Generate & Drop Invoice in Chat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
