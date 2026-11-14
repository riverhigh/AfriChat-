import React, { useState } from 'react';
import {
  GraduationCap,
  QrCode,
  Scan,
  MoreVertical,
  Moon,
  Sun,
  Globe,
  Check,
  Wallet,
  Radio,
  Sparkles,
  ShieldAlert,
  Eye,
  EyeOff,
  Truck,
  Briefcase,
  Users,
  Lock,
  Clock,
  Repeat,
  Wrench,
  HeartPulse,
  Scale,
  Ticket,
  Music,
  X,
  Coins,
  LockKeyhole,
  Share2,
  BookOpen,
  Crown,
  Store,
  CheckCircle2,
  ShieldCheck,
  Search,
  PawPrint,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onOpenLanguageModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLanguageModal }) => {
  const {
    t,
    currentUser,
    isDarkMode,
    toggleDarkMode,
    lowDataMode,
    toggleLowDataMode,
    language,
    wallet,
    hideBalanceOnNav,
    toggleHideBalance,
    setIsWalletModalOpen,
    setIsMemeStudioOpen,
    setIsScamCheckerOpen,
    setIsDispatchModalOpen,
    setIsJobBoardModalOpen,
    setIsContactsModalOpen,
    setIsAuthModalOpen,
    setIsServicesModalOpen,
    setIsTransferModalOpen,
    setIsPayrollModalOpen,
    setIsScanQrModalOpen,
    setIsHealthModalOpen,
    setIsLegalModalOpen,
    setIsCreatorModalOpen,
    setIsAjoModalOpen,
    setIsSecurityModalOpen,
    setIsReferralModalOpen,
    setIsCelebrityModalOpen,
    setIsStoreRegModalOpen,
    setIsWritersModalOpen,
    setIsTutorModalOpen,
    setIsArtisanModalOpen,
    setIsAdminModalOpen,
    setIsPetShopModalOpen,
    systemBroadcast,
    setSystemBroadcast,
    joinAudioSpace,
    audioSpaces,
    isFeatureEnabled,
  } = useApp();

  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState<'finance' | 'services' | 'tools'>('finance');
  const [menuSearch, setMenuSearch] = useState('');

  const formattedShortBalance = `₦${Math.floor(wallet.availableBalance / 1000)}k`;

  return (
    <header
      className="pt-safe-header sticky top-0 z-30 bg-purple-900 dark:bg-black text-white transition-colors border-b border-purple-950 dark:border-neutral-800"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 6px), 14px)',
      }}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Left Three Dots / Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop click away */}
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
                  onClick={() => setShowMenu(false)}
                />

                {/* 2-by-2 Stacked Scrollable Feature Menu */}
                <div className="fixed top-12 left-2 right-2 sm:absolute sm:left-0 sm:right-auto sm:w-[360px] z-50 bg-white dark:bg-neutral-950 text-slate-800 dark:text-white rounded-3xl shadow-2xl p-3 border border-slate-200 dark:border-neutral-800 max-h-[82vh] overflow-y-auto animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-neutral-800 px-1">
                    <div>
                      <h4 className="text-sm font-black font-display text-slate-900 dark:text-white">
                        Super-App Features
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                        Select any African tool or service
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMenu(false)}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search features..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>

                  {/* Category filter pills */}
                  {!menuSearch && (
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5 no-scrollbar">
                      {(['finance', 'services', 'tools'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setMenuFilter(f)}
                          className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${
                            menuFilter === f
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {f === 'finance' ? '\u20a6 Finance' : f === 'services' ? '\u2692 Services' : '\u2699 Tools'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Admin Console - Hidden from regular users */}
                  {(currentUser?.role === 'admin' || currentUser?.isAdmin) && !menuSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsAdminModalOpen(true);
                      }}
                      className="w-full mb-3 p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-950/40 hover:bg-purple-500/20 border border-purple-500/40 text-left transition-all group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <ShieldCheck className="w-4 h-4 text-amber-300" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                            Super Admin Console
                          </span>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 block mt-0.5 leading-tight">
                            User Badges, Escrow Vaults & Supabase
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                        ROOT
                      </span>
                    </button>
                  )}

                  {/* 4-col icon launcher */}
                  {(() => {
                    const allTools: { label: string; sub: string; icon: React.ElementType; action: () => void; cat: 'finance' | 'services' | 'tools'; featureKey?: string }[] = [
                      { label: 'Wallet', sub: 'Paystack & Escrow', icon: Wallet, action: () => setIsWalletModalOpen(true), cat: 'finance', featureKey: 'wallet' },
                      { label: 'Delayed Send', sub: 'Anti-Fraud Send', icon: Clock, action: () => setIsTransferModalOpen(true), cat: 'finance', featureKey: 'delayedSend' },
                      { label: 'Artisan Hub', sub: '₦5k · Book Skill', icon: Wrench, action: () => setIsServicesModalOpen(true), cat: 'services', featureKey: 'artisan' },
                      { label: 'AfriHealth', sub: 'Queues & Telehealth', icon: HeartPulse, action: () => setIsHealthModalOpen(true), cat: 'services', featureKey: 'healthcare' },
                      { label: 'AfriLaw', sub: 'Contracts & Law', icon: Scale, action: () => setIsLegalModalOpen(true), cat: 'services', featureKey: 'legal' },
                      { label: 'Dispatch', sub: 'PickkR / Gokada', icon: Truck, action: () => setIsDispatchModalOpen(true), cat: 'services', featureKey: 'dispatch' },
                      { label: 'Job Board', sub: 'Hire & Earn Gigs', icon: Briefcase, action: () => setIsJobBoardModalOpen(true), cat: 'services', featureKey: 'jobs' },
                      { label: 'Creator Hub', sub: 'VIP Calls & Drops', icon: Sparkles, action: () => setIsCreatorModalOpen(true), cat: 'tools', featureKey: 'creator' },
                      { label: 'Store Tiers', sub: '₦3k / ₦7k Monthly', icon: Store, action: () => setIsStoreRegModalOpen(true), cat: 'tools', featureKey: 'storeTiers' },
                      { label: 'Writers Guild', sub: 'Chapters & Buddy', icon: BookOpen, action: () => setIsWritersModalOpen(true), cat: 'tools', featureKey: 'writers' },
                      { label: 'Spaces', sub: 'Live Audio Spaces', icon: Radio, action: () => { const live = audioSpaces.find((s) => s.isLive) || audioSpaces[0]; if (live) joinAudioSpace(live); }, cat: 'tools', featureKey: 'audioSpaces' },
                      { label: 'Invite & Earn', sub: '₦500/Friend', icon: Share2, action: () => setIsReferralModalOpen(true), cat: 'tools', featureKey: 'referral' },
                      { label: 'Tutors', sub: '₦5k · Courses', icon: GraduationCap, action: () => setIsTutorModalOpen(true), cat: 'tools', featureKey: 'tutor' },
                      { label: 'Meme Studio', sub: 'African Stickers', icon: Sparkles, action: () => setIsMemeStudioOpen(true), cat: 'tools', featureKey: 'memeStudio' },
                      { label: 'Scam Checker', sub: 'Verify Phone/Bank', icon: ShieldAlert, action: () => setIsScamCheckerOpen(true), cat: 'tools', featureKey: 'scamChecker' },
                      { label: 'Pet Shop', sub: 'Forum & Marketplace', icon: PawPrint, action: () => setIsPetShopModalOpen(true), cat: 'services', featureKey: 'petShop' },
                      { label: 'Security PIN', sub: 'Wallet Auth', icon: LockKeyhole, action: () => setIsSecurityModalOpen(true), cat: 'tools', featureKey: 'securityPin' },
                    ];
                    const q = menuSearch.toLowerCase();
                    const filtered = allTools.filter((t) => {
                      if (t.featureKey && !isFeatureEnabled(t.featureKey as any)) return false;
                      if (q) return t.label.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q);
                      return t.cat === menuFilter;
                    });
                    if (filtered.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500">
                          No features match &ldquo;{menuSearch}&rdquo;
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-4 gap-2">
                        {filtered.map((tool) => {
                          const IconComp = tool.icon;
                          return (
                            <button
                              key={tool.label}
                              type="button"
                              onClick={() => {
                                setShowMenu(false);
                                setMenuSearch('');
                                tool.action();
                              }}
                              className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-neutral-800 hover:border-purple-400/50 transition-all group active:scale-95"
                            >
                              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-800 dark:text-white leading-tight text-center line-clamp-2 w-full">
                                {tool.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {/* System Settings Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setIsContactsModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 flex items-center gap-2 text-xs font-semibold"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Contacts</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 flex items-center gap-2 text-xs font-semibold"
                      >
                        <Lock className="w-3.5 h-3.5 text-purple-500" />
                        <span>Phone ID</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onOpenLanguageModal();
                        }}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 flex items-center justify-center gap-1 font-mono uppercase font-bold text-purple-600 dark:text-purple-400"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{language}</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleLowDataMode}
                        className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                          lowDataMode
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-50 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400'
                        }`}
                      >
                        <span>Low Data</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className="py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 flex items-center justify-center gap-1 text-slate-600 dark:text-neutral-400"
                      >
                        {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                        <span>Theme</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <img
              src="/icon-192.png"
              alt="AGC Logo"
              className="w-7 h-7 rounded-lg object-cover shadow-sm ring-1 ring-white/20"
            />
            <span className="font-display font-bold text-lg tracking-tight text-white">
              AGC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Paystack Wallet Balance Pill with Toggle to Turn Off Figure */}
          <div className="smartwatch-hide flex items-center rounded-full bg-white/10 hover:bg-white/15 text-indigo-200 text-xs font-mono font-bold transition-all border border-white/10 shadow-xs">
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"
              title="Open AGC Wallet"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>{hideBalanceOnNav ? '₦ ••••••' : formattedShortBalance}</span>
            </button>

            {/* Eye toggle button to turn off balance figure on the nav */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleHideBalance();
              }}
              className="pr-2 pl-1 py-1 text-white/60 hover:text-white transition-colors"
              title={hideBalanceOnNav ? 'Show balance figure on nav' : 'Hide balance figure on nav (privacy mode)'}
              aria-label="Toggle balance privacy"
            >
              {hideBalanceOnNav ? (
                <Eye className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-white/60 hover:text-white" />
              )}
            </button>
          </div>

          {/* Scan QR Button */}
          <button
            type="button"
            onClick={() => setIsScanQrModalOpen(true)}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            aria-label="Scan QR Code"
            title="Scan & Share QR Code"
          >
            <Scan className="w-5 h-5 text-purple-200 hover:text-white" />
          </button>

          {/* Plus Action Button */}
          <button
            type="button"
            onClick={() => setIsContactsModalOpen(true)}
            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform active:scale-95"
            aria-label="Quick Action"
            title="Start New Chat / Find Contacts"
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
};
