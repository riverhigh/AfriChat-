import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  Bike,
  Package,
  Weight,
  Navigation,
  Search,
  ShieldCheck,
  History,
  Clock,
  Copy,
  Check,
  RotateCcw,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DispatchDeliveryOrder, DispatchProvider } from '../types';

export const DispatchModal: React.FC = () => {
  const {
    isDispatchModalOpen,
    setIsDispatchModalOpen,
    dispatchOrders,
    createDispatchOrder,
    wallet,
    currentUser,
    formatPrice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [vehicleType, setVehicleType] = useState<'bike' | 'van'>('bike');
  const [packageWeight, setPackageWeight] = useState<number>(1);
  const [senderAddress, setSenderAddress] = useState('Shop 14, Balogun Ultra-Modern Complex, Lagos Island');
  const [senderPhone, setSenderPhone] = useState(currentUser.phoneNumber || '+2348031234567');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<DispatchDeliveryOrder | null>(
    dispatchOrders[0] || null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sync active tracking order when dispatchOrders updates via live socket/API
  useEffect(() => {
    if (activeTrackingOrder) {
      const updated = dispatchOrders.find((o) => o.id === activeTrackingOrder.id);
      if (updated && (updated.status !== activeTrackingOrder.status || updated.totalFee !== activeTrackingOrder.totalFee)) {
        setActiveTrackingOrder(updated);
      }
    } else if (dispatchOrders.length > 0) {
      setActiveTrackingOrder(dispatchOrders[0]);
    }
  }, [dispatchOrders, activeTrackingOrder]);

  if (!isDispatchModalOpen) return null;

  // Fee calculation: base fee + 5% platform fee
  const baseDeliveryFee = vehicleType === 'bike' ? 2400 : 6500;
  const platformFee = Math.round(baseDeliveryFee * 0.05); // 5% platform fee
  const totalDeliveryCost = baseDeliveryFee + platformFee;

  // Auto-select provider based on weight (internal logistics routing)
  const autoSelectProvider = (): DispatchProvider => {
    return packageWeight >= 5 || vehicleType === 'van' ? 'pickkr' : 'gokada';
  };

  const handleBookDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim()) {
      alert('Please fill out all recipient delivery details');
      return;
    }
    if (!packageDesc.trim()) {
      alert('Please describe the item(s) you are sending');
      return;
    }

    const selectedProvider = autoSelectProvider();
    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      const newOrder = createDispatchOrder({
        provider: selectedProvider,
        vehicleType,
        senderAddress,
        senderPhone,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        recipientAddress: recipientAddress.trim(),
        packageDescription: packageDesc.trim(),
        estimatedFee: baseDeliveryFee,
        platformFee,
        totalFee: totalDeliveryCost,
        currency: 'NGN',
      });

      setActiveTrackingOrder(newOrder);
      setOrderCreatedSuccess(true);
      // Reset form fields
      setPackageDesc('');
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setTimeout(() => setOrderCreatedSuccess(false), 5000);
    }, 1800);
  };

  const copyTrackingCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleReorder = (order: DispatchDeliveryOrder) => {
    setRecipientName(order.recipientName);
    setRecipientPhone(order.recipientPhone);
    setRecipientAddress(order.recipientAddress);
    setPackageDesc(order.packageDescription);
    setVehicleType(order.vehicleType);
    setActiveTab('book');
  };

  // Filter history orders
  const filteredOrders = dispatchOrders.filter((ord) => {
    const matchesSearch =
      ord.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.recipientAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.packageDescription.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') {
      return ord.status !== 'delivered';
    }
    if (statusFilter === 'delivered') {
      return ord.status === 'delivered';
    }
    return true;
  });

  const activeCount = dispatchOrders.filter((o) => o.status !== 'delivered').length;
  const deliveredCount = dispatchOrders.filter((o) => o.status === 'delivered').length;

  return (
    <div
      onClick={() => setIsDispatchModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                  AGC Dispatch
                </h3>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  LIVE API
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                On-demand parcel delivery across Nigeria with live tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDispatchModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Book vs History */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`flex-1 pb-2.5 pt-1 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'book'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Book & Track</span>
            {activeTrackingOrder && activeTrackingOrder.status !== 'delivered' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 pb-2.5 pt-1 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Order History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {dispatchOrders.length}
            </span>
          </button>
        </div>

        {/* Searching for rider overlay banner */}
        {isSearching && (
          <div className="mx-4 mt-3 p-4 bg-indigo-600 text-white rounded-2xl flex flex-col items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 animate-pulse" />
              <strong className="text-sm">Connecting to Live Courier API...</strong>
            </div>
            <p className="text-xs text-indigo-200 text-center">
              Matching your package with nearest verified rider in Lagos
            </p>
            <div className="w-full bg-indigo-700 rounded-full h-1.5 overflow-hidden mt-1">
              <div
                className="bg-white h-full rounded-full animate-pulse"
                style={{ width: '85%' }}
              />
            </div>
          </div>
        )}

        {/* Rider found success banner */}
        {orderCreatedSuccess && !isSearching && (
          <div className="mx-4 mt-3 p-3 bg-emerald-600 text-white rounded-2xl flex items-center gap-2.5 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <strong>Rider Dispatched & Commission Recorded!</strong>{' '}
              {activeTrackingOrder?.riderName} is assigned to pickup your package.
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'book' ? (
            <>
              {/* Active Tracking Card */}
              {activeTrackingOrder && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-indigo-950 text-white space-y-3 border border-emerald-500/30 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold font-mono tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {activeTrackingOrder.status === 'delivered'
                        ? 'Delivered'
                        : activeTrackingOrder.status === 'in_transit'
                        ? 'In Transit'
                        : 'Rider Assigned · Live'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyTrackingCode(activeTrackingOrder.trackingCode)}
                      className="text-xs font-mono font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-md transition-colors"
                      title="Copy Tracking Code"
                    >
                      <span>{activeTrackingOrder.trackingCode}</span>
                      {copiedCode === activeTrackingOrder.trackingCode ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-70" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Bike className="w-4 h-4 text-emerald-400" />
                        <span>{activeTrackingOrder.riderName}</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 font-mono">
                        Plate: {activeTrackingOrder.riderPlate || 'GKD-481-APP'}
                      </p>
                    </div>
                    {activeTrackingOrder.riderPhone && (
                      <a
                        href={`tel:${activeTrackingOrder.riderPhone}`}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Rider</span>
                      </a>
                    )}
                  </div>

                  {/* Progress Milestones */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className={activeTrackingOrder.status !== 'finding_rider' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        1. Assigned
                      </span>
                      <span className={activeTrackingOrder.status === 'in_transit' || activeTrackingOrder.status === 'delivered' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        2. En Route
                      </span>
                      <span className={activeTrackingOrder.status === 'delivered' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        3. Delivered
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-indigo-400 h-full transition-all duration-500"
                        style={{
                          width:
                            activeTrackingOrder.status === 'delivered'
                              ? '100%'
                              : activeTrackingOrder.status === 'in_transit'
                              ? '66%'
                              : '33%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Pricing Breakdown with 5% Platform Fee */}
                  <div className="pt-2 border-t border-white/10 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="truncate pr-2">To: {activeTrackingOrder.recipientName} ({activeTrackingOrder.recipientAddress})</span>
                      <span className="font-mono text-slate-300 shrink-0">
                        Base: ₦{activeTrackingOrder.estimatedFee.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-emerald-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AfriChat Fee (5%):
                      </span>
                      <span className="text-emerald-300">
                        +₦{(activeTrackingOrder.platformFee ?? Math.round(activeTrackingOrder.estimatedFee * 0.05)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono font-bold text-xs pt-1 border-t border-white/5">
                      <span className="text-white">Total Charged:</span>
                      <span className="text-emerald-400">
                        ₦{(activeTrackingOrder.totalFee ?? (activeTrackingOrder.estimatedFee + (activeTrackingOrder.platformFee ?? Math.round(activeTrackingOrder.estimatedFee * 0.05)))).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Form */}
              <form onSubmit={handleBookDispatch} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Book New Delivery
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    5% Platform Fee Included
                  </span>
                </div>

                {/* Package Info Row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Package Weight */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Weight className="w-3 h-3" /> Weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Vehicle Type
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { id: 'bike', label: '🏍️ Bike', desc: '<15kg' },
                        { id: 'van', label: '🚐 Van', desc: 'Bulk Cargo' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVehicleType(v.id as 'bike' | 'van')}
                          className={`py-1.5 px-2 rounded-xl border text-center transition-all text-[11px] ${
                            vehicleType === v.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div>{v.label}</div>
                          <div className="text-[9px] text-slate-400">{v.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Item Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Item Description
                  </label>
                  <input
                    type="text"
                    value={packageDesc}
                    onChange={(e) => setPackageDesc(e.target.value)}
                    placeholder="e.g. Ankara Fabric, iPhone 15, Shoes"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Sender Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" /> Pickup Address
                  </label>
                  <input
                    type="text"
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Recipient Details */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-indigo-500" /> Recipient & Dropoff Details
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Recipient Name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (080...)"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      required
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Dropoff Address (e.g. 14 Admiralty Way, Lekki Phase 1)"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Transparent 5% Fee Quote Box */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Base Courier Rate ({vehicleType}):</span>
                    <span className="font-mono font-semibold">{formatPrice(baseDeliveryFee, 'NGN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AfriChat Platform Fee (5%):
                    </span>
                    <span className="font-mono font-semibold">+{formatPrice(platformFee, 'NGN')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Total Delivery Amount:</div>
                      <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {formatPrice(totalDeliveryCost, 'NGN')}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      Wallet Balance:{' '}
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        {formatPrice(wallet.availableBalance, 'NGN')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Security Guarantee Note */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Escrow Protection · Live GPS tracking · 5% platform commission guarantees instant customer support</span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  {isSearching ? (
                    <>
                      <Search className="w-4 h-4 animate-pulse" />
                      <span>Searching nearby riders...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Book Courier Now • {formatPrice(totalDeliveryCost, 'NGN')}</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* ORDER HISTORY TAB */
            <div className="space-y-3">
              {/* Search & Filter Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by code, recipient, address, or item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-full font-medium transition-all text-[11px] ${
                      statusFilter === 'all'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All ({dispatchOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1 rounded-full font-medium transition-all text-[11px] flex items-center gap-1 ${
                      statusFilter === 'active'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('delivered')}
                    className={`px-3 py-1 rounded-full font-medium transition-all text-[11px] ${
                      statusFilter === 'delivered'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    Delivered ({deliveredCount})
                  </button>
                </div>
              </div>

              {/* History Items List */}
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No dispatch orders found
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {searchQuery
                      ? 'No delivery matches your search query. Try another keyword.'
                      : 'You have not booked any dispatch deliveries yet. Book your first one above!'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="mt-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                  >
                    Book a Delivery Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((ord) => {
                    const ordPlatformFee = ord.platformFee ?? Math.round(ord.estimatedFee * 0.05);
                    const ordTotalFee = ord.totalFee ?? (ord.estimatedFee + ordPlatformFee);

                    return (
                      <div
                        key={ord.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 transition-all hover:border-indigo-400/50"
                      >
                        {/* Header: Tracking code & Status badge */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => copyTrackingCode(ord.trackingCode)}
                            className="flex items-center gap-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Click to copy code"
                          >
                            <span>{ord.trackingCode}</span>
                            {copiedCode === ord.trackingCode ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-60" />
                            )}
                          </button>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ord.status === 'delivered'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : ord.status === 'in_transit'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {ord.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Package & Destination Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {ord.vehicleType === 'van' ? (
                              <Truck className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <Bike className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span>{ord.packageDescription}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              To: <strong>{ord.recipientName}</strong> · {ord.recipientAddress}
                            </span>
                          </div>
                        </div>

                        {/* Rider details */}
                        {ord.riderName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/40 p-2 rounded-xl flex items-center justify-between border border-slate-200/50 dark:border-slate-800/50">
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {ord.riderName}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {ord.riderPlate}
                              </div>
                            </div>
                            {ord.riderPhone && (
                              <a
                                href={`tel:${ord.riderPhone}`}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Financial breakdown: Base, 5% fee, Total */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-[10px] text-slate-400">
                              Base: ₦{ord.estimatedFee.toLocaleString()} · 5% Fee: ₦{ordPlatformFee.toLocaleString()}
                            </div>
                            <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              Total: ₦{ordTotalFee.toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTrackingOrder(ord);
                                setActiveTab('book');
                              }}
                              className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Track Live</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorder(ord)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Re-order to same recipient"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reorder</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
