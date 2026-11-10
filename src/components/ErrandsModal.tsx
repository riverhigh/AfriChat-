import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Lock,
  Star,
  MapPin,
  Phone,
  ShieldCheck,
  Tag,
  Key,
  Camera,
  Coins,
  ChevronRight,
  Sparkles,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ErrandItem, ErrandRunner, ErrandOrder } from '../types';
import { getHighestMilestone } from '../utils/milestones';

export const ErrandsModal: React.FC = () => {
  const {
    isErrandsModalOpen,
    setIsErrandsModalOpen,
    errandRunners,
    errandOrders,
    createErrandOrder,
    completeErrandWithCode,
    disputeErrandOrder,
    registerAsErrandRunner,
    addErrandRunnerItem,
    removeErrandRunnerItem,
    wallet,
    currentUser,
    formatPrice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'browse' | 'my_orders' | 'runner_dashboard'>('browse');
  const [selectedRunner, setSelectedRunner] = useState<ErrandRunner | null>(null);
  const [shoppingCart, setShoppingCart] = useState<{ item: ErrandItem; quantity: number }[]>([]);
  const [dropoffAddress, setDropoffAddress] = useState('14 Admiralty Way, Lekki Phase 1, Lagos');
  const [customNotes, setCustomNotes] = useState('');
  const [orderSuccessOrder, setOrderSuccessOrder] = useState<ErrandOrder | null>(null);

  // Runner Registration & Inventory State
  const [runnerName, setRunnerName] = useState(currentUser.fullName || '');
  const [runnerLocation, setRunnerLocation] = useState('Lagos Island / Lekki');
  const [runnerFee, setRunnerFee] = useState<number>(1500);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(2000);
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemCategory, setNewItemCategory] = useState('Groceries');

  // Delivery Code & Dispute State
  const [enteredCode, setEnteredCode] = useState<Record<string, string>>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [activeDisputeOrderId, setActiveDisputeOrderId] = useState<string | null>(null);
  const [proofImageFile, setProofImageFile] = useState<string | null>(null);

  if (!isErrandsModalOpen) return null;

  // Check if current user is registered runner
  const myRunnerProfile = errandRunners.find((r) => r.userId === currentUser.id || r.phone === currentUser.phoneNumber);

  const handleAddToCart = (item: ErrandItem) => {
    setShoppingCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setShoppingCart((prev) =>
      prev
        .map((i) => {
          if (i.item.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as { item: ErrandItem; quantity: number }[]
    );
  };

  const cartTotal = shoppingCart.reduce((sum, cartItem) => sum + cartItem.item.price * cartItem.quantity, 0);
  const deliveryFee = selectedRunner?.deliveryBaseFee || 1500;
  const grandTotal = cartTotal + deliveryFee;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunner) {
      alert('Please select an errand runner.');
      return;
    }
    if (shoppingCart.length === 0) {
      alert('Your shopping list is empty. Add items from the runner’s price list.');
      return;
    }
    if (wallet.availableBalance < grandTotal) {
      alert(`Insufficient wallet balance (${formatPrice(wallet.availableBalance, 'NGN')}). Grand total is ${formatPrice(grandTotal, 'NGN')}. Please top up your wallet.`);
      return;
    }

    const order = createErrandOrder({
      runnerId: selectedRunner.id,
      runnerName: selectedRunner.name,
      runnerPhone: selectedRunner.phone,
      items: shoppingCart.map((c) => ({
        item: c.item,
        quantity: c.quantity,
        subtotal: c.item.price * c.quantity,
      })),
      itemsTotal: cartTotal,
      deliveryFee,
      totalAmount: grandTotal,
      currency: 'NGN',
      dropoffAddress,
      customNotes,
    });

    if (order) {
      setOrderSuccessOrder(order);
      setShoppingCart([]);
      setActiveTab('my_orders');
    }
  };

  const handleRegisterRunner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runnerName.trim()) {
      alert('Please enter your name.');
      return;
    }
    registerAsErrandRunner({
      name: runnerName.trim(),
      location: runnerLocation.trim(),
      deliveryBaseFee: runnerFee,
    });
  };

  const handleAddItemToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || newItemPrice <= 0) {
      alert('Please enter a valid item name and price.');
      return;
    }
    addErrandRunnerItem({
      name: newItemName.trim(),
      price: newItemPrice,
      unit: newItemUnit.trim() || 'piece',
      category: newItemCategory,
      inStock: true,
    });
    setNewItemName('');
    setNewItemPrice(1000);
  };

  const handleImageProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofImageFile(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={() => setIsErrandsModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#130f24] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-purple-900/40 text-slate-900 dark:text-white"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-purple-900/60 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-purple-900/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white font-display">
                AGC Errands & Shopping Concierge
              </h3>
              <p className="text-[10px] text-purple-500 dark:text-purple-300">
                Send personal runners to buy market groceries · Escrow secured
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsErrandsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-purple-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-purple-950/40 mx-4 mt-3 rounded-2xl shrink-0 border border-purple-500/20 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('browse');
              setOrderSuccessOrder(null);
            }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'browse'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-purple-300/70 hover:text-white'
            }`}
          >
            Find Runners
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_orders')}
            className={`py-2 rounded-xl transition-all relative ${
              activeTab === 'my_orders'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-purple-300/70 hover:text-white'
            }`}
          >
            <span>My Errands</span>
            {errandOrders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-amber-500 text-black font-bold rounded-full">
                {errandOrders.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('runner_dashboard')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'runner_dashboard'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-purple-300/70 hover:text-white'
            }`}
          >
            Runner Hub
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BROWSE RUNNERS & ORDER */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              {!selectedRunner ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-purple-300/80 uppercase tracking-wider mb-2">
                    Available Verified Errand Runners
                  </h4>
                  <div className="space-y-3">
                    {errandRunners.map((runner) => {
                      const milestone = getHighestMilestone('errand', runner.completedCount);
                      return (
                        <div
                          key={runner.id}
                          onClick={() => setSelectedRunner(runner)}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200/80 dark:border-purple-900/30 hover:border-purple-500 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={runner.avatar}
                                alt={runner.name}
                                className="w-12 h-12 rounded-full object-cover border border-purple-500/30"
                              />
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-black" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-400 transition-colors">
                                  {runner.name}
                                </h5>
                                {milestone && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <span>{milestone.icon}</span>
                                    <span>{milestone.name}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-purple-400" />
                                <span>{runner.location}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-purple-300">
                                <span>⭐ {runner.rating.toFixed(1)} ({runner.completedCount} errands)</span>
                                <span>·</span>
                                <span className="font-bold text-emerald-400">Fee: {formatPrice(runner.deliveryBaseFee, 'NGN')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-semibold text-purple-500 dark:text-purple-300 group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                              <span>Price List ({runner.itemsForSale.length})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Runner Detail & Shopping List Builder */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-purple-900/30">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRunner(null);
                        setShoppingCart([]);
                      }}
                      className="text-xs text-purple-500 dark:text-purple-300 font-semibold flex items-center gap-1 hover:underline"
                    >
                      ← Back to All Runners
                    </button>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Shopping with {selectedRunner.name}
                    </span>
                  </div>

                  {/* Runner Info Box */}
                  <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-500/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{selectedRunner.bio}</p>
                      <p className="text-[11px] text-purple-300/80 mt-0.5">
                        Base Errand Fee: <strong>{formatPrice(selectedRunner.deliveryBaseFee, 'NGN')}</strong> (held in escrow)
                      </p>
                    </div>
                    {(() => {
                      const m = getHighestMilestone('errand', selectedRunner.completedCount);
                      return m ? (
                        <div className="text-center px-2 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30">
                          <span className="text-lg">{m.icon}</span>
                          <span className="text-[9px] font-bold block text-amber-300">{m.name}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Items the runner can buy (Only items added by runner show up!) */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                      <span>Runner's Published Price List</span>
                      <span className="text-[10px] text-purple-400 font-normal">
                        Prices set by {selectedRunner.name}
                      </span>
                    </h5>

                    {selectedRunner.itemsForSale.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        This runner hasn't added items to their price list yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedRunner.itemsForSale.map((item) => {
                          const inCart = shoppingCart.find((c) => c.item.id === item.id);
                          return (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/30 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                  {item.name}
                                </span>
                                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                                  {formatPrice(item.price, 'NGN')} / {item.unit}
                                </span>
                              </div>

                              {inCart ? (
                                <div className="flex items-center gap-1.5 bg-purple-600 text-white rounded-lg px-2 py-1 text-xs font-bold font-mono">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(item.id, -1)}
                                    className="hover:opacity-75 px-1"
                                  >
                                    -
                                  </button>
                                  <span>{inCart.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(item.id, 1)}
                                    className="hover:opacity-75 px-1"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all"
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Shopping Cart Summary & Checkout */}
                  {shoppingCart.length > 0 && (
                    <form onSubmit={handlePlaceOrder} className="p-3.5 rounded-2xl bg-slate-100 dark:bg-neutral-900 border border-purple-500/40 space-y-3">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>Your Errand Shopping List ({shoppingCart.length} items)</span>
                        <span className="font-mono text-purple-400">{formatPrice(cartTotal, 'NGN')}</span>
                      </h5>

                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {shoppingCart.map((c) => (
                          <div key={c.item.id} className="text-xs flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span>{c.quantity}x {c.item.name}</span>
                            <span className="font-mono">{formatPrice(c.item.price * c.quantity, 'NGN')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block mb-1">
                            Dropoff Address
                          </label>
                          <input
                            type="text"
                            value={dropoffAddress}
                            onChange={(e) => setDropoffAddress(e.target.value)}
                            required
                            placeholder="e.g. House 4, Admiralty Way, Lekki"
                            className="w-full px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 block mb-1">
                            Special Instructions / Brands Preferred
                          </label>
                          <input
                            type="text"
                            value={customNotes}
                            onChange={(e) => setCustomNotes(e.target.value)}
                            placeholder="e.g. Fresh hard chicken only, soft curry leaves"
                            className="w-full px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Items + Delivery Fee:</span>
                            <span className="font-bold font-mono text-emerald-400 text-sm">
                              {formatPrice(grandTotal, 'NGN')}
                            </span>
                          </div>
                          <div className="text-right text-[10px] text-purple-300">
                            <span>Escrow Protected 🔒</span>
                            <span className="block text-slate-400">Wallet: {formatPrice(wallet.availableBalance, 'NGN')}</span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Lock {formatPrice(grandTotal, 'NGN')} into Escrow & Send Runner</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY ORDERS & CODE CONFIRMATION */}
          {activeTab === 'my_orders' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 dark:text-purple-300/80 uppercase tracking-wider mb-2">
                Active & Delivered Errands ({errandOrders.length})
              </h4>

              {errandOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <ShoppingBag className="w-12 h-12 text-purple-400 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No active errand orders yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errandOrders.map((order) => {
                    const isDelivered = order.status === 'delivered';
                    const isCompleted = order.status === 'completed';
                    const isDisputed = order.status === 'disputed';

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-purple-950/30 border border-slate-200 dark:border-purple-900/40 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              Runner: {order.runnerName}
                            </span>
                            <span className="text-[10px] text-purple-400 block font-mono">
                              Phone: {order.runnerPhone} · {order.createdAt}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isDisputed
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isDelivered
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-neutral-800 text-xs space-y-1">
                          {order.items.map((i: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300">
                              <span>{i.quantity}x {i.item.name}</span>
                              <span className="font-mono">{formatPrice(i.subtotal, 'NGN')}</span>
                            </div>
                          ))}
                          <div className="pt-1.5 border-t border-slate-200 dark:border-neutral-800 flex justify-between font-bold text-slate-900 dark:text-white">
                            <span>Total (incl. ₦{order.deliveryFee.toLocaleString()} delivery fee):</span>
                            <span className="text-emerald-400 font-mono">{formatPrice(order.totalAmount, 'NGN')}</span>
                          </div>
                        </div>

                        {/* 4-digit release code display for customer */}
                        <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-purple-300 block font-semibold">Your 4-Digit Release PIN:</span>
                            <span className="text-lg font-black font-mono tracking-widest text-amber-300">
                              {order.escrowReleaseCode}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 max-w-[180px] text-right">
                            Give this 4-digit code to {order.runnerName} <strong>ONLY after inspecting items</strong>!
                          </span>
                        </div>

                        {/* Runner Proof Images Upload Preview */}
                        {order.proofImages && order.proofImages.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-purple-300 block mb-1">
                              Runner's Uploaded Purchase Receipts & Items:
                            </span>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {order.proofImages.map((img: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Receipt / Proof"
                                  className="w-16 h-16 rounded-lg object-cover border border-purple-500/30"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Release or Dispute */}
                        {!isCompleted && !isDisputed && (
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const code = prompt('Enter your 4-digit security code to release escrow funds:');
                                if (code === order.escrowReleaseCode) {
                                  completeErrandWithCode(order.id, code || '');
                                  alert('🎉 Funds released from escrow to runner!');
                                } else if (code) {
                                  alert('❌ Invalid code! Escrow funds remain locked.');
                                }
                              }}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                            >
                              Release Escrow Funds
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt('State reason for dispute (e.g. wrong items, spoiled meat):');
                                if (reason) {
                                  disputeErrandOrder(order.id, reason);
                                  alert('⚠️ Dispute filed. Escrow locked pending admin review.');
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 font-bold text-xs transition-colors"
                            >
                              Dispute
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RUNNER WORKSPACE & INVENTORY MANAGEMENT */}
          {activeTab === 'runner_dashboard' && (
            <div className="space-y-4">
              {!myRunnerProfile ? (
                /* Register as Errand Runner */
                <form onSubmit={handleRegisterRunner} className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Register as an AGC Errand Runner</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Earn by shopping and running market errands for users in your neighborhood. You set your own prices for items and your delivery fee. Escrow protects every job!
                  </p>

                  <div>
                    <label className="text-[10px] font-bold text-purple-300 block mb-1">Runner Name / Business</label>
                    <input
                      type="text"
                      value={runnerName}
                      onChange={(e) => setRunnerName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-purple-300 block mb-1">Coverage Location</label>
                      <input
                        type="text"
                        value={runnerLocation}
                        onChange={(e) => setRunnerLocation(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-purple-300 block mb-1">Base Delivery Fee (₦)</label>
                      <input
                        type="number"
                        value={runnerFee}
                        onChange={(e) => setRunnerFee(Number(e.target.value) || 1000)}
                        required
                        min="500"
                        className="w-full px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
                  >
                    Activate Runner Profile
                  </button>
                </form>
              ) : (
                /* Manage Runner Inventory & Prices */
                <div className="space-y-4">
                  {/* Runner Profile Card & Gamify Badge */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-purple-900/40 border border-purple-500/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">{myRunnerProfile.name}</span>
                        {(() => {
                          const m = getHighestMilestone('errand', myRunnerProfile.completedCount);
                          return m ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {m.icon} {m.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <span className="text-[11px] text-purple-300 block mt-0.5">
                        {myRunnerProfile.completedCount} errands completed · Fee: {formatPrice(myRunnerProfile.deliveryBaseFee, 'NGN')}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold text-[10px] rounded-full border border-emerald-500/30">
                      Active Runner
                    </span>
                  </div>

                  {/* Add Item to Price List Form */}
                  <form onSubmit={handleAddItemToInventory} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/30 space-y-3">
                    <h5 className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-purple-400" />
                      <span>Add Item You Can Buy (Chicken, Fish, Beans, Curry, etc.)</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Anything you don't add will NOT show to customers. You control the prices!
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Item name (e.g. Fresh Chicken)"
                        required
                        className="px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(Number(e.target.value) || 0)}
                        placeholder="Price (₦)"
                        required
                        className="px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        placeholder="Unit (kg, derica, pack)"
                        className="px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      >
                        <option value="Groceries">Groceries</option>
                        <option value="Food Stuffs">Food Stuffs</option>
                        <option value="Meat & Poultry">Meat & Poultry</option>
                        <option value="Spices & Seasoning">Spices & Seasoning</option>
                        <option value="Drinks">Drinks</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      + Save Item to My Price List
                    </button>
                  </form>

                  {/* List of Runner's Active Items */}
                  <div>
                    <h5 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                      My Published Items ({myRunnerProfile.itemsForSale.length})
                    </h5>
                    <div className="space-y-1.5">
                      {myRunnerProfile.itemsForSale.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-purple-950/20 border border-slate-200 dark:border-purple-900/30 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {formatPrice(item.price, 'NGN')} per {item.unit} ({item.category})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeErrandRunnerItem(item.id)}
                            className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
