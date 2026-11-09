import React from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CurrencyCode, LanguageCode } from '../types';

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
  } = useApp();

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
    <div className="flex flex-col pb-24 text-slate-800 dark:text-slate-100 bg-white dark:bg-[#11101e] min-h-[calc(100vh-130px)]">
      {/* Prominent Page Title */}
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
          You
        </h2>
      </div>

      {/* Profile Row */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#18152e]">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center p-0.5 border-2 border-indigo-600">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              Chioma Adebayo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Available · African Market Buyer & Trader
            </p>
          </div>
        </div>
        <button
          onClick={() => alert('Your AfriChat QR code')}
          className="text-indigo-600 dark:text-indigo-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {/* AfriChat Wallet Card */}
      <div className="p-4 bg-slate-50 dark:bg-[#18152e] border-b border-slate-100 dark:border-slate-800">
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold">AfriChat Wallet</span>
            </div>
            <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-full">
              Paystack Protected
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-indigo-200">Available Balance:</div>
              <div className="text-2xl font-black font-mono">
                {formatPrice(wallet.availableBalance, 'NGN')}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-indigo-200">Escrow Locked:</div>
              <div className="text-xs font-bold font-mono text-amber-300">
                {formatPrice(wallet.escrowLockedBalance, 'NGN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15">
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="py-2 bg-white text-indigo-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Top-up (Paystack)</span>
            </button>

            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="py-2 bg-white/15 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Wallet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#18152e]">
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
                    {order.sellerName} · PIN: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{order.escrowPin}</span>
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

      {/* Security */}
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
  );
};
