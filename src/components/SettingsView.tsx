import React, { useState } from 'react';
import {
  User,
  Key,
  Lock,
  Globe,
  Coins,
  Database,
  HelpCircle,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Moon,
  Sun,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Radio,
  Sparkles,
  ShieldAlert,
  EyeOff,
  Eye,
  Truck,
  Briefcase,
  Store,
  Users,
  Phone,
  CheckCircle2,
  LockKeyhole,
  Smartphone,
  Clock,
  Repeat,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CurrencyCode, LanguageCode } from '../types';
import { MarketplaceView } from './MarketplaceView';

interface SettingsViewProps {
  onOpenLanguageModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenLanguageModal }) => {
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
    setIsMemeStudioOpen,
    setIsScamCheckerOpen,
    joinAudioSpace,
    audioSpaces,
    currentUser,
    isAuthenticated,
    setIsAuthModalOpen,
    logoutUser,
    hideBalanceOnNav,
    toggleHideBalance,
    dispatchOrders,
    setIsDispatchModalOpen,
    jobPostings,
    setIsJobBoardModalOpen,
    securitySettings,
    setIsSecurityModalOpen,
    deviceContacts,
    setIsContactsModalOpen,
    setIsServicesModalOpen,
    serviceBookings,
    setIsTransferModalOpen,
    delayedTransfers,
    setIsPayrollModalOpen,
    payrollEmployees,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'services' | 'stores'>('services');

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
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              You
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Personal Profile, African Hub & Stores
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Segmented Navigation Switcher: Services vs Stores */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeSubTab === 'services'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Services</span>
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
        </div>
      </div>

      {/* Render Stores Tab Content when selected */}
      {activeSubTab === 'stores' ? (
        <MarketplaceView />
      ) : (
        <div>
          {/* User Profile Identity Row */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#18152e]">
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
                  &ldquo;{currentUser.about || 'Hey there! I am using AfriChat.'}&rdquo;
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
                onClick={() => alert(`AfriChat Identity QR for ${currentUser.phoneNumber}`)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                title="View AfriChat QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AfriChat Wallet Card with Privacy Masking */}
          <div className="p-4 bg-slate-50 dark:bg-[#18152e] border-b border-slate-100 dark:border-slate-800">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white space-y-3 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold">AfriChat Vault & Wallet</span>
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

          {/* High Priority Super-App Integrations Banner Cards */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-black border-b border-slate-100 dark:border-neutral-800">
            {/* 1. African Services & Appointment Booking */}
            <div
              onClick={() => setIsServicesModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/30 hover:border-purple-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  No Limits African Jobs
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Services & Appointments</span>
                <ChevronRight className="w-4 h-4 text-purple-600 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Book mechanics, barbers, nail techs, bouncers, event planners, DJs & specialists with Escrow release PINs.
              </p>
              <div className="mt-2 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                ● {serviceBookings.length} appointments booked
              </div>
            </div>

            {/* 2. 1-2 Days Delayed Money Transfer */}
            <div
              onClick={() => setIsTransferModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  Anti-Fraud Delay
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Send with 1-2 Days Delay</span>
                <ChevronRight className="w-4 h-4 text-amber-600 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Send funds under 24-48h escrow delay. Easily cancel and reclaim funds if scam or issue is found.
              </p>
              <div className="mt-2 text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                ● {delayedTransfers.filter((t) => t.status === 'pending_clearance').length} in clearance
              </div>
            </div>

            {/* 3. Payroll & Recurring Auto-Debit */}
            <div
              onClick={() => setIsPayrollModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Repeat className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Auto-Disburse
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Payroll & Staff Auto-Debit</span>
                <ChevronRight className="w-4 h-4 text-emerald-600 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Automated recurring payouts for drivers, shop attendants, security, tailors & domestic staff.
              </p>
              <div className="mt-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                ● {payrollEmployees.filter((e) => e.status === 'active').length} active staff on auto-debit
              </div>
            </div>

            {/* 4. Gokada & PickkR Courier Dispatch Button */}
            <div
              onClick={() => setIsDispatchModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent border border-blue-500/30 hover:border-blue-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Gokada & PickkR
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Courier Dispatch</span>
                <ChevronRight className="w-4 h-4 text-blue-600 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Book bikes, kekes & vans. Calculate fees and track delivery riders live.
              </p>
              {dispatchOrders.length > 0 && (
                <div className="mt-2 text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                  ● {dispatchOrders.length} active delivery orders
                </div>
              )}
            </div>

            {/* 5. African Job Board & Opportunities */}
            <div
              onClick={() => setIsJobBoardModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-500/30 hover:border-purple-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  ₦15,000 Post Fee
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Job Board & Hiring</span>
                <ChevronRight className="w-4 h-4 text-purple-600 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Post tech & trade jobs or apply directly via AfriChat encrypted messenger.
              </p>
              <div className="mt-2 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                ● {jobPostings.length} active African listings
              </div>
            </div>

            {/* 6. Payment PIN & Security Settings */}
            <div
              onClick={() => setIsSecurityModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-500/10 via-neutral-500/5 to-transparent border border-slate-500/30 hover:border-slate-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 text-white flex items-center justify-center shadow-xs">
                  <LockKeyhole className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-neutral-500/20 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                  4-Digit PIN
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>Payment PIN & Security</span>
                <ChevronRight className="w-4 h-4 text-neutral-400 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Configure wallet authorizations and security questions for instant account recovery.
              </p>
              <div className="mt-2 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                {securitySettings.hasPaymentPin ? '✓ PIN Configured' : '⚠️ Setup PIN now'}
              </div>
            </div>

            {/* 4. Synced Contacts & Address Book */}
            <div
              onClick={() => setIsContactsModalOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/30 hover:border-sky-500/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">
                  E.164 Sync
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Address Book Contacts</span>
                <ChevronRight className="w-4 h-4 text-sky-600 transition-transform group-hover:translate-x-1" />
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Scan device phone book and discover who is registered on AfriChat to message instantly.
              </p>
              <div className="mt-2 text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold">
                ● {deviceContacts.filter((c) => c.isRegisteredOnAfriChat).length} friends on AfriChat
              </div>
            </div>
          </div>

          {/* Quick Hub Settings List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#18152e]">
            {/* Phone Authentication & Change Number */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
            >
              <div className="flex items-center gap-4">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-medium">WhatsApp-Style Phone OTP</div>
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
          </div>

          {/* African Super-App Suite Section */}
          <div className="mt-4">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              African Market Features
            </div>

            <div className="bg-white dark:bg-[#18152e] divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Street Radio */}
              <button
                onClick={() => {
                  const liveSpace = audioSpaces.find((s) => s.isLive) || audioSpaces[0];
                  if (liveSpace) joinAudioSpace(liveSpace);
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>Street Radio Spaces</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold">
                        12kbps
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Ultra-low bandwidth live football banter & audio town halls
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Scam Database */}
              <button
                onClick={() => setIsScamCheckerOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>Scam Alert & Reputation Checker</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                        Verified
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Search & crowdsource phone numbers and bank account risks
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Nollywood Meme & Sticker Studio */}
              <button
                onClick={() => setIsMemeStudioOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>Meme & Local Sticker Studio</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold">
                        Nollywood
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Create stickers with viral African slangs & pop moments
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Screenshot Blocker Privacy Info */}
              <div className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Screenshot & Screen Record Shield</div>
                  <div className="text-xs text-slate-500">
                    Watermarks & blocks unauthorized captures of financial chats & receipts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Escrow Orders History Section */}
          <div className="mt-4">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Paystack Escrow Purchases
            </div>

            <div className="bg-white dark:bg-[#18152e] divide-y divide-slate-100 dark:divide-slate-800/80">
              {escrowOrders.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No orders placed yet. Products bought from chat catalogs appear here with escrow release PINs.
                </div>
              ) : (
                escrowOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setActiveEscrowModalOrder(order)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
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
          <div className="mt-4 bg-white dark:bg-[#18152e] divide-y divide-slate-100 dark:divide-slate-800/80">
            <div className="flex items-center gap-4 px-4 py-3.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <div className="text-sm font-medium">AfriChat Escrow Protection</div>
                <div className="text-xs text-slate-500">
                  Powered exclusively by Paystack & AfriChat Vault
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 text-center text-xs text-slate-400">
            AfriChat Super-App · Made for African Markets
          </div>
        </div>
      )}
    </div>
  );
};
