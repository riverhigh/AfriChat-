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
  Crown,
  Check,
  Zap,
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
  const fee = selectedTier === 'starter_30' ? 2199 : 7000;
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
    <div
      onClick={() => setIsStoreRegModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0c051a] text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-purple-500/25 overflow-hidden"
      >
        {/* Header - AfriChat African Purple Gradient */}
        <div className="flex items-center justify-between p-5 border-b border-purple-500/15 bg-gradient-to-r from-purple-950 via-[#150a2e] to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Store className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black font-display tracking-tight text-white">
                  Merchant Store Subscriptions
                </h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/40 font-mono font-bold px-2 py-0.5 rounded-full">
                  Monthly Tiers
                </span>
              </div>
              <p className="text-[11px] text-purple-200/70 mt-0.5">
                Scale your African commerce catalog with verified Escrow protection
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsStoreRegModalOpen(false)}
            className="p-1.5 text-purple-300/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#0e0722]">
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Active Plan Status */}
          {storeSubscription && storeSubscription.active && (
            <div className="p-4 rounded-3xl bg-[#170b33] border border-purple-500/25 flex items-center justify-between shadow-xl shadow-purple-950/40">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300/60 font-bold block">
                  Active Store Subscription
                </span>
                <span className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5 font-display">
                  <Store className="w-4 h-4 text-purple-400" />
                  <span>{storeSubscription.storeName}</span>
                </span>
                <span className="text-[11px] text-purple-300 font-medium block mt-0.5">
                  {storeSubscription.tier === 'starter_30' ? 'Starter Plan (30 Items Limit)' : 'Pro Plan (100 Items Limit)'} · {storeSubscription.expiresAt}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-purple-300/60 block font-mono">Inventory Slots</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {storeSubscription.itemsCount} / {storeSubscription.itemLimit}
                </span>
                <span className="text-[9px] text-purple-300 font-bold block">
                  {storeSubscription.itemLimit - storeSubscription.itemsCount} slots free
                </span>
              </div>
            </div>
          )}

          {/* Subscription Tier Cards Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-purple-300/80">
                Choose Your Store Plan
              </label>
              <span className="text-[11px] text-purple-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Escrow Protection</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tier 1: ₦2,199 / month - 30 items */}
              <div
                onClick={() => setSelectedTier('starter_30')}
                className={`p-4 rounded-3xl border-2 cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedTier === 'starter_30'
                    ? 'border-purple-500 bg-gradient-to-br from-[#1a0e36] to-[#25104d] shadow-xl shadow-purple-600/25 ring-2 ring-purple-500/20 scale-[1.01]'
                    : 'border-purple-500/20 bg-[#140a2c] hover:border-purple-400/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-2xl bg-purple-600/30 text-purple-300 border border-purple-400/30 flex items-center justify-center font-bold">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-600 text-white shadow-sm">
                      Starter Tier
                    </span>
                  </div>

                  <div className="text-2xl font-black font-mono text-white">
                    ₦2,199 <span className="text-xs font-normal text-purple-300/70">/ month</span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>30 Items Inventory Limit</span>
                  </div>

                  <ul className="mt-3 space-y-2 text-[11px] text-purple-200/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>In-chat WhatsApp catalog & product cards</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Paystack & Wallet direct checkout</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Verified Merchant Green Checkmark</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-purple-500/20 text-center">
                  <span className={`text-xs font-bold ${selectedTier === 'starter_30' ? 'text-purple-300' : 'text-purple-300/50'}`}>
                    {selectedTier === 'starter_30' ? '✓ Selected Plan' : 'Select Starter'}
                  </span>
                </div>
              </div>

              {/* Tier 2: ₦7,000 / month - 100 items */}
              <div
                onClick={() => setSelectedTier('pro_100')}
                className={`p-4 rounded-3xl border-2 cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                  selectedTier === 'pro_100'
                    ? 'border-indigo-500 bg-gradient-to-br from-[#120f38] to-[#1e1754] shadow-xl shadow-indigo-600/30 ring-2 ring-indigo-500/20 scale-[1.01]'
                    : 'border-purple-500/20 bg-[#140a2c] hover:border-purple-400/30 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl shadow-sm">
                  POPULAR
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold">
                      <Crown className="w-4 h-4 text-amber-300" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-600 text-white mr-12 sm:mr-0 shadow-sm">
                      Pro Merchant
                    </span>
                  </div>

                  <div className="text-2xl font-black font-mono text-white">
                    ₦7,000 <span className="text-xs font-normal text-purple-300/70">/ month</span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>100 Items Inventory Limit</span>
                  </div>

                  <ul className="mt-3 space-y-2 text-[11px] text-purple-200/80">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Priority #1 ranking in AGC Marketplace</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Automated PDF receipt & invoice maker</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Fast Lagos & Pan-Africa dispatch courier</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-500/20 text-center">
                  <span className={`text-xs font-bold ${selectedTier === 'pro_100' ? 'text-indigo-300' : 'text-purple-300/50'}`}>
                    {selectedTier === 'pro_100' ? '✓ Selected Plan' : 'Select Pro'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Store Setup Details Form */}
          <form onSubmit={handleSubscribe} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-1">
                Store / Brand Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Balogun Lace Importers & Accessories"
                className="w-full px-4 py-2.5 bg-[#140a2c] border border-purple-500/25 rounded-2xl text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">
                  Primary Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#140a2c] border border-purple-500/25 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="Textiles & Fashion" className="bg-[#140a2c]">Textiles & Ankara</option>
                  <option value="Electronics & Gadgets" className="bg-[#140a2c]">Phones & Gadgets</option>
                  <option value="Beauty & Shea Butter" className="bg-[#140a2c]">Shea & Beauty Care</option>
                  <option value="Footwear & Sneakers" className="bg-[#140a2c]">Shoes & Footwear</option>
                  <option value="Home & Interior Decor" className="bg-[#140a2c]">Furniture & Decor</option>
                  <option value="Food & Provisions" className="bg-[#140a2c]">Food & Groceries</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">
                  Billing Source
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#140a2c] border border-purple-500/25 rounded-2xl text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="wallet" className="bg-[#140a2c]">
                    AGC Wallet (₦{(wallet.availableBalance || 0).toLocaleString()} available)
                  </option>
                  <option value="paystack" className="bg-[#140a2c]">
                    Paystack (Debit Card / USSD)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-200 mb-1">
                Store Description & Shipping Policy
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Describe your authentic goods and delivery warranty"
                className="w-full px-4 py-2.5 bg-[#140a2c] border border-purple-500/25 rounded-2xl text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Price Summary Breakdown */}
            <div className="p-3.5 bg-[#180b33] rounded-2xl border border-purple-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedTier === 'starter_30' ? 'Starter Plan (30 items limit)' : 'Pro Plan (100 items limit)'}
                </span>
                <span className="text-[11px] text-purple-300/70">
                  Instant activation · Auto-renews monthly · Cancel anytime
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-mono text-emerald-400">
                  ₦{fee.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-purple-600/30 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
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
