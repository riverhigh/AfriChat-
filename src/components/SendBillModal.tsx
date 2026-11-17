import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Receipt,
  Search,
  Send,
  UserCheck,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Store,
  Wrench,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Sparkles,
  Coins,
  GraduationCap,
  BookOpen,
  HeartPulse,
  Scale,
  PawPrint,
  Briefcase,
  Layers,
  Tag,
} from 'lucide-react';
import { useApp, phonesMatch } from '../context/AppContext';
import { AgcBillCategory, FeatureFlags } from '../types';
import { isSyntheticTestUser } from '../utils/testAccountFilter';

interface AgcFeatureBillConfig {
  category: AgcBillCategory;
  featureKey: keyof FeatureFlags;
  shortLabel: string;
  desc: string;
  titlePlaceholder: string;
  notePlaceholder: string;
  icon: React.ElementType;
  presets: { title: string; amount: number; refId?: string }[];
}

const AGC_FEATURE_CONFIGS: AgcFeatureBillConfig[] = [
  {
    category: 'Store & Market',
    featureKey: 'market',
    shortLabel: 'Store & Market',
    desc: 'Verified Store or Marketplace item purchase',
    titlePlaceholder: 'e.g. Store Checkout — Lace Fabric / Sneakers',
    notePlaceholder: 'Store name, product SKU, or item details...',
    icon: Store,
    presets: [
      { title: 'AGC Store Order Checkout', amount: 15000 },
      { title: 'Verified Store Item Purchase', amount: 8500 },
    ],
  },
  {
    category: 'Artisan Hub',
    featureKey: 'artisan',
    shortLabel: 'Artisan Hub',
    desc: 'Skill booking, repair deposit & station service',
    titlePlaceholder: 'e.g. Artisan Hub — Generator / AC Repair Booking',
    notePlaceholder: 'Artisan name, booking slot, or service ID...',
    icon: Wrench,
    presets: [
      { title: 'Artisan Hub Service Booking', amount: 5000 },
      { title: 'Artisan Station Repair & Materials', amount: 12000 },
    ],
  },
  {
    category: 'Errands',
    featureKey: 'errands',
    shortLabel: 'Errands',
    desc: 'Market run, grocery pickup & errand runner fee',
    titlePlaceholder: 'e.g. Balogun Market Errand Run & Delivery',
    notePlaceholder: 'Errand list, runner name, or drop-off note...',
    icon: ShoppingBag,
    presets: [
      { title: 'AGC Market Errand & Runner Fee', amount: 7500 },
      { title: 'Express Grocery Pickup Errand', amount: 4500 },
    ],
  },
  {
    category: 'Escrow Order',
    featureKey: 'escrow',
    shortLabel: 'Escrow',
    desc: 'Buyer-protected Balogun Escrow vault deal',
    titlePlaceholder: 'e.g. Escrow Deal — Smartphone / Electronics',
    notePlaceholder: 'Escrow Order ID, seller name, or milestone...',
    icon: ShieldCheck,
    presets: [
      { title: 'Balogun Escrow Protected Order', amount: 25000 },
      { title: 'Escrow Milestone Deposit', amount: 10000 },
    ],
  },
  {
    category: 'Dispatch',
    featureKey: 'dispatch',
    shortLabel: 'Dispatch',
    desc: 'PickkR / Gokada courier parcel delivery',
    titlePlaceholder: 'e.g. PickkR / Gokada Dispatch Rider Fee',
    notePlaceholder: 'Tracking code, pickup or drop-off address...',
    icon: Truck,
    presets: [
      { title: 'PickkR / Gokada Bike Dispatch', amount: 2500 },
      { title: 'Van Courier Dispatch Delivery', amount: 6500 },
    ],
  },
  {
    category: 'Store Tier',
    featureKey: 'storeTiers',
    shortLabel: 'Store Tiers',
    desc: 'Merchant store monthly tier subscription',
    titlePlaceholder: 'e.g. Pro Store Tier Subscription (100 Items)',
    notePlaceholder: 'Store name or monthly renewal period...',
    icon: Layers,
    presets: [
      { title: 'Starter Store Tier (30 Items / Mo)', amount: 3000, refId: 'TIER-STARTER-30' },
      { title: 'Pro Store Tier (100 Items / Mo)', amount: 7000, refId: 'TIER-PRO-100' },
    ],
  },
  {
    category: 'Ajo / Esusu',
    featureKey: 'ajo',
    shortLabel: 'Ajo / Esusu',
    desc: 'Rotating thrift circle round contribution',
    titlePlaceholder: 'e.g. Ajo / Esusu Round Contribution',
    notePlaceholder: 'Ajo group name & cycle round number...',
    icon: Coins,
    presets: [
      { title: 'Ajo / Esusu Monthly Contribution', amount: 10000 },
      { title: 'Weekly Ajo Thrift Deposit', amount: 5000 },
    ],
  },
  {
    category: 'Creator Hub',
    featureKey: 'creator',
    shortLabel: 'Creator Hub',
    desc: 'VIP call, show ticket, music or digital drop',
    titlePlaceholder: 'e.g. Creator Hub VIP Session / Show Ticket',
    notePlaceholder: 'Creator handle, show name, or drop title...',
    icon: Sparkles,
    presets: [
      { title: 'Creator VIP Call / Video Booking', amount: 5000 },
      { title: 'Creator Show Ticket / Digital Drop', amount: 3000 },
    ],
  },
  {
    category: 'Tutors & Courses',
    featureKey: 'tutor',
    shortLabel: 'Tutors',
    desc: 'Skill Academy course enrollment or tutor badge',
    titlePlaceholder: 'e.g. AGC Tutor Course Enrollment',
    notePlaceholder: 'Course title or tutor name...',
    icon: GraduationCap,
    presets: [
      { title: 'Skill Academy Course Enrollment', amount: 5000 },
      { title: 'Tutor Blue-Check Verification Fee', amount: 5000 },
    ],
  },
  {
    category: 'Writers Guild',
    featureKey: 'writers',
    shortLabel: 'Writers Guild',
    desc: 'AfriBooks paid book unlock or author tip',
    titlePlaceholder: 'e.g. AfriBooks Paid Book Purchase',
    notePlaceholder: 'Book title or author name...',
    icon: BookOpen,
    presets: [
      { title: 'AfriBooks Full Book Unlock', amount: 2500 },
      { title: 'Writers Guild Author Support Tip', amount: 1500 },
    ],
  },
  {
    category: 'AfriHealth',
    featureKey: 'healthcare',
    shortLabel: 'AfriHealth',
    desc: 'Telehealth doctor consult or clinic queue',
    titlePlaceholder: 'e.g. AfriHealth Telehealth Doctor Consultation',
    notePlaceholder: 'Hospital/clinic name or appointment ref...',
    icon: HeartPulse,
    presets: [
      { title: 'AfriHealth Telehealth Consult', amount: 5000 },
    ],
  },
  {
    category: 'AfriLaw',
    featureKey: 'legal',
    shortLabel: 'AfriLaw',
    desc: 'Smart contract drafting or legal consult',
    titlePlaceholder: 'e.g. AfriLaw Contract & Legal Consultation',
    notePlaceholder: 'Contract ref or lawyer name...',
    icon: Scale,
    presets: [
      { title: 'AfriLaw Smart Contract Review', amount: 10000 },
    ],
  },
  {
    category: 'Pet Shop',
    featureKey: 'petShop',
    shortLabel: 'Pet Shop',
    desc: 'AGC Pet Shop supplies or vet consultation',
    titlePlaceholder: 'e.g. AGC Pet Shop Order / Vet Consult',
    notePlaceholder: 'Pet listing or supply order details...',
    icon: PawPrint,
    presets: [
      { title: 'AGC Pet Shop Supplies Order', amount: 6000 },
    ],
  },
  {
    category: 'Job Board',
    featureKey: 'jobs',
    shortLabel: 'Job Board',
    desc: 'Featured job post or gig milestone fee',
    titlePlaceholder: 'e.g. AGC Job Board Featured Post Fee',
    notePlaceholder: 'Job title or gig reference...',
    icon: Briefcase,
    presets: [
      { title: 'Featured Job Board Listing', amount: 5000 },
    ],
  },
];

const QUICK_AMOUNTS = [2500, 5000, 10000, 25000];

export const SendBillModal: React.FC = () => {
  const {
    isSendBillModalOpen,
    setIsSendBillModalOpen,
    activeChatId,
    chats,
    deviceContacts,
    adminUsers,
    currentUser,
    currency,
    sendBillRequest,
    isFeatureEnabled,
    escrowOrders,
    errandOrders,
    serviceBookings,
    dispatchOrders,
    courses,
    afriBooks,
    myStoreProducts,
  } = useApp();

  const availableFeatures = useMemo(
    () => AGC_FEATURE_CONFIGS.filter((cfg) => isFeatureEnabled(cfg.featureKey)),
    [isFeatureEnabled]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<{
    name: string;
    phone: string;
    avatar?: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AgcBillCategory>('Store & Market');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [featureRefId, setFeatureRefId] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sym =
    currency === 'KES' ? 'KSh' : currency === 'GHS' ? 'GH₵' : currency === 'ZAR' ? 'R' : '₦';

  // Ensure selectedCategory stays valid within enabled AGC features
  useEffect(() => {
    if (availableFeatures.length > 0 && !availableFeatures.some((f) => f.category === selectedCategory)) {
      setSelectedCategory(availableFeatures[0].category);
    }
  }, [availableFeatures, selectedCategory]);

  const activeConfig = useMemo(
    () =>
      availableFeatures.find((f) => f.category === selectedCategory) ||
      availableFeatures[0] ||
      AGC_FEATURE_CONFIGS[0],
    [availableFeatures, selectedCategory]
  );

  // Pull live user items/orders for the selected AGC feature + built-in presets
  const quickPickItems = useMemo(() => {
    const items: { label: string; title: string; amount: number; refId?: string; isLive?: boolean }[] = [];

    if (selectedCategory === 'Escrow Order') {
      (escrowOrders || [])
        .filter((o) => o.status !== 'funds_released')
        .slice(0, 3)
        .forEach((o) => {
          items.push({
            label: `Live: ${o.product?.title || 'Escrow Order'}`,
            title: `Escrow Order: ${o.product?.title || o.id}`,
            amount: Math.round(o.totalAmount || 0),
            refId: o.id,
            isLive: true,
          });
        });
    } else if (selectedCategory === 'Errands') {
      (errandOrders || [])
        .filter((o) => o.status !== 'completed')
        .slice(0, 3)
        .forEach((o) => {
          items.push({
            label: `Live Errand (${o.runnerName})`,
            title: `Errand Order via ${o.runnerName}`,
            amount: Math.round(o.totalAmount || 0),
            refId: o.id,
            isLive: true,
          });
        });
    } else if (selectedCategory === 'Artisan Hub') {
      (serviceBookings || [])
        .filter((b) => !b.isPaid && b.status !== 'cancelled')
        .slice(0, 3)
        .forEach((b) => {
          items.push({
            label: `Booking: ${b.serviceTitle}`,
            title: `Artisan Booking: ${b.serviceTitle} (${b.providerName})`,
            amount: Math.round(b.totalPrice || 0),
            refId: b.id,
            isLive: true,
          });
        });
    } else if (selectedCategory === 'Dispatch') {
      (dispatchOrders || [])
        .filter((d) => d.status !== 'delivered')
        .slice(0, 3)
        .forEach((d) => {
          items.push({
            label: `Dispatch #${d.trackingCode}`,
            title: `${d.provider} Dispatch: ${d.packageDescription}`,
            amount: Math.round(d.totalFee || d.estimatedFee || 0),
            refId: d.trackingCode,
            isLive: true,
          });
        });
    } else if (selectedCategory === 'Store & Market') {
      (myStoreProducts || []).slice(0, 2).forEach((p) => {
        items.push({
          label: `Item: ${p.title}`,
          title: `AGC Store: ${p.title}`,
          amount: Math.round(p.price || 0),
          refId: p.id,
          isLive: true,
        });
      });
    } else if (selectedCategory === 'Tutors & Courses') {
      (courses || [])
        .filter((c) => !c.isEnrolledByMe && c.price > 0)
        .slice(0, 2)
        .forEach((c) => {
          items.push({
            label: `Course: ${c.title}`,
            title: `Course Enrollment: ${c.title}`,
            amount: Math.round(c.price || 0),
            refId: c.id,
            isLive: true,
          });
        });
    } else if (selectedCategory === 'Writers Guild') {
      (afriBooks || [])
        .filter((b) => !b.isPurchasedByMe && b.price > 0)
        .slice(0, 2)
        .forEach((b) => {
          items.push({
            label: `Book: ${b.title}`,
            title: `AfriBooks: ${b.title}`,
            amount: Math.round(b.price || 0),
            refId: b.id,
            isLive: true,
          });
        });
    }

    activeConfig.presets.forEach((p) => {
      items.push({
        label: p.title,
        title: p.title,
        amount: p.amount,
        refId: p.refId,
      });
    });

    return items;
  }, [
    selectedCategory,
    activeConfig,
    escrowOrders,
    errandOrders,
    serviceBookings,
    dispatchOrders,
    myStoreProducts,
    courses,
    afriBooks,
  ]);

  // Auto-select active DM recipient when opened from an active 1-on-1 chat
  useEffect(() => {
    if (!isSendBillModalOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      return;
    }
    if (activeChatId) {
      const activeChat = chats.find((c) => c.id === activeChatId);
      const chatPhone = activeChat?.phoneNumber || activeChat?.phone || '';
      if (
        activeChat &&
        !activeChat.isGroup &&
        !activeChat.isChannel &&
        !activeChat.isBot &&
        chatPhone &&
        !phonesMatch(chatPhone, currentUser.phoneNumber)
      ) {
        setSelectedRecipient({
          name: activeChat.name,
          phone: chatPhone,
          avatar: activeChat.avatar,
        });
        return;
      }
    }
    setSelectedRecipient(null);
  }, [isSendBillModalOpen, activeChatId, chats, currentUser.phoneNumber]);

  const recipientCandidates = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; avatar?: string; badge?: string }>();
    const push = (name?: string, phone?: string, avatar?: string, badge?: string) => {
      const clean = (phone || '').replace(/\D/g, '');
      if (!clean || clean.length < 7) return;
      if (phonesMatch(phone, currentUser.phoneNumber)) return;
      if (isSyntheticTestUser({ name, phone })) return;
      const key = clean.slice(-9);
      if (!map.has(key)) {
        map.set(key, {
          name: name || phone || 'AGC User',
          phone: phone!,
          avatar,
          badge,
        });
      }
    };

    chats.forEach((c) => {
      if (!c.isGroup && !c.isChannel && !c.isBot) {
        push(c.name, c.phoneNumber || c.phone, c.avatar, 'Recent Chat');
      }
    });
    deviceContacts.forEach((c) => {
      if (c.isRegisteredOnAGC || c.isRegistered) {
        push(c.name, c.normalizedPhoneNumber || c.rawPhoneNumber, c.avatar, 'AGC Contact');
      }
    });
    (adminUsers || []).forEach((u) => {
      push(u.fullName || u.username, u.phoneNumber, u.avatarUrl, 'AGC Member');
    });

    const list = Array.from(map.values());
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list.slice(0, 18);
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q)
    );
  }, [chats, deviceContacts, adminUsers, currentUser.phoneNumber, searchQuery]);

  if (!isSendBillModalOpen) return null;

  const handleSelectFeature = (cat: AgcBillCategory) => {
    setSelectedCategory(cat);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedRecipient) {
      setErrorMsg('Select an AGC contact who should pay this AGC feature bill on your behalf.');
      return;
    }
    if (!activeConfig || !isFeatureEnabled(activeConfig.featureKey)) {
      setErrorMsg('Select an active AGC system feature for this bill.');
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg(`Enter a clear description for your ${activeConfig.shortLabel} bill.`);
      return;
    }
    const numericAmt = Number(amount);
    if (!Number.isFinite(numericAmt) || numericAmt < 50) {
      setErrorMsg(`Minimum bill amount is ${sym}50.`);
      return;
    }

    setIsSending(true);
    try {
      const res = await sendBillRequest({
        recipientPhone: selectedRecipient.phone,
        recipientName: selectedRecipient.name,
        recipientAvatar: selectedRecipient.avatar,
        title: cleanTitle,
        category: activeConfig.category,
        featureKey: activeConfig.featureKey,
        featureRefId: featureRefId.trim() || undefined,
        amount: Math.round(numericAmt),
        note: note.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Unable to send AGC bill request.');
      } else {
        setSuccessMsg(
          `${activeConfig.shortLabel} bill sent to ${selectedRecipient.name}! They can pay it directly in chat.`
        );
        setTitle('');
        setAmount('');
        setFeatureRefId('');
        setNote('');
        setTimeout(() => {
          setIsSendBillModalOpen(false);
          setSuccessMsg(null);
        }, 1200);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      onClick={() => setIsSendBillModalOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Send My Bill (AGC Features)</h3>
              <p className="text-[11px] text-purple-100">
                Strictly for AGC Store, Artisan, Errands, Escrow &amp; platform services
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSendBillModalOpen(false)}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="Close Send My Bill"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Recipient Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center justify-between">
              <span>Pay On Behalf Of (AGC Recipient)</span>
              {selectedRecipient && (
                <button
                  type="button"
                  onClick={() => setSelectedRecipient(null)}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Change
                </button>
              )}
            </label>

            {selectedRecipient ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedRecipient.avatar ? (
                    <img
                      src={selectedRecipient.avatar}
                      alt={selectedRecipient.name}
                      className="w-9 h-9 rounded-full object-cover border border-purple-300 dark:border-purple-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                      {selectedRecipient.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedRecipient.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 truncate">
                      {selectedRecipient.phone}
                    </div>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contact name or phone number..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {recipientCandidates.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 text-[11px] text-slate-500 dark:text-neutral-400 text-center">
                      No matching AGC users found yet. Sync contacts or start a chat first.
                    </div>
                  ) : (
                    recipientCandidates.map((cand) => (
                      <button
                        key={cand.phone}
                        type="button"
                        onClick={() => setSelectedRecipient(cand)}
                        className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-neutral-800 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {cand.avatar ? (
                            <img
                              src={cand.avatar}
                              alt={cand.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                              {cand.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {cand.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 truncate">
                              {cand.phone}
                            </div>
                          </div>
                        </div>
                        {cand.badge && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 shrink-0">
                            {cand.badge}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Strictly AGC System Feature Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                AGC System Feature (Required)
              </label>
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                AGC-Only
              </span>
            </div>

            {availableFeatures.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                No billable AGC features are currently enabled by admin.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {availableFeatures.map((cfg) => {
                  const IconComp = cfg.icon;
                  const isSelected = activeConfig.category === cfg.category;
                  return (
                    <button
                      key={cfg.category}
                      type="button"
                      onClick={() => handleSelectFeature(cfg.category)}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 truncate ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800 hover:border-purple-400'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cfg.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-slate-500 dark:text-neutral-400 px-0.5">
              {activeConfig.desc}
            </p>
          </div>

          {/* Quick-Pick Live AGC Orders / Presets */}
          {quickPickItems.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-purple-500" />
                <span>Quick-Fill from {activeConfig.shortLabel}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickPickItems.map((item, idx) => (
                  <button
                    key={`${item.title}_${idx}`}
                    type="button"
                    onClick={() => {
                      setTitle(item.title);
                      if (item.amount >= 50) setAmount(String(item.amount));
                      if (item.refId) setFeatureRefId(item.refId);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold border transition-colors text-left ${
                      item.isLive
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:border-purple-400'
                    }`}
                  >
                    {item.label}
                    {item.amount > 0 ? ` · ${sym}${item.amount.toLocaleString()}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bill Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block">
              AGC Bill Item / Description
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={activeConfig.titlePlaceholder}
              maxLength={90}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-neutral-300 block">
              Bill Amount ({sym})
            </label>
            <input
              type="number"
              min={50}
              step={50}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-900 hover:bg-purple-100 dark:hover:bg-purple-950/40 text-[11px] font-mono font-semibold text-slate-700 dark:text-neutral-300 transition-colors"
                >
                  {sym}
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Optional AGC Order / Booking Reference + Note */}
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 block">
                AGC Order / Booking Ref ID (optional)
              </label>
              <input
                type="text"
                value={featureRefId}
                onChange={(e) => setFeatureRefId(e.target.value)}
                placeholder="e.g. ESC-1042, ERR-208, PK-9012"
                maxLength={40}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 block">
                Note for Recipient (optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={activeConfig.notePlaceholder}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start gap-2.5 text-[11px] text-emerald-900 dark:text-emerald-200">
            <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Strictly for AGC system features (Store, Artisan, Errands, Escrow, Dispatch, etc.). Your recipient gets an interactive bill card in chat to pay via AGC Wallet or Paystack.
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSending || availableFeatures.length === 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Sending AGC Bill...' : `Send ${activeConfig.shortLabel} Bill`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
