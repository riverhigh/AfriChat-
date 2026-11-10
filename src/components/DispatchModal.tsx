import React, { useState } from 'react';
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

  // Internal provider state — hidden from user, auto-selected by weight
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

  if (!isDispatchModalOpen) return null;

  // Fee is based on vehicle only — no keke
  const estimatedFee = vehicleType === 'bike' ? 2400 : 6500;

  // Auto-select provider based on weight — completely hidden from user
  const autoSelectProvider = (): DispatchProvider => {
    // Heavy items (≥5kg) or van → PicckR (better for cargo)
    // Light items (<5kg) + bike → Gokada (faster for parcels)
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

    // Auto-select provider — user never sees this
    const selectedProvider = autoSelectProvider();

    // Show "Searching for a rider..." state
    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      const newOrder = createDispatchOrder({
        provider: selectedProvider,
        vehicleType,
        senderAddress,
        senderPhone,
        recipientName,
        recipientPhone,
        recipientAddress,
        packageDescription: packageDesc,
        estimatedFee,
        currency: 'NGN',
      });

      setActiveTrackingOrder(newOrder);
      setOrderCreatedSuccess(true);
      setTimeout(() => setOrderCreatedSuccess(false), 5000);
    }, 2200); // Simulate rider search
  };

  return (
    <div
      onClick={() => setIsDispatchModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                AGC Dispatch
              </h3>
              <p className="text-[10px] text-slate-400">
                Fast, trusted courier delivery across Nigeria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDispatchModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Searching for rider overlay */}
        {isSearching && (
          <div className="mx-4 mt-3 p-4 bg-indigo-600 text-white rounded-2xl flex flex-col items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 animate-pulse" />
              <strong className="text-sm">Searching for a rider nearby...</strong>
            </div>
            <p className="text-xs text-indigo-200">Our system is finding the best available courier for your delivery</p>
            <div className="w-full bg-indigo-700 rounded-full h-1.5 overflow-hidden mt-1">
              <div className="bg-white h-full rounded-full animate-[width_2s_ease-in-out_forwards]" style={{ animation: 'pulse 0.8s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {/* Rider found success banner */}
        {orderCreatedSuccess && !isSearching && (
          <div className="mx-4 mt-3 p-3 bg-emerald-600 text-white rounded-2xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <strong>Rider Found & Dispatched!</strong>{' '}
              {activeTrackingOrder?.riderName} is on the way to pick up your package.
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Rider Tracking Card */}
          {activeTrackingOrder && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-indigo-950 text-white space-y-3 border border-emerald-500/30 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold font-mono tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  🟢 Rider Assigned · Live Tracking
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {activeTrackingOrder.trackingCode}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    <span>{activeTrackingOrder.riderName}</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Plate: {activeTrackingOrder.riderPlate}
                  </p>
                </div>
                <a
                  href={`tel:${activeTrackingOrder.riderPhone}`}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Rider</span>
                </a>
              </div>

              {/* Progress Milestones */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-medium text-slate-300">
                  <span className="text-emerald-400 font-bold">1. Assigned</span>
                  <span className="text-emerald-400 font-bold">2. En Route</span>
                  <span className="text-slate-400">3. Delivered</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-indigo-400 h-full w-2/3" />
                </div>
              </div>

              <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-white/10 font-mono">
                <span className="truncate pr-2">To: {activeTrackingOrder.recipientName} ({activeTrackingOrder.recipientAddress})</span>
                <span className="font-bold text-emerald-400 shrink-0">₦{activeTrackingOrder.estimatedFee.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Booking Form */}
          <form onSubmit={handleBookDispatch} className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Book New Delivery
            </h4>

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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                />
              </div>

              {/* Vehicle Type — bike or van only */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'bike', label: '🏍️ Bike', desc: '<15kg' },
                    { id: 'van', label: '🚐 Van', desc: 'Bulk' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleType(v.id as 'bike' | 'van')}
                      className={`py-1.5 px-2 rounded-xl border text-center transition-all text-[11px] ${
                        vehicleType === v.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                placeholder="e.g. Ankara Fabric, Shoes, Electronics"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
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
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                />
                <input
                  type="tel"
                  placeholder="Phone (080...)"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  required
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                />
              </div>
              <input
                type="text"
                placeholder="Dropoff Address (e.g. 14 Admiralty Way, Lekki Phase 1)"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              />
            </div>

            {/* Fee quote */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500">Estimated Delivery Fee:</div>
                <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {formatPrice(estimatedFee, 'NGN')}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                Wallet Balance:{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {formatPrice(wallet.availableBalance, 'NGN')}
                </strong>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Rider identity verified · Delivery tracked end-to-end · Funds held in escrow until delivery</span>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              {isSearching ? (
                <>
                  <Search className="w-4 h-4 animate-pulse" />
                  <span>Searching for a rider...</span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Book Courier Now</span>
                </>
              )}
            </button>
          </form>

          {/* Previous Dispatch Orders History */}
          {dispatchOrders.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Dispatch History ({dispatchOrders.length})
              </h4>
              <div className="space-y-2">
                {dispatchOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setActiveTrackingOrder(ord)}
                    className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {ord.recipientName}
                      </span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ₦{ord.estimatedFee.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {ord.recipientAddress}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>{ord.trackingCode}</span>
                      <span className="capitalize text-indigo-600 dark:text-indigo-400 font-semibold">
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
