import {
  NOTIFICATION_SOUNDS,
  playNotificationSound,
  getNotificationSound,
  setNotificationSound,
  NotificationSound,
} from '../utils/soundUtils';
import React, { useState } from 'react';
import {
  User,
  Volume2,
  Globe,
  Coins,
  Database,
  QrCode,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
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
  Send,
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
  Camera,
  BadgeCheck,
  Edit3,
  AtSign,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CurrencyCode, LanguageCode, AppFontSize } from '../types';
import { MarketplaceView } from './MarketplaceView';
import { LegalComplianceModal } from './LegalComplianceModal';
import { AccountCenterModal } from './AccountCenterModal';
import { PwaInstallCard } from './PwaInstallCard';
import { compressAvatarImage, compressWallpaperImage } from '../utils/imageUtils';
import { supabase, isSupabaseConfigured } from '../services/supabase';

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
    updateUserProfile,
    updateUsername,
    isFeatureEnabled,
    getBadgeForPhone,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'services' | 'stores' | 'artisan' | 'chat_bg'>('services');
  const [selectedNotificationSound, setSelectedNotificationSound] = useState<NotificationSound>(() => {
    try { return getNotificationSound(); } catch (_) { return 'chime'; }
  });
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isAccountCenterOpen, setIsAccountCenterOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  // Hub Profile Username & Bio Editor state
  const currentHandle = (currentUser.username || currentUser.fullName || 'agc_user')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_.]/g, '') || 'agc_user';
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [usernameInput, setUsernameInput] = useState(currentHandle);
  const [aboutInput, setAboutInput] = useState(currentUser.about || 'Hey there! I am using AGC.');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'same'>('same');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveFeedback, setProfileSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const usernameDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openProfileEditor = () => {
    setUsernameInput(currentHandle);
    setAboutInput(currentUser.about || 'Hey there! I am using AGC.');
    setUsernameStatus('same');
    setProfileSaveFeedback(null);
    setIsEditingProfile(true);
  };

  const handleUsernameInputChange = (rawVal: string) => {
    const clean = rawVal.toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_.]/g, '');
    setUsernameInput(clean);
    setProfileSaveFeedback(null);

    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

    if (clean === currentHandle) {
      setUsernameStatus('same');
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(clean)}&excludePhone=${encodeURIComponent(currentUser.phoneNumber || '')}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.taken) {
            setUsernameStatus('taken');
            return;
          }
        }
      } catch (_) {}

      if (isSupabaseConfigured) {
        try {
          const { data: reg } = await supabase
            .from('agc_phone_registry')
            .select('username, full_phone')
            .or(`username.ilike.${clean},username.ilike.@${clean}`)
            .limit(2);
          if (Array.isArray(reg)) {
            const myDigits = (currentUser.phoneNumber || '').replace(/\D/g, '').slice(-9);
            const conflict = reg.find((r: any) => {
              const rDigits = String(r.full_phone || '').replace(/\D/g, '').slice(-9);
              return !myDigits || rDigits !== myDigits;
            });
            if (conflict) {
              setUsernameStatus('taken');
              return;
            }
          }
        } catch (_) {}
      }

      setUsernameStatus('available');
    }, 300);
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken' || usernameStatus === 'checking') return;
    setIsSavingProfile(true);
    setProfileSaveFeedback(null);
    const res = await updateUsername(usernameInput, aboutInput);
    setIsSavingProfile(false);
    if (res.success) {
      setProfileSaveFeedback({ type: 'success', text: `Username updated to @${res.username}` });
      setIsEditingProfile(false);
      setTimeout(() => setProfileSaveFeedback(null), 4000);
    } else {
      setProfileSaveFeedback({ type: 'error', text: res.error || 'Could not update username.' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setUploadError('Image size exceeds 12MB. Please choose a smaller photo.');
      return;
    }

    setUploadError(null);
    try {
      const compressed = await compressWallpaperImage(file);
      setChatWallpaper(compressed);
    } catch (_) {
      setUploadError('Could not process wallpaper image.');
    }
    e.target.value = '';
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

  /** Ultra-compress and persist user avatar from device image */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('Please select a valid image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setAvatarUploadError('Image must be under 12MB.');
      return;
    }
    setIsAvatarUploading(true);
    setAvatarUploadError(null);
    try {
      const compressed = await compressAvatarImage(file);
      updateUserProfile({ avatarUrl: compressed });
    } catch (_) {
      setAvatarUploadError('Failed to process image.');
    } finally {
      setIsAvatarUploading(false);
      e.target.value = '';
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

        {/* Segmented Navigation Switcher: Profile vs Stores vs Artisan - Disappear when toggled off */}
        <div className="flex p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeSubTab === 'services'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Profile</span>
          </button>

          {(isFeatureEnabled('storeTiers') || isFeatureEnabled('market')) && (
            <button
              onClick={() => setActiveSubTab('stores')}
              className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === 'stores'
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Stores</span>
            </button>
          )}

          {isFeatureEnabled('artisan') && (
            <button
              onClick={() => setActiveSubTab('artisan')}
              className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === 'artisan'
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Artisans</span>
            </button>
          )}
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
              View All â†’
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
                    <span className="text-[11px] font-semibold text-amber-500">â˜… {provider.rating}</span>
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
            AGC Artisan Hub · Connecting African Skill âš’
          </div>
        </div>
      ) : activeSubTab === 'chat_bg' ? (
        <div className="space-y-4 px-4 py-4 animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('services')}
                className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title="Back to Settings"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Chat Background & Wallpaper
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Pick African cultural textures or upload custom wallpaper
                </p>
              </div>
            </div>

            {chatWallpaper && (
              <button
                type="button"
                onClick={() => setChatWallpaper(null)}
                className="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 transition-colors border border-rose-500/20"
                title="Reset to default background"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Active Wallpaper Preview Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-[#120924] border border-slate-200/80 dark:border-purple-900/40 shadow-xs">
            <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-purple-900/50 overflow-hidden shrink-0 bg-slate-200 dark:bg-neutral-800 shadow-inner">
              {chatWallpaper ? (
                <img
                  src={chatWallpaper}
                  alt="Active Wallpaper"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 font-mono text-center p-1 leading-tight bg-[#120924]">
                  <span>Charcoal</span>
                  <span className="text-[9px] opacity-60">Mesh</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {chatWallpaper ? 'Custom Wallpaper Active' : 'Default Charcoal Mesh'}
              </div>
              <p className="text-xs text-slate-500 dark:text-purple-300/60 mt-0.5">
                {chatWallpaper
                  ? 'Applied to active chats with full opacity compression'
                  : 'Clean contrast pattern for low battery & data saving'}
              </p>
            </div>
          </div>

          {/* Upload Button */}
          <div className="bg-white dark:bg-[#120924] p-4 rounded-2xl border border-slate-200/80 dark:border-purple-900/40 space-y-2">
            <label className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-purple-600/20">
              <Upload className="w-4 h-4" />
              <span>Upload Custom Wallpaper from Device</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {uploadError && (
              <p className="text-xs text-rose-500 font-medium">
                {uploadError}
              </p>
            )}
            <p className="text-[11px] text-slate-400 text-center">
              Supports JPG, PNG, WEBP. Stored securely on your device.
            </p>
          </div>

          {/* Preset Background Swatches */}
          <div className="bg-white dark:bg-[#120924] p-4 rounded-2xl border border-slate-200/80 dark:border-purple-900/40 space-y-3">
            <div className="text-xs uppercase font-mono font-bold text-slate-400">
              African Cultural Presets
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_WALLPAPERS.map((preset) => {
                const isSelected = chatWallpaper === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setChatWallpaper(preset.url)}
                    className={`relative rounded-xl overflow-hidden h-28 border-2 transition-all group text-left ${
                      isSelected
                        ? 'border-purple-600 ring-2 ring-purple-600/40 scale-[1.02] shadow-md'
                        : 'border-slate-200 dark:border-purple-900/30 hover:border-purple-400'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-2.5">
                      <span className="text-xs font-bold text-white leading-tight">
                        {preset.title}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Profile Identity Row */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-[#18152e]">
            <div className="flex items-center gap-3.5">
              <div className="relative group cursor-pointer" title="Change profile photo">
                {/* Hidden file input */}
                <input
                  type="file"
                  id="avatar-upload-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isAvatarUploading}
                />
                <label htmlFor="avatar-upload-input" className="cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center p-0.5 border-2 border-indigo-600 relative">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-full object-cover"
                    />
                    {/* Camera overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAvatarUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                </label>
                {currentUser.isPhoneVerified && (
                  <span
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#18152e]"
                    title="Phone Number OTP Verified"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              {avatarUploadError && (
                <p className="text-xs text-red-500 mt-1">{avatarUploadError}</p>
              )}

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {currentUser.fullName}
                  </h3>
                  {(() => {
                    const activeBadge = currentUser.verificationBadge || getBadgeForPhone(currentUser.phoneNumber);
                    if (activeBadge === 'blue') {
                      return (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 text-[10px] font-bold"
                          title="Blue VIP Verified"
                        >
                          <BadgeCheck className="w-3.5 h-3.5 text-sky-500 fill-sky-500/15" />
                          <span>Verified</span>
                        </span>
                      );
                    }
                    if (activeBadge === 'gold') {
                      return (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/50 text-[10px] font-bold"
                          title="Gold Verified Merchant"
                        >
                          <BadgeCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-400/20" />
                          <span>Merchant</span>
                        </span>
                      );
                    }
                    if (activeBadge === 'creator_plus') {
                      return (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 text-[10px] font-bold"
                          title="Creator+ VIP"
                        >
                          <Crown className="w-3 h-3 text-purple-500" />
                          <span>Creator+</span>
                        </span>
                      );
                    }
                    if (activeBadge === 'admin') {
                      return (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 text-[10px] font-bold"
                          title="Verified Platform Admin"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                          <span>Admin</span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {currentUser.isPhoneVerified && (
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-mono">
                      OTP Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">@{currentHandle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentUser.phoneNumber}</span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
                  &ldquo;{currentUser.about || 'Hey there! I am using AGC.'}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => (isEditingProfile ? setIsEditingProfile(false) : openProfileEditor())}
                className="min-h-[44px] px-3 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
                title="Edit Username & Bio"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditingProfile ? 'Close' : 'Edit'}</span>
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Switch Account or Phone Number"
              >
                <Smartphone className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsScanQrModalOpen(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                title="View AGC QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hub Profile Success Notice */}
          {profileSaveFeedback && !isEditingProfile && (
            <div
              className={`mx-4 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                profileSaveFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSaveFeedback.text}</span>
            </div>
          )}

          {/* Inline Hub Username & Bio Editor */}
          {isEditingProfile && (
            <form
              onSubmit={handleSaveProfileEdit}
              className="mx-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#141126] border border-slate-200 dark:border-purple-900/40 space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Edit Hub Profile</h4>
                <span className="text-[11px] font-mono text-slate-400">Unique Handle</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Username
                </label>
                <div className="relative flex items-center">
                  <AtSign className="w-4 h-4 text-purple-500 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => handleUsernameInputChange(e.target.value)}
                    placeholder="your_username"
                    minLength={3}
                    maxLength={24}
                    required
                    className="w-full pl-9 pr-24 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="absolute right-3 flex items-center gap-1 text-[11px] font-semibold">
                    {usernameStatus === 'checking' && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking
                      </span>
                    )}
                    {usernameStatus === 'available' && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Available
                      </span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Taken
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  3–24 characters using lowercase letters, numbers, underscores, or dots.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  About / Bio
                </label>
                <input
                  type="text"
                  value={aboutInput}
                  onChange={(e) => setAboutInput(e.target.value)}
                  maxLength={180}
                  placeholder="Available · Using AGC"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {profileSaveFeedback && profileSaveFeedback.type === 'error' && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{profileSaveFeedback.text}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileSaveFeedback(null);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200/70 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 text-xs font-semibold whitespace-nowrap shrink-0 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingProfile ||
                    usernameInput.length < 3 ||
                    usernameStatus === 'taken' ||
                    usernameStatus === 'checking'
                  }
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Username</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* AGC Wallet Card with Privacy Masking - Disappears when wallet toggle is OFF */}
          {isFeatureEnabled('wallet') && (
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
                      {hideBalanceOnNav ? '₦ â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : formatPrice(wallet.availableBalance, 'NGN')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-indigo-200">Escrow Locked:</div>
                    <div className="text-xs font-bold font-mono text-amber-300">
                      {hideBalanceOnNav ? '₦ â€¢â€¢â€¢â€¢â€¢â€¢' : formatPrice(wallet.escrowLockedBalance, 'NGN')}
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

                  {isFeatureEnabled('delayedSend') && (
                    <button
                      onClick={() => setIsTransferModalOpen(true)}
                      className="py-2 bg-white/20 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Instant Transfer</span>
                    </button>
                  )}

                  {isFeatureEnabled('payroll') && (
                    <button
                      onClick={() => setIsPayrollModalOpen(true)}
                      className="py-2 bg-white/20 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Repeat className="w-3.5 h-3.5 text-purple-200" />
                      <span>Payroll Auto-Debit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Hub App Preferences (Language, Currency, Low Data, Theme) */}
          <div className="divide-y divide-slate-100 dark:divide-neutral-800/80 bg-white dark:bg-[#18152e] border-y border-slate-100 dark:border-neutral-800">

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

            {/* Notification Sound Picker (Modern Tones & Chimes) */}
            <div className="px-4 py-3.5 space-y-3 border-b border-slate-100 dark:border-neutral-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Message Tone</div>
                    <div className="text-xs text-slate-500">Pick a tone for incoming messages</div>
                  </div>
                </div>
                {/* Active Sound Pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-600 dark:text-purple-300">
                  <span>{NOTIFICATION_SOUNDS.find((s) => s.id === selectedNotificationSound)?.icon}</span>
                  <span>{NOTIFICATION_SOUNDS.find((s) => s.id === selectedNotificationSound)?.label}</span>
                </span>
              </div>

              {/* Sound Pills Carousel / Flow */}
              <div className="flex flex-wrap gap-2 pt-1">
                {NOTIFICATION_SOUNDS.map((snd) => {
                  const isSelected = selectedNotificationSound === snd.id;
                  return (
                    <button
                      key={snd.id}
                      type="button"
                      onClick={() => {
                        setSelectedNotificationSound(snd.id);
                        setNotificationSound(snd.id);
                        playNotificationSound(snd.id);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400/50'
                          : 'bg-slate-100 dark:bg-neutral-800/70 text-slate-700 dark:text-neutral-300 hover:bg-purple-50 dark:hover:bg-neutral-800 border border-transparent hover:border-purple-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-sm">{snd.icon}</span>
                      <span>{snd.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 animate-pulse" />}
                    </button>
                  );
                })}
              </div>
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
          {isFeatureEnabled('escrow') && (
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
          )}

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

          <div
            onClick={() => {
              const now = Date.now();
              const w = window as any;
              if (!w.__agcSettingsTap || now - w.__agcSettingsTap.lastAt > 2500) {
                w.__agcSettingsTap = { count: 1, lastAt: now };
              } else {
                w.__agcSettingsTap.count += 1;
                w.__agcSettingsTap.lastAt = now;
              }
              if (w.__agcSettingsTap.count >= 7) {
                w.__agcSettingsTap = { count: 0, lastAt: 0 };
                setIsAdminModalOpen(true);
              }
            }}
            className="p-4 text-center text-xs text-slate-400 select-none"
          >
            AGC Super-App · Made for African Markets
          </div>

          {/* Chat Background & Wallpaper Option */}
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('chat_bg')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#120924] border border-slate-200/80 dark:border-purple-900/40 hover:border-purple-500/50 transition-all text-left shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Chat Background & Wallpaper</span>
                    {chatWallpaper && (
                      <span className="text-[9px] font-mono bg-purple-500/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.2 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                    African cultural patterns or custom photo wallpaper
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Subtle Invite Friends & Earn — bottom link */}
          {isFeatureEnabled('referral') && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setIsReferralModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-slate-500 dark:text-purple-400/80 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium transition-all group"
              >
                <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>Invite friends & earn {CURRENCY_SYMBOLS[currency]}500 per active referral</span>
              </button>
            </div>
          )}

          {/* Account Center Banner Tile */}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => setIsAccountCenterOpen(true)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-purple-950/30 border border-purple-500/30 hover:border-purple-500 text-left transition-all shadow-xs hover:shadow-md flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-400 transition-colors">
                      Account Center
                    </h4>
                    <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full uppercase">
                      Meta / Apple Style
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-purple-300/70 mt-0.5 line-clamp-1">
                    Security, email setup, passwords, biometric passkeys & logged-in devices
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>
        </div>
      )}
      <LegalComplianceModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
      <AccountCenterModal
        isOpen={isAccountCenterOpen}
        onClose={() => setIsAccountCenterOpen(false)}
      />
    </div>
  );
};



