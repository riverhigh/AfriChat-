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
  Zap,
  Menu,
  Bell,
  ChevronDown,
  ChevronRight,
  Sliders,
  Send,
  CloudSun,
  Loader2,
  Bot,
  AlertCircle,
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
    systemConfig,
    startAiChat,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [vehicleType, setVehicleType] = useState<'bike' | 'van'>('bike');
  const [packageWeight, setPackageWeight] = useState<number>(2);
  const [senderAddress, setSenderAddress] = useState('J937-827, Kudirat Abiola Way, Ikeja, Lagos');
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
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSmartFilters, setShowSmartFilters] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState<{
    text: string;
    intent?: string;
    filledFields?: string[];
  } | null>(null);

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

  // Fee calculation: base fee + live admin-configured platform fee
  const feePercent = systemConfig?.dispatchCommissionPercent ?? 5;
  const feeRate = feePercent / 100;
  const baseDeliveryFee = vehicleType === 'bike' ? 2400 : 6500;
  const platformFee = Math.round(baseDeliveryFee * feeRate);
  const totalDeliveryCost = baseDeliveryFee + platformFee;

  const autoSelectProvider = (): DispatchProvider => {
    return packageWeight >= 5 || vehicleType === 'van' ? 'pickkr' : 'gokada';
  };

  const handleDispatchAiSubmit = async (overridePrompt?: string) => {
    const query = (overridePrompt ?? aiPromptInput).trim();
    if (!query) {
      setAiReply({
        text: 'Ask anything about Dispatch rates & tracking, or describe a delivery — e.g. "Send iPhone to Amara 08012345678 at 14 Admiralty Way Lekki".',
        intent: 'hint',
      });
      return;
    }

    setAiLoading(true);
    setFormError(null);
    try {
      const resp = await fetch('/api/dispatch/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          currentPickup: senderAddress,
          feePercent,
          recentOrders: dispatchOrders.slice(0, 5),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        setAiReply({
          text: data?.error || 'Dispatch AI is temporarily unavailable. You can still fill the booking form below.',
        });
        return;
      }

      const booking = data.booking || {};
      const filled: string[] = [];
      if (booking.vehicleType === 'bike' || booking.vehicleType === 'van') {
        setVehicleType(booking.vehicleType);
        filled.push(booking.vehicleType === 'van' ? 'Van' : 'Bike');
      }
      if (booking.senderAddress && String(booking.senderAddress).trim()) {
        setSenderAddress(String(booking.senderAddress).trim());
        filled.push('Pickup');
      }
      if (booking.recipientAddress && String(booking.recipientAddress).trim()) {
        setRecipientAddress(String(booking.recipientAddress).trim());
        filled.push('Dropoff');
      }
      if (booking.recipientName && String(booking.recipientName).trim()) {
        setRecipientName(String(booking.recipientName).trim());
        filled.push('Recipient');
      }
      if (booking.recipientPhone && String(booking.recipientPhone).trim()) {
        setRecipientPhone(String(booking.recipientPhone).trim());
        filled.push('Phone');
      }
      if (booking.packageDescription && String(booking.packageDescription).trim()) {
        setPackageDesc(String(booking.packageDescription).trim());
        filled.push('Item');
      }
      if (typeof booking.packageWeight === 'number' && booking.packageWeight > 0) {
        setPackageWeight(booking.packageWeight);
      }

      if (data.intent === 'track') {
        const matched = data.trackingCode
          ? dispatchOrders.find((o) => o.trackingCode.toUpperCase() === String(data.trackingCode).toUpperCase())
          : dispatchOrders[0];
        if (matched) setActiveTrackingOrder(matched);
        setActiveTab('history');
      } else if (data.intent === 'fill_booking' || filled.length > 0) {
        setActiveTab('book');
      }

      setAiReply({
        text: String(data.reply || 'Done!'),
        intent: data.intent,
        filledFields: filled,
      });
      if (!overridePrompt) {
        setAiPromptInput('');
      }
    } catch {
      setAiReply({
        text: 'Could not reach Dispatch AI right now. Check your connection and try again.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleBookDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim()) {
      setFormError('Please fill out all recipient delivery details.');
      return;
    }
    if (!packageDesc.trim()) {
      setFormError('Please describe the item(s) you are sending.');
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

  const filteredOrders = dispatchOrders.filter((ord) => {
    const matchesSearch =
      ord.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.recipientAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.packageDescription.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return ord.status !== 'delivered';
    if (statusFilter === 'delivered') return ord.status === 'delivered';
    return true;
  });

  const activeCount = dispatchOrders.filter((o) => o.status !== 'delivered').length;
  const firstName = (currentUser.fullName || 'Mitch').split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in p-0 sm:p-4">
      {/* Full-bleed Container */}
      <div className="w-full max-w-md h-full sm:h-[92vh] sm:rounded-3xl bg-[#090814] text-white flex flex-col shadow-2xl border border-white/10 overflow-hidden relative font-sans">
        
        {/* ATMOSPHERIC NIGHT SKY HERO BACKGROUND */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&auto=format&fit=crop&q=80"
            alt="Lagos Night Skyline"
            className="w-full h-[52%] object-cover object-top opacity-35 filter brightness-75 contrast-125"
          />
          {/* Night gradient & stars overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#0a0818]/80 to-[#090814]" />
          {/* Subtle moon & lighting glow */}
          <div className="absolute top-6 left-1/3 w-32 h-32 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-20 right-10 w-44 h-44 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* ── TOP UTILITY NAVIGATION BAR ── */}
        <div className="relative z-10 pt-safe px-4 pt-3 pb-2 flex items-center justify-between gap-2 shrink-0">
          {/* Left: Menu / Close */}
          <button
            type="button"
            onClick={() => setIsDispatchModalOpen(false)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white/15 transition-colors shadow-sm"
            title="Close Dispatch"
          >
            <Menu className="w-5 h-5 text-white/90" />
          </button>

          {/* Center: Location Pill Dropdown */}
          <div className="flex-1 max-w-[240px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs text-white/90 shadow-sm cursor-pointer hover:border-purple-400/50 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate text-[11px] font-medium">{senderAddress}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/60 shrink-0" />
          </div>

          {/* Right: Notifications & Close */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white/15 transition-colors relative shadow-sm"
              title="Delivery Notifications"
            >
              <Bell className="w-4.5 h-4.5 text-white/90" />
              {activeCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(false)}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/70 hover:text-white flex items-center justify-center hover:bg-white/15 transition-colors shadow-sm"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── USER GREETING & WEATHER SECTION ── */}
        <div className="relative z-10 px-5 pt-3 pb-4 shrink-0 space-y-2.5">
          <div className="flex items-center gap-3">
            {/* Glowing Scalloped Avatar Ring */}
            <div className="relative">
              <div className="w-13 h-13 rounded-full p-[3px] bg-gradient-to-tr from-lime-400 via-emerald-400 to-teal-400 shadow-[0_0_16px_rgba(132,204,22,0.4)] flex items-center justify-center animate-in zoom-in-50">
                <div className="w-full h-full rounded-full bg-[#120f29] border-2 border-[#090814] flex items-center justify-center overflow-hidden">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-lime-300 font-mono">
                      {(currentUser.fullName || 'HI').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Greeting Headline */}
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5 font-display">
                <span>Hi {firstName}!</span>
                <span className="text-xl">👋</span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/70 font-medium">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white/90">
                  <CloudSun className="w-3 h-3 text-amber-300" />
                  <span>31°C · Partly cloudy</span>
                </span>
              </div>
            </div>
          </div>

          {/* FLOATING AI PROMPT BAR ("Ask Dispatch AI") */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 dark:bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-slate-800 dark:text-white">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                AI
              </div>
              <input
                type="text"
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleDispatchAiSubmit();
                  }
                }}
                placeholder="Ask Dispatch AI or describe parcel to book..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/60 focus:outline-none"
              />
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => void handleDispatchAiSubmit()}
                className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 flex items-center justify-center text-white transition-colors shrink-0 shadow-sm"
                title="Ask Dispatch AI"
              >
                {aiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Quick AI Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {[
                { label: 'Bike vs Van rates', prompt: 'What are Bike vs Van dispatch rates?' },
                { label: 'Track my order', prompt: 'Track my latest delivery order' },
                { label: 'Auto-fill sample', prompt: 'Send iPhone to Amara 08012345678 at 14 Admiralty Way Lekki' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={aiLoading}
                  onClick={() => void handleDispatchAiSubmit(chip.prompt)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-medium text-white/90 whitespace-nowrap shrink-0 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── DRAGGABLE BOTTOM SHEET / MAIN WORKSPACE ── */}
        <div className="relative z-10 flex-1 bg-white dark:bg-[#121024] text-slate-900 dark:text-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border-t border-slate-200 dark:border-white/10">
          {/* Drag Handle Bar */}
          <div className="pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-5 pt-1 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('book')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'book'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Book Dispatch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>My Deliveries</span>
                {activeCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-mono">
                    {activeCount}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSmartFilters((prev) => !prev);
                setActiveTab('history');
              }}
              className={`text-xs flex items-center gap-1 transition-colors ${
                showSmartFilters ? 'text-purple-600 font-bold' : 'text-slate-500 dark:text-neutral-400 hover:text-purple-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Smart Filters</span>
            </button>
          </div>

          {/* Inline Dispatch AI Assistant Reply Card */}
          {aiReply && (
            <div className="mx-5 mt-3 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs space-y-2 animate-in slide-in-from-top-2 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-slate-800 dark:text-slate-100 leading-relaxed">
                    {aiReply.text}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiReply(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 shrink-0"
                  aria-label="Dismiss AI reply"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 pl-8">
                <div className="flex flex-wrap gap-1">
                  {(aiReply.filledFields || []).map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold"
                    >
                      Filled: {f}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDispatchModalOpen(false);
                    startAiChat();
                  }}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-300 hover:underline shrink-0"
                >
                  Open AgcBot Chat →
                </button>
              </div>
            </div>
          )}

          {formError && (
            <div className="mx-5 mt-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Success Banner */}
          {orderCreatedSuccess && (
            <div className="mx-5 my-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in slide-in-from-top-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Order placed! Connecting nearest Gokada / Pickkr dispatch rider...</span>
            </div>
          )}

          {/* ── TAB 1: BOOK DISPATCH ── */}
          {activeTab === 'book' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Featured Carousel Card ("Send a package") */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/40 dark:from-white/5 dark:to-purple-950/20 border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 max-w-[210px]">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Send a package
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
                      Have a rider deliver your packages, food, or electronics across town.
                    </p>
                  </div>
                  {/* 3D Package Illustration */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform">
                    <Package className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                </div>

                {/* Pagination Dots Indicator */}
                <div className="flex items-center gap-1 mt-3">
                  <span className="w-4 h-1.5 rounded-full bg-orange-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
                </div>
              </div>

              {/* Vehicle Selection Cards */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block">
                  Select Vehicle Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVehicleType('bike')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      vehicleType === 'bike'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-1 ring-purple-600 text-purple-950 dark:text-white'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50 text-slate-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold">Motorbike Express</div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">Up to 10kg · Fast</div>
                    <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
                      ₦2,400 base
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('van')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      vehicleType === 'van'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-1 ring-purple-600 text-purple-950 dark:text-white'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50 text-slate-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold">Delivery Van</div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">Bulk & Heavy · 500kg</div>
                    <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
                      ₦6,500 base
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery Details Form */}
              <form onSubmit={handleBookDispatch} className="space-y-3 pt-1">
                {/* Pickup Address */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Pickup Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      placeholder="Sender Pickup Address"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                </div>

                {/* Dropoff Address */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Destination Dropoff
                  </label>
                  <div className="relative">
                    <Navigation className="w-4 h-4 text-purple-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Amara Obi"
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                      Recipient Phone
                    </label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="08012345678"
                      className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Package Description & Weight */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block mb-1">
                    Package Description &amp; Contents
                  </label>
                  <input
                    type="text"
                    value={packageDesc}
                    onChange={(e) => setPackageDesc(e.target.value)}
                    placeholder="e.g. Box of clothes, iPhone, food tray"
                    className="w-full p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                    required
                  />
                </div>

                {/* Live Estimated Fee Breakdown */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                    <span>Base Delivery Fare ({vehicleType === 'bike' ? 'Motorbike' : 'Van'})</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-white">
                      ₦{baseDeliveryFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                    <span>Platform Commission ({feePercent}%)</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-white">
                      ₦{platformFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 dark:border-neutral-800 flex justify-between font-bold text-sm">
                    <span>Total Estimated Fare</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">
                      ₦{totalDeliveryCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Glowing Book Button */}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Matching Nearest Dispatch Rider...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white text-white" />
                      <span>Confirm &amp; Book Rider (₦{totalDeliveryCost.toLocaleString()})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── TAB 2: MY DELIVERIES & LIVE TRACKING ── */}
          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {showSmartFilters && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by code, recipient, address, item..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-neutral-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['all', 'active', 'delivered'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                          statusFilter === st
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Tracking Hero Card */}
              {activeTrackingOrder && (
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span>Live Order Tracking</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyTrackingCode(activeTrackingOrder.trackingCode)}
                      className="text-[11px] font-mono text-purple-600 hover:text-purple-700 flex items-center gap-1 font-bold"
                    >
                      {copiedCode === activeTrackingOrder.trackingCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{activeTrackingOrder.trackingCode}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Tracking Status Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize text-slate-800 dark:text-white">
                        Status: {activeTrackingOrder.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {activeTrackingOrder.estimatedMinutes ? `${activeTrackingOrder.estimatedMinutes} mins away` : 'In transit'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-500"
                        style={{
                          width:
                            activeTrackingOrder.status === 'delivered'
                              ? '100%'
                              : activeTrackingOrder.status === 'in_transit'
                              ? '75%'
                              : activeTrackingOrder.status === 'picked_up'
                              ? '50%'
                              : '25%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Rider Info Pill */}
                  {activeTrackingOrder.riderName && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                          {activeTrackingOrder.riderName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {activeTrackingOrder.riderName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {activeTrackingOrder.riderPlate || 'Plate: LAG-492-XY'}
                          </div>
                        </div>
                      </div>
                      {activeTrackingOrder.riderPhone && (
                        <a
                          href={`tel:${activeTrackingOrder.riderPhone}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Past Deliveries List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-neutral-300">
                  <span>Recent Deliveries ({filteredOrders.length})</span>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No dispatch delivery orders recorded yet.
                  </div>
                ) : (
                  filteredOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => setActiveTrackingOrder(ord)}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 hover:border-purple-500/50 cursor-pointer transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            {ord.vehicleType === 'van' ? <Truck className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {ord.packageDescription}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              To: {ord.recipientName} ({ord.recipientPhone})
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-mono">
                        <span>Total: ₦{(ord.totalFee ?? ord.estimatedFee ?? 0).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder(ord);
                          }}
                          className="text-purple-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
