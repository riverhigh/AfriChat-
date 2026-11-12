import React, { useState } from 'react';
import {
  User,
  Globe,
  Coins,
  Database,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Moon,
  Sun,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  EyeOff,
  Eye,
  Store,
  Phone,
  CheckCircle2,
  Smartphone,
  Clock,
  Repeat,
  Type,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Check,
  Sliders,
  Sparkles,
  Share2,
  Wrench,
  Crown,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CurrencyCode, LanguageCode, AppFontSize } from '../types';
import { MarketplaceView } from './MarketplaceView';
import { LegalComplianceModal } from './LegalComplianceModal';
import { PwaInstallCard } from './PwaInstallCard';

interface SettingsViewProps {
  onOpenLanguageModal: () => void;
  onOpenDisplayModal?: () => void;
}

const PRESET_WALLPAPERS = [
  {
    id: 'ankara',
    title: 'Ankara Heritage',
    url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'lagos_night',
    title: 'Lagos Neon Skyline',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'kente',
    title: 'Kente Weave Texture',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'charcoal',
    title: 'Charcoal Minimalist',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenLanguageModal,
}) => {
  const {
    language,
    currency,
    setCurrency,
    lowDataMode,
    toggleLowDataMode,
    isDarkMode,
    toggleDarkMode,
    escrowOrders,
    setActiveEscrowModalOrder,
    formatPrice,
    wallet,
    setIsWalletModalOpen,
    currentUser,
    setIsAuthModalOpen,
    hideBalanceOnNav,
    toggleHideBalance,
    setIsTransferModalOpen,
    setIsPayrollModalOpen,
    setIsScanQrModalOpen,
    fontSize,
    setFontSize,
    chatWallpaper,
    setChatWallpaper,
    setIsReferralModalOpen,
    setIsServicesModalOpen,
    setIsCelebrityModalOpen,
    setIsStoreRegModalOpen,
    setIsWritersModalOpen,
    setIsAdminModalOpen,
    serviceProviders,
    artisanStation,
    storeSubscription,
    referralProgram,
    CURRENCY_SYMBOLS,
    CURRENCY_RATES,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'services' | 'stores' | 'artisan'>('services');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB. Please choose a smaller photo.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setChatWallpaper(result);
    };
    reader.readAsDataURL(file);
  };

  const fontOptions: { id: AppFontSize; label: string; desc: string; sizePx: string }[] = [
    { id: 'small', label: 'Small', desc: '14px compact', sizePx: '14px' },
    { id: 'normal', label: 'Normal', desc: '16px default', sizePx: '16px' },
    { id: 'large', label: 'Large', desc: '18px comfortable', sizePx: '18px' },
    { id: 'huge', label: 'Huge', desc: '20px high visibility', sizePx: '20px' },
  ];

  const getLanguageName = (code: LanguageCode) => {
    switch (code) {
      case 'pcm':
        return 'Nigerian Pidgin';
      case 'sw':
        return 'Kiswahili';
      case 'yo':
        return 'Èdè Yorùbá';
      case 'ha':
        return 'Harshen Hausa';
      case 'fr':
        return 'Français';
      default:
        return 'English';
    }
  };

  return (
    <div className="flex flex-col pb-24 text-slate-800 dark:text-white bg-white dark:bg-black min-h-[calc(100vh-130px)]">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                Hub
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-600/10 text-purple-600 dark:text-purple-400">
                Personal & Stores
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Wallet, African Stores, Appearance & Identity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScanQrModalOpen(true)}
              className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="View Unique QR Code"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[11px] font-mono">My QR</span>
            </button>

            <button
              onClick={toggleHideBalance}
              className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={hideBalanceOnNav ? 'Show Balance' : 'Hide Balance'}
            >
              {hideBalanceOnNav ? (
                <>
                  <EyeOff className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-mono">Hidden</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] font-mono">Visible</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Segmented Navigation Switcher: Profile vs Stores */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'services'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Wallet</span>
          </button>

          <button
            onClick={() => setActiveSubTab('stores')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'stores'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Stores & Market</span>
          </button>

          <button
            onClick={() => setActiveSubTab('artisan')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeSubTab === 'artisan'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Artisan Market</span>
          </button>
        </div>
      </div>

      {/* Render Stores Tab Content when selected */}
      {activeSubTab === 'stores' ? (
        <MarketplaceView />
      ) : activeSubTab === 'artisan' ? (
        <div className="space-y-5 px-4 py-4">
          {/* Artisan Hub Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Artisan Hub</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Book skilled professionals near you</p>
            </div>
            <button
              onClick={() => setIsServicesModalOpen(true)}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full hover:bg-purple-500/20 transition-colors"
            >
              View All →
            </button>
          </div>

          {/* My Station Card */}
          {artisanStation ? (
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">My Station</span>
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full">
                  {artisanStation.isApproved ? '✓ Verified' : 'Pending Review'}
                </span>
              </div>
              <div className="font-black text-lg leading-tight">{artisanStation.stationName}</div>
              <div className="text-xs opacity-75 mt-0.5">{artisanStation.category} · {artisanStation.location}</div>
              <button
                onClick={() => setIsServicesModalOpen(true)}
                className="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors"
              >
                Manage Station
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#18152e] border border-dashed border-purple-300 dark:border-purple-800 rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-white">Register Your Station</div>
              <div className="text-xs text-slate-500 dark:text-neutral-400">List your skills & get booked by nearby clients · {CURRENCY_SYMBOLS[currency]}5k setup</div>
              <button
                onClick={() => setIsServicesModalOpen(true)}
                className="mt-1 px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors"
              >
                Set Up Station · {CURRENCY_SYMBOLS[currency]}{(5000 * (CURRENCY_RATES[currency] / CURRENCY_RATES['NGN'])).toLocaleString(undefined, {maximumFractionDigits: 0})}
              </button>
            </div>
          )}

          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['All', 'Mechanic', 'Barber', 'Plumber', 'Electrician', 'Tailor'].map((cat) => (
              <span
                key={cat}
                className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 cursor-pointer hover:bg-purple-500/20 transition-colors"
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Service Provider Cards */}
          <div className="space-y-3">
            {serviceProviders.length === 0 ? (
              <div className="bg-white dark:bg-[#18152e] border border-dashed border-purple-300 dark:border-purple-800 rounded-2xl p-6 text-center">
                <Wrench className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-800 dark:text-white">No Registered Artisans Yet</div>
                <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                  Be the first to list your workshop or craft on AGC and get discovered by nearby customers.
                </div>
                <button
                  onClick={() => setIsServicesModalOpen(true)}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors inline-block"
                >
                  Register Your Skills
                </button>
              </div>
            ) : (
              serviceProviders.slice(0, 5).map((provider) => (
              <div
                key={provider.id}
                className="bg-white dark:bg-[#18152e] border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-3.5 flex gap-3 items-start shadow-xs"
              >
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border-2 border-purple-500/20"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{provider.name}</div>
                    {provider.isVerified && (
                      <span className="shrink-0 text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">✓</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">{provider.businessName}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] font-semibold text-amber-500">★ {provider.rating}</span>
                    <span className="text-[10px] text-slate-400">({provider.reviewCount})</span>
                    <span className="text-[10px] text-slate-400 truncate">· {provider.location}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                      {formatPrice(provider.hourlyRate, 'NGN')}<span className="font-normal text-slate-400">/hr</span>
                    </span>
                    <button
                      onClick={() => setIsServicesModalOpen(true)}
                      className="text-[11px] font-bold bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>

          <div className="p-4 text-center text-xs text-slate-400">
            AGC Artisan Hub · Connecting African Skill ⚒
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Profile Identity Row */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-[#18152e]">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center p-0.5 border-2 border-indigo-600">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                {currentUser.isPhoneVerified && (
                  <span
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#18152e]"
                    title="Phone Number OTP Verified"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {currentUser.fullName}
                  </h3>
                  {currentUser.isPhoneVerified && (
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-mono">
                      OTP Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  <Phone className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>{currentUser.phoneNumber}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                  &ldquo;{currentUser.about || 'Hey there! I am using AGC.'}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Switch Account or Phone Number"
              >
                <Smartphone className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsScanQrModalOpen(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                title="View AGC QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

                    {/* Super Admin Console Access Tile - Only for Admins */}
          {(currentUser?.role === 'admin' || currentUser?.isAdmin) && (
          <div className="px-4">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900 text-white shadow-lg border border-purple-500/40 text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-sm group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight">Super Admin Console</h3>
                    <span className="text-[9px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.2 rounded-full uppercase">
                      Root
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/80 mt-0.5">
                    User badging, escrow disputes, broadcasts & Supabase cloud health
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          )}

          {/* AGC Wallet Card with Privacy Masking */}
          <div className="px-4">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white space-y-3 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold">AGC Vault & Wallet</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleHideBalance}
                    className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                    title={hideBalanceOnNav ? 'Reveal balance' : 'Hide balance for privacy'}
                  >
                    {hideBalanceOnNav ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-full">
                    Paystack Escrow
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] text-indigo-200">Available Balance:</div>
                  <div className="text-2xl font-black font-mono tracking-tight">
                    {hideBalanceOnNav ? '₦ ••••••••' : formatPrice(wallet.availableBalance, 'NGN')}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-indigo-200">Escrow Locked:</div>
                  <div className="text-xs font-bold font-mono text-amber-300">
                    {hideBalanceOnNav ? '₦ ••••••' : formatPrice(wallet.escrowLockedBalance, 'NGN')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15">
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="py-2 bg-white text-purple-950 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Top-up (Paystack)</span>
                </button>

                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="py-2 bg-white/15 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Manage Vault</span>
                </button>

                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="py-2 bg-white/20 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Send (1-2 Days Delay)</span>
                </button>

                <button
                  onClick={() => setIsPayrollModalOpen(true)}
                  className="py-2 bg-white/20 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Repeat className="w-3.5 h-3.5 text-purple-200" />
                  <span>Payroll Auto-Debit</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Custom Chat Background Wallpaper & Device Upload (Preserved in Fyp) */}
          <div className="px-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Chat Background Wallpaper
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Upload from phone or pick cultural textures
                    </p>
                  </div>
                </div>

                {chatWallpaper && (
                  <button
                    type="button"
                    onClick={() => setChatWallpaper(null)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Reset to default background"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Reset</span>
                  </button>
                )}
              </div>

              {/* Upload Button */}
              <div>
                <label className="flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Upload Image from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {uploadError && (
                  <p className="text-xs text-rose-500 mt-1.5 font-medium">
                    {uploadError}
                  </p>
                )}
              </div>

              {/* Preset Background Swatches */}
              <div>
                <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">
                  African Cultural Wallpaper Presets:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_WALLPAPERS.map((preset) => {
                    const isSelected = chatWallpaper === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setChatWallpaper(preset.url)}
                        className={`relative rounded-xl overflow-hidden h-20 border-2 transition-all group text-left ${
                          isSelected
                            ? 'border-purple-600 ring-2 ring-purple-600/30 scale-[1.02]'
                            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-1.5">
                          <span className="text-[10px] font-bold text-white leading-tight truncate">
                            {preset.title}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallpaper Active Preview */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
                <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-neutral-800 overflow-hidden shrink-0 bg-slate-200 dark:bg-neutral-800">
                  {chatWallpaper ? (
                    <img
                      src={chatWallpaper}
                      alt="Active Wallpaper"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-mono text-center p-1 leading-tight">
                      Standard Theme
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {chatWallpaper ? 'Custom Wallpaper Active' : 'Default Charcoal Mesh'}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-neutral-400 truncate">
                    {chatWallpaper
                      ? 'Applied to active chats with full opacity compression'
                      : 'Clean contrast pattern for low battery & data saving'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Hub App Preferences (Language, Currency, Low Data, Theme) */}
          <div className="divide-y divide-slate-100 dark:divide-neutral-800/80 bg-white dark:bg-[#18152e] border-y border-slate-100 dark:border-neutral-800">
            {/* Invite & Earn ₦500 Referral */}
            <button
              onClick={() => setIsReferralModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors bg-emerald-50/50 dark:bg-emerald-950/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <span>Invite Friends & Earn ₦500</span>
                    <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-1.5 py-0.2 rounded-full">
                      Anti-Ghost
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Earn {CURRENCY_SYMBOLS[currency]}500/active friend. Unlocked: {formatPrice(referralProgram.availableBonus, 'NGN')}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Artisan Stations & Workshop Hub */}
            <button
              onClick={() => setIsServicesModalOpen(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-purple-500/10 dark:hover:bg-purple-900/20 text-left transition-all border border-transparent hover:border-purple-500/20 group rounded-2xl"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <Wrench className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Artisan Stations & Services</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-mono font-bold px-2 py-0.5 rounded-full border border-purple-400/30">
                      Verified Hub
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-purple-300/70 mt-0.5">
                    Station registration (₦5k), listings (₦500), calendar & apprentice staff
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Merchant Store Registration & Tiers (₦3k / ₦7k) */}
            <button
              onClick={() => setIsStoreRegModalOpen(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-blue-500/10 dark:hover:bg-blue-900/20 text-left transition-all border border-transparent hover:border-blue-500/20 group rounded-2xl"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <Store className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Store Subscription Tiers</span>
                    {storeSubscription?.isRegistered ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                        {storeSubscription.tier === 'starter_30' ? 'Starter · 30 Items' : 'Pro · 100 Items'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                        From ₦2,199/mo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-blue-300/70 mt-0.5">
                    ₦3k/mo for 30 items limit · ₦7k/mo for 100 items limit
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* African Writers Guild (AfriBooks) */}
            <button
              onClick={() => setIsWritersModalOpen(true)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-emerald-500/10 dark:hover:bg-emerald-900/20 text-left transition-all border border-transparent hover:border-emerald-500/20 group rounded-2xl"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform shrink-0">
                  <BookOpen className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>African Writers Guild (AfriBooks)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                      🌿 100% No-AI
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-emerald-300/70 mt-0.5">
                    Serial chapters, author tips, paid books & 2-friend buddy reading
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Phone Authentication & Change Number */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
            >
              <div className="flex items-center gap-4">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-medium">AGC Secure Phone OTP</div>
                  <div className="text-xs text-slate-500">
                    Logged in as {currentUser.phoneNumber} {currentUser.countryCode ? `(${currentUser.countryCode})` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                <span>Switch / Re-verify</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Language */}
            <button
              onClick={onOpenLanguageModal}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
            >
              <div className="flex items-center gap-4">
                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-medium">App Language</div>
                  <div className="text-xs text-slate-500">{getLanguageName(language)}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Currency */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-4">
                <Coins className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="text-sm font-medium">Market Currency</div>
                  <div className="text-xs text-slate-500">Local pricing format</div>
                </div>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs">
                {(['NGN', 'KES', 'GHS', 'ZAR'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      currency === c
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Low Data Mode */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-4">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-medium">Low Data Usage</div>
                  <div className="text-xs text-slate-500">
                    Compress media and disable auto-download
                  </div>
                </div>
              </div>
              <button
                onClick={toggleLowDataMode}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  lowDataMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    lowDataMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-4">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <div className="text-sm font-medium">Dark Mode</div>
                  <div className="text-xs text-slate-500">
                    {isDarkMode ? 'Nightfall dark active' : 'Light theme active'}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  isDarkMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isDarkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Text Size (Moved to bottom, minimalist & less flamboyant, preview removed) */}
            <div className="px-4 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Type className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-sm font-medium">Text Size</div>
                    <div className="text-xs text-slate-500">Scale app font across chats & messages</div>
                  </div>
                </div>
                <span className="text-xs font-mono font-medium text-slate-500 dark:text-neutral-400">
                  {fontOptions.find((o) => o.id === fontSize)?.label} ({fontOptions.find((o) => o.id === fontSize)?.sizePx})
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl">
                {fontOptions.map((opt) => {
                  const isSelected = fontSize === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFontSize(opt.id)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PWA App Download & Version Update Checker */}
          <div className="px-4">
            <PwaInstallCard />
          </div>

          {/* Escrow Orders History Section */}
          <div className="px-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Paystack Escrow Purchases
            </div>

            <div className="bg-white dark:bg-[#18152e] rounded-2xl border border-slate-200/80 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {escrowOrders.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No orders placed yet. Products bought from chat catalogs appear here with escrow release PINs.
                </div>
              ) : (
                escrowOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setActiveEscrowModalOrder(order)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {order.product.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.sellerName} · PIN:{' '}
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {order.escrowPin}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono">
                        {formatPrice(order.totalAmount, order.currency)}
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold ${
                          order.status === 'funds_released'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {order.status === 'funds_released' ? 'Completed' : 'In Escrow'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security & Escrow Protection Footer */}
          <div className="px-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/60 dark:border-neutral-800 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  AGC Escrow & Buyer Protection
                </div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Funds held securely in vault until 4-digit release PIN is verified upon delivery
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 text-center text-xs text-slate-400">
            AGC Super-App · Made for African Markets
          </div>
        </div>
      )}
      <LegalComplianceModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
};

