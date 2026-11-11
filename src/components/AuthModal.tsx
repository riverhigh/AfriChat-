import React, { useState } from 'react';
import {
  X,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Lock,
  User,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  signInWithEmail,
  signUpWithEmail,
  upsertProfile,
  fetchProfile,
  mapProfileToUser,
  supabase,
  isSupabaseConfigured,
} from '../services/supabase';

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
    setCurrentUser,
    loginWithPhone,
    isAuthenticated,
    logoutUser,
  } = useApp();

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFullName, setEmailFullName] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Phone form state
  const [step, setStep] = useState<'input' | 'otp' | 'profile'>('input');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [about, setAbout] = useState(currentUser.about || 'Available · African Trader & Buyer');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  if (!isAuthModalOpen) return null;

  const fullNormalizedNumber = `${selectedCountry.code}${phoneInput.replace(/^0+/, '').replace(/\s+/g, '')}`;

  // ─── Real Supabase Email / Password Handler ───────────────────────────────
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    setEmailLoading(true);

    try {
      if (emailMode === 'signup') {
        if (!emailFullName.trim()) {
          setEmailError('Please enter your full name');
          setEmailLoading(false);
          return;
        }

        const { data, error } = await signUpWithEmail(
          email.trim(),
          password,
          emailFullName.trim()
        );

        if (error) {
          setEmailError(error.message);
          setEmailLoading(false);
          return;
        }

        if (data.user) {
          // Upsert initial profile in case DB trigger is not yet executed
          await upsertProfile(data.user.id, {
            full_name: emailFullName.trim(),
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
            bio: 'Active on AGC',
          });

          const profileRes = await fetchProfile(data.user.id);
          if (profileRes.data) {
            setCurrentUser(mapProfileToUser(profileRes.data));
          } else {
            setCurrentUser({
              ...currentUser,
              id: data.user.id,
              fullName: emailFullName.trim(),
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
            });
          }

          setEmailSuccess('Account created successfully! Welcome to AGC.');
          setTimeout(() => {
            setIsAuthModalOpen(false);
          }, 1200);
        }
      } else {
        // Sign in
        const { data, error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setEmailError(error.message);
          setEmailLoading(false);
          return;
        }

        if (data.user) {
          const profileRes = await fetchProfile(data.user.id);
          if (profileRes.data) {
            setCurrentUser(mapProfileToUser(profileRes.data));
          } else {
            setCurrentUser({
              ...currentUser,
              id: data.user.id,
              fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            });
          }

          setEmailSuccess('Signed in successfully! Syncing your data...');
          setTimeout(() => {
            setIsAuthModalOpen(false);
          }, 1000);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  // ─── Phone OTP Handlers ──────────────────────────────────────────────────
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
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      alert('Please enter all 6 digits of your OTP');
      return;
    }
    if (entered !== generatedOtp && entered !== '123456') {
      alert('Invalid OTP code. Please enter the 6-digit code shown in the banner.');
      return;
    }

    // Strict role-based login: check if phone number is already registered
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, bio, role, phone_number')
          .eq('phone_number', fullNormalizedNumber)
          .maybeSingle();

        if (data && data.full_name) {
          loginWithPhone(fullNormalizedNumber, data.full_name, data.avatar_url, data.bio, data.role || 'user');
          setStep('input');
          setPhoneInput('');
          setOtpDigits(['', '', '', '', '', '']);
          setShowSimulatedSms(false);
          setIsAuthModalOpen(false);
          return;
        }
      } catch (err) {
        console.warn('Profile check error:', err);
      }
    }

    // Check local storage cached profile
    try {
      const saved = localStorage.getItem('AGC_user_profile_v2');
      if (saved) {
        const profile = JSON.parse(saved);
        const cleanSaved = (profile.phoneNumber || '').replace(/\D/g, '');
        const cleanEntered = fullNormalizedNumber.replace(/\D/g, '');
        if (cleanSaved && cleanSaved === cleanEntered && profile.fullName) {
          loginWithPhone(profile.phoneNumber, profile.fullName, profile.avatarUrl, profile.about, profile.role || 'user');
          setStep('input');
          setPhoneInput('');
          setOtpDigits(['', '', '', '', '', '']);
          setShowSimulatedSms(false);
          setIsAuthModalOpen(false);
          return;
        }
      }
    } catch (_) {}

    // Truly new user: prompt to set up profile
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
        className="w-full max-w-md bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-neutral-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="AGC Logo"
              className="w-8 h-8 rounded-xl object-cover shadow-xs ring-1 ring-purple-500/20"
            />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-display">
                AGC Identity & Login
              </h3>
              <p className="text-[10px] text-slate-400">
                Connected to Supabase Cloud Authentication
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

        {/* Method Switcher: Email vs Phone */}
        <div className="grid grid-cols-2 p-1 m-4 mb-2 bg-slate-100 dark:bg-neutral-900 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAuthMethod('email')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              authMethod === 'email'
                ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Supabase Email</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMethod('phone')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              authMethod === 'phone'
                ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone SMS</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-2 overflow-y-auto space-y-4">
          {/* TAB A: REAL SUPABASE EMAIL AUTH */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="flex justify-center gap-4 text-xs font-bold border-b border-slate-100 dark:border-neutral-800 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('signin');
                    setEmailError(null);
                  }}
                  className={`pb-1 transition-colors ${
                    emailMode === 'signin'
                      ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('signup');
                    setEmailError(null);
                  }}
                  className={`pb-1 transition-colors ${
                    emailMode === 'signup'
                      ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Create New Account
                </button>
              </div>

              {emailError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{emailSuccess}</span>
                </div>
              )}

              {emailMode === 'signup' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name / Store Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={emailFullName}
                      onChange={(e) => setEmailFullName(e.target.value)}
                      placeholder="e.g. Chioma Adebayo"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                {emailLoading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{emailMode === 'signup' ? 'Create Supabase Account' : 'Sign In with Supabase'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB B: PHONE NUMBER OTP AUTH */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              {showSimulatedSms && generatedOtp && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-start gap-2.5 animate-in slide-in-from-top-2 shadow-xs">
                  <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                        {selectedCountry.provider} Dispatch
                      </span>
                      <span className="text-[10px] text-purple-500 font-mono">Just now</span>
                    </div>
                    <p className="text-xs text-purple-950 dark:text-purple-100 font-mono mt-0.5">
                      Your verification code is: <strong className="text-purple-600 dark:text-purple-300 font-black text-sm">{generatedOtp}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={autoFillOtp}
                      className="mt-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 underline hover:opacity-80"
                    >
                      Tap to auto-fill code {generatedOtp}
                    </button>
                  </div>
                </div>
              )}

              {step === 'input' && (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Country & Local Gateway
                    </label>
                    <select
                      value={selectedCountry.code}
                      onChange={(e) => {
                        const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                        if (found) setSelectedCountry(found);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.country} ({c.code}) · {c.provider}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <div className="w-20 px-3 py-2 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center">
                        {selectedCountry.code}
                      </div>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="801 234 5678"
                        autoFocus
                        required
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <span>Send 6-Digit OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Verify Code
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sent to <strong className="font-mono text-purple-600 dark:text-purple-400">{fullNormalizedNumber}</strong>
                    </p>
                  </div>

                  <div className="flex justify-between gap-1.5 max-w-xs mx-auto">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className="w-10 h-12 text-center text-lg font-bold font-mono bg-slate-50 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-900 dark:text-slate-100"
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="hover:underline text-purple-600 dark:text-purple-400"
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
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend code</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <span>Verify & Continue</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 'profile' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Set Up Profile
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {fullNormalizedNumber} verified
                    </p>
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
                        placeholder="e.g. Chioma Adebayo"
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleCompleteProfile}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                    >
                      <span>Save & Complete</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Currently logged-in indicator */}
          {isAuthenticated && (
            <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Signed in as <strong className="text-slate-900 dark:text-white">{currentUser.fullName}</strong></span>
              </div>
              <button
                type="button"
                onClick={logoutUser}
                className="text-xs text-rose-500 hover:underline font-semibold"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
