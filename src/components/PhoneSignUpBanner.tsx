import React, { useState, useEffect } from 'react';
import { X, Phone, ChevronRight, Shield, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

const COUNTRY_CODES = [
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
];

export const PhoneSignUpBanner: React.FC = () => {
  const { isAuthenticated } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);
  const [countryCode, setCountryCode] = useState('+234');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    // Check if dismissed within last 24h
    const dismissedAt = localStorage.getItem('AGC_pwa_banner_dismissed');
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }
    // Slide in after short delay
    const t = setTimeout(() => setIsVisible(true), 900);
    return () => clearTimeout(t);
  }, [isAuthenticated]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 320);
    localStorage.setItem('AGC_pwa_banner_dismissed', String(Date.now()));
  };

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 7) return;
    const fullPhone = `${countryCode}${phoneNumber.replace(/^0+/, '')}`;
    // Store for auth flow pickup
    localStorage.setItem('AGC_pending_signup_phone', fullPhone);
    // Fire custom event so auth modal can pre-fill the number
    window.dispatchEvent(new CustomEvent('agc:open_auth', { detail: { phone: fullPhone } }));
    handleDismiss();
  };

  if (isAuthenticated || isDismissed) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] flex justify-center transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="w-full max-w-md bg-gradient-to-r from-[#2d1060] via-[#3b1a7a] to-[#2d1060] border-b border-purple-700/50 shadow-2xl">
        <div className="px-4 pt-3 pb-3.5">
          {/* Top row: logo + dismiss */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <div>
                <p className="text-xs font-black text-white leading-none tracking-tight">AGC — All Good Connects</p>
                <p className="text-[10px] text-purple-300/80 leading-none mt-0.5">
                  Chat · Trade · Earn · Africa's Super-App 🌍
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sign-up form */}
          <form onSubmit={handleGetStarted} className="flex gap-2">
            {/* Country code selector */}
            <div className="relative shrink-0">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-white/10 text-white text-xs border border-white/20 rounded-xl px-2 py-2.5 focus:outline-none focus:border-purple-400 appearance-none pr-5 cursor-pointer"
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone number input */}
            <div className="flex-1 relative">
              <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-purple-300 pointer-events-none" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Phone number"
                maxLength={15}
                className="w-full bg-white/10 text-white text-xs border border-white/20 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none focus:border-purple-400 placeholder-purple-300/50"
              />
            </div>

            {/* CTA button */}
            <button
              type="submit"
              disabled={phoneNumber.length < 7}
              className="shrink-0 flex items-center gap-1 px-3 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all"
            >
              Join
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Trust line */}
          <div className="flex items-center gap-1.5 mt-2">
            <Shield className="w-3 h-3 text-purple-400 shrink-0" />
            <p className="text-[10px] text-purple-300/60">
              Free · No spam · Your number is private · Sign up takes 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
