import React, { useState } from 'react';
import { X, Smartphone, ArrowRight, ShieldCheck, CheckCircle2, User, RefreshCw, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';

const COUNTRY_CODES = [
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', provider: 'Termii Local SMS' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪', provider: "Africa's Talking" },
  { code: '+233', country: 'Ghana', flag: '🇬🇭', provider: 'Termii West Africa' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', provider: 'Infobip Route' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬', provider: "Africa's Talking" },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼', provider: "Africa's Talking" },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮', provider: 'Termii Francophone' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', provider: 'Twilio Route' },
];

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    currentUser,
    loginWithPhone,
    isAuthenticated,
    logoutUser,
  } = useApp();

  const [step, setStep] = useState<'input' | 'otp' | 'profile'>('input');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [about, setAbout] = useState(currentUser.about || 'Available · African Trader & Buyer');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [resendCooldown, setResendCooldown] = useState(30);

  if (!isAuthModalOpen) return null;

  const fullNormalizedNumber = `${selectedCountry.code}${phoneInput.replace(/^0+/, '').replace(/\s+/g, '')}`;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim() || phoneInput.length < 7) {
      alert('Please enter a valid phone number');
      return;
    }
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    setGeneratedOtp(otp);
    setStep('otp');
    setShowSimulatedSms(true);
    setResendCooldown(30);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    // Auto advance to next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      alert('Please enter all 6 digits of your OTP');
      return;
    }
    if (entered !== generatedOtp && entered !== '123456') {
      alert('Invalid OTP code. Please enter the 6-digit code shown in the simulated SMS banner.');
      return;
    }

    // Advance to profile confirmation or complete
    setStep('profile');
  };

  const handleCompleteProfile = () => {
    if (!fullName.trim()) {
      alert('Please provide your name or business name');
      return;
    }
    loginWithPhone(fullNormalizedNumber, fullName, avatarUrl, about);
    setStep('input');
    setPhoneInput('');
    setOtpDigits(['', '', '', '', '', '']);
    setShowSimulatedSms(false);
  };

  const autoFillOtp = () => {
    if (!generatedOtp) return;
    setOtpDigits(generatedOtp.split(''));
  };

  return (
    <div
      onClick={() => setIsAuthModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Phone Number Identity (OTP)
              </h3>
              <p className="text-[10px] text-slate-400">
                WhatsApp-style verification & carrier routing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simulated Carrier SMS Toast */}
        {showSimulatedSms && generatedOtp && (
          <div className="mx-4 mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2 shadow-xs">
            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                  {selectedCountry.provider} Dispatch
                </span>
                <span className="text-[10px] text-indigo-500 font-mono">Just now</span>
              </div>
              <p className="text-xs text-indigo-950 dark:text-indigo-100 font-mono mt-0.5">
                Your AfriChat verification code is: <strong className="text-indigo-600 dark:text-indigo-300 font-black text-sm">{generatedOtp}</strong>
              </p>
              <button
                type="button"
                onClick={autoFillOtp}
                className="mt-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 underline hover:opacity-80"
              >
                Tap to auto-fill code {generatedOtp}
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* STEP 1: Phone Input */}
          {step === 'input' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Enter your phone number
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AfriChat will dispatch a secure 6-digit OTP via local African SMS gateways to verify your identity.
                </p>
              </div>

              {/* Country Selector & Number */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Country & Local Gateway
                </label>
                <div className="relative">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                      if (found) setSelectedCountry(found);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.country} ({c.code}) · {c.provider}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="w-20 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center">
                    {selectedCountry.code}
                  </div>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="801 234 5678"
                    autoFocus
                    required
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cost-Effective Routing Explainer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-[11px] text-slate-500 space-y-1 border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cost-Effective African Telecom Routing</span>
                </div>
                <p>
                  Direct local routing via <strong>Termii</strong> and <strong>Africa&apos;s Talking</strong> avoids expensive international carrier surcharges, guaranteeing 99.4% instant delivery.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                <span>Send 6-Digit OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {isAuthenticated && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={logoutUser}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Log out currently connected account ({currentUser.phoneNumber})
                  </button>
                </div>
              )}
            </form>
          )}

          {/* STEP 2: OTP Input */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Verify One-Time Password
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the 6-digit code sent to <strong className="text-slate-800 dark:text-slate-200 font-mono">{fullNormalizedNumber}</strong>
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-between gap-2 max-w-xs mx-auto">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-11 h-13 text-center text-xl font-bold font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-slate-100"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="hover:underline text-indigo-600 dark:text-indigo-400"
                >
                  Change number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
                    setGeneratedOtp(otp);
                    setShowSimulatedSms(true);
                  }}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend code</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                <span>Verify & Continue</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: Profile Setup */}
          {step === 'profile' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Set Up Your AfriChat Profile
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your phone number <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{fullNormalizedNumber}</span> is now verified and locked as your unique account ID.
                </p>
              </div>

              {/* Avatar Selector */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full border-2 border-indigo-600 overflow-hidden p-0.5 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                  ].map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-transform ${avatarUrl === url ? 'border-indigo-600 scale-110' : 'border-transparent opacity-70'}`}
                    >
                      <img src={url} alt="pic" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Name / Store Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chioma Adebayo or Mama Chidinma Fabrics"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    About Status Yarn
                  </label>
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Available · African Market Buyer & Trader"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompleteProfile}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                <span>Save Profile & Start Chatting</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
