import React, { useState } from 'react';
import {
  X,
  Truck,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  DollarSign,
  PackageCheck,
  Bike,
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

  const [provider, setProvider] = useState<DispatchProvider>('gokada');
  const [vehicleType, setVehicleType] = useState<'bike' | 'keke' | 'van'>('bike');
  const [senderAddress, setSenderAddress] = useState('Shop 14, Balogun Ultra-Modern Complex, Lagos Island');
  const [senderPhone, setSenderPhone] = useState(currentUser.phoneNumber || '+2348031234567');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [packageDesc, setPackageDesc] = useState('Ankara Fabric Bale (6 Yards)');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<DispatchDeliveryOrder | null>(
    dispatchOrders[0] || null
  );
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false);

  if (!isDispatchModalOpen) return null;

  const estimatedFee = vehicleType === 'bike' ? 2400 : vehicleType === 'keke' ? 3800 : 6500;

  const handleBookDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim()) {
      alert('Please fill out all recipient delivery details');
      return;
    }

    const newOrder = createDispatchOrder({
      provider,
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
    setTimeout(() => {
      setOrderCreatedSuccess(false);
    }, 4000);
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
                Gokada & PickkR Dispatch
              </h3>
              <p className="text-[10px] text-slate-400">
                Instant courier API dispatch & rider tracking
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

        {/* Success Banner */}
        {orderCreatedSuccess && (
          <div className="mx-4 mt-3 p-3 bg-emerald-600 text-white rounded-2xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <strong>Rider Dispatched!</strong> {activeTrackingOrder?.riderName} ({activeTrackingOrder?.provider.toUpperCase()}) is en route to pickup.
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Rider Tracking Card if any */}
          {activeTrackingOrder && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-indigo-950 text-white space-y-3 border border-emerald-500/30 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold font-mono tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {activeTrackingOrder.provider === 'gokada' ? '🟢 Gokada Express' : '🟠 PickkR Hub'} · Live
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
              Book New Delivery Courier
            </h4>

            {/* Provider API Choice */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider('gokada')}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  provider === 'gokada'
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Gokada API</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-black">45 MIN</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Instant motorbike parcel delivery across Lagos & Abuja
                </p>
              </button>

              <button
                type="button"
                onClick={() => setProvider('pickkr')}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  provider === 'pickkr'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100'
                    : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>PickkR API</span>
                  <span className="text-[10px] font-mono text-indigo-600 font-black">SAME DAY</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Multi-carrier aggregator & interstate waybill shipments
                </p>
              </button>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bike', label: 'Motorbike', desc: 'Up to 15kg' },
                  { id: 'keke', label: 'Tricycle / Keke', desc: 'Up to 50kg' },
                  { id: 'van', label: 'Cargo Van', desc: 'Bulk goods' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleType(v.id as any)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      vehicleType === v.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{v.label}</div>
                    <div className="text-[9px] text-slate-400">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Recipient & Dropoff Details
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

            {/* Package Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Description
              </label>
              <input
                type="text"
                value={packageDesc}
                onChange={(e) => setPackageDesc(e.target.value)}
                placeholder="e.g. Ankara Fabric, Electronics, Shoes"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              />
            </div>

            {/* Fee quote & Pay button */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500">Estimated Delivery Fee:</div>
                <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {formatPrice(estimatedFee, 'NGN')}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                Wallet Balance: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatPrice(wallet.availableBalance, 'NGN')}</strong>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Truck className="w-4 h-4" />
              <span>Book {provider.toUpperCase()} Rider Now</span>
            </button>
          </form>

          {/* Previous Dispatch Orders History */}
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
                    <span className="capitalize text-indigo-600 dark:text-indigo-400 font-semibold">{ord.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
