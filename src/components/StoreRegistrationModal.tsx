import React, { useState } from 'react';
import {
  X,
  Store,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Wallet,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoreTier } from '../types';

export const StoreRegistrationModal: React.FC = () => {
  const {
    isStoreRegModalOpen,
    setIsStoreRegModalOpen,
    storeSubscription,
    subscribeStoreTier,
    wallet,
    currentUser,
    formatPrice,
  } = useApp();

  const [selectedTier, setSelectedTier] = useState<'starter_30' | 'pro_100'>('starter_30');
  const [storeName, setStoreName] = useState(
    storeSubscription?.storeName || (currentUser.fullName ? `${currentUser.fullName}'s Official Store` : 'Lagos Trend Catalogs')
  );
  const [category, setCategory] = useState(storeSubscription?.category || 'Textiles & Fashion');
  const [description, setDescription] = useState(
    storeSubscription?.description || 'Authentic African fabrics, accessories, and bespoke handcrafted inventory with Escrow protection.'
  );
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isStoreRegModalOpen) return null;

  const currentTier = storeSubscription?.tier || 'none';
  const fee = selectedTier === 'starter_30' ? 3000 : 7000;
  const itemLimit = selectedTier === 'starter_30' ? 30 : 100;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      alert('Please enter your store name.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const res = subscribeStoreTier(
        selectedTier,
        storeName.trim(),
        category,
        description.trim(),
        paymentMethod
      );

      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          setFeedback(null);
          setIsStoreRegModalOpen(false);
        }, 2200);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#131126] text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-purple-900/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-purple-900/40 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold font-display leading-tight">
                  Merchant Store Registration
                </h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-400/40 font-mono font-bold px-1.5 py-0.2 rounded-full">
                  Monthly Tiers
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80">
                Register your business store: ₦3k for 30 items or ₦7k for 100 items
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsStoreRegModalOpen(false)}
            className="p-1.5 text-purple-200 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Active Plan Status */}
          {storeSubscription && storeSubscription.active && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Active Subscription
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Store className="w-4 h-4 text-purple-500" />
                  <span>{storeSubscription.storeName}</span>
                </span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium block mt-0.5">
                  {storeSubscription.tier === 'starter_30' ? 'Starter Plan (30 Items Limit)' : 'Pro Plan (100 Items Limit)'} · {storeSubscription.expiresAt}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">Inventory Slots</span>
                <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400">
                  {storeSubscription.itemsCount} / {storeSubscription.itemLimit}
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block">
                  {storeSubscription.itemLimit - storeSubscription.itemsCount} slots free
                </span>
              </div>
            </div>
          )}

          {/* Subscription Tier Cards Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Store Plan & Inventory Limit
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tier 1: ₦3k / month - 30 items */}
              <div
                onClick={() => setSelectedTier('starter_30')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTier === 'starter_30'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md scale-[1.01]'
                    : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-600 text-white">
                    Starter
                  </span>
                </div>

                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  ₦3,000 <span className="text-xs font-normal text-slate-400">/ month</span>
                </div>

                <div className="mt-2 text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>30 Items Inventory Limit</span>
                </div>

                <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>In-chat catalog & product cards</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Paystack & Wallet direct checkout</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Verified Merchant Green Badge</span>
                  </li>
                </ul>
              </div>

              {/* Tier 2: ₦7k / month - 100 items */}
              <div
                onClick={() => setSelectedTier('pro_100')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                  selectedTier === 'pro_100'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md scale-[1.01]'
                    : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300'
                }`}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-bl-lg">
                  Best Value
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-600 text-white mr-10 sm:mr-0">
                    Pro Merchant
                  </span>
                </div>

                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  ₦7,000 <span className="text-xs font-normal text-slate-400">/ month</span>
                </div>

                <div className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>100 Items Inventory Limit</span>
                </div>

                <ul className="mt-2.5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Priority top ranking in marketplace</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Automated PDF invoice generation</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Fast dispatch delivery integration</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Store Setup Details Form */}
          <form onSubmit={handleSubscribe} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Balogun Lace Importers & Accessories"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="Textiles & Fashion">Textiles & Ankara</option>
                  <option value="Electronics & Gadgets">Phones & Gadgets</option>
                  <option value="Beauty & Shea Butter">Shea & Beauty Care</option>
                  <option value="Footwear & Sneakers">Shoes & Footwear</option>
                  <option value="Home & Interior Decor">Furniture & Decor</option>
                  <option value="Food & Provisions">Food & Groceries</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="wallet">AGC Wallet (₦{wallet.availableBalance.toLocaleString()} available)</option>
                  <option value="paystack">Paystack (Debit Card / USSD)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store Bio & Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Describe your authentic goods and delivery warranty"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Price Summary Breakdown */}
            <div className="p-3 bg-purple-50/70 dark:bg-neutral-900 rounded-2xl border border-purple-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-white block">
                  {selectedTier === 'starter_30' ? 'Starter Plan (30 items limit)' : 'Pro Plan (100 items limit)'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Billed monthly · Cancel anytime
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400">
                  ₦{fee.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Activating Store...'
                  : `Pay ₦${fee.toLocaleString()} & Activate Store (${itemLimit} Items Limit)`}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
