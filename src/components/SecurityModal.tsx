import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Clock,
  KeyRound,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const PRESET_SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first primary school in Nigeria?",
  "What is your favorite African traditional dish (e.g. Amala, Jollof, Egusi)?",
  "What was your childhood street or neighborhood in Lagos/Accra?",
  "What is the nickname your grandmother called you?",
  "In which city were you born?",
  "What was the first mobile phone model you ever owned?",
];

export const SecurityModal: React.FC = () => {
  const {
    isSecurityModalOpen,
    setIsSecurityModalOpen,
    securitySettings,
    updatePaymentPin,
    verifyPaymentPinDetailed,
    setSecurityQuestions,
    resetPaymentPinWithQuestions,
  } = useApp();

  const configuredQuestions = securitySettings.securityQuestions || [];
  const hasTwoQuestions = configuredQuestions.length >= 2;
  const hasExistingPin = Boolean(securitySettings.hasPaymentPin && securitySettings.paymentPin);

  const [activeTab, setActiveTab] = useState<'pin' | 'questions'>(() =>
    hasTwoQuestions ? 'pin' : 'questions'
  );
  const [isForgotPinMode, setIsForgotPinMode] = useState(false);

  // PIN management state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Forgot PIN recovery state
  const [recoveryAnswer1, setRecoveryAnswer1] = useState('');
  const [recoveryAnswer2, setRecoveryAnswer2] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');

  // 2 Security Questions state
  const [question1, setQuestion1] = useState(
    configuredQuestions[0]?.question || PRESET_SECURITY_QUESTIONS[0]
  );
  const [answer1, setAnswer1] = useState(configuredQuestions[0]?.answer || '');
  const [question2, setQuestion2] = useState(
    configuredQuestions[1]?.question || PRESET_SECURITY_QUESTIONS[1]
  );
  const [answer2, setAnswer2] = useState(configuredQuestions[1]?.answer || '');
  const [questionPin, setQuestionPin] = useState('');

  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  // Sync form defaults whenever modal opens or saved questions change
  useEffect(() => {
    if (isSecurityModalOpen) {
      setErrorMessage(null);
      setSavedSuccessMessage(null);
      setIsForgotPinMode(false);
      const qList = securitySettings.securityQuestions || [];
      if (qList.length >= 2) {
        setQuestion1(qList[0].question);
        setAnswer1(qList[0].answer);
        setQuestion2(qList[1].question);
        setAnswer2(qList[1].answer);
      } else {
        setQuestion1(PRESET_SECURITY_QUESTIONS[0]);
        setQuestion2(PRESET_SECURITY_QUESTIONS[1]);
        setActiveTab('questions');
      }
    }
  }, [isSecurityModalOpen]);

  // Monitor lockout countdown
  useEffect(() => {
    if (!securitySettings.lockoutUntil) {
      setLockoutRemaining(null);
      return;
    }

    const checkLock = () => {
      const now = Date.now();
      if (securitySettings.lockoutUntil && securitySettings.lockoutUntil > now) {
        setLockoutRemaining(Math.ceil((securitySettings.lockoutUntil - now) / 1000));
      } else {
        setLockoutRemaining(null);
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, [securitySettings.lockoutUntil]);

  if (!isSecurityModalOpen) return null;

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccessMessage(null);

    if (!hasTwoQuestions) {
      setErrorMessage('Please configure 2 Security Questions & Answers first before setting a Payment PIN.');
      setActiveTab('questions');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMessage('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('New PIN and Confirm PIN do not match.');
      return;
    }

    const res = updatePaymentPin(newPin, hasExistingPin ? oldPin : undefined);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setNewPin('');
    setConfirmPin('');
    setOldPin('');
    setSavedSuccessMessage(res.message);
    setTimeout(() => setSavedSuccessMessage(null), 4500);
  };

  const handleForgotPinReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccessMessage(null);

    if (!recoveryAnswer1.trim() || !recoveryAnswer2.trim()) {
      setErrorMessage('Please enter answers to both Security Questions.');
      return;
    }
    if (recoveryNewPin.length !== 4 || !/^\d{4}$/.test(recoveryNewPin)) {
      setErrorMessage('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (recoveryNewPin !== recoveryConfirmPin) {
      setErrorMessage('New PIN and Confirm PIN do not match.');
      return;
    }

    const res = resetPaymentPinWithQuestions([recoveryAnswer1, recoveryAnswer2], recoveryNewPin);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setRecoveryAnswer1('');
    setRecoveryAnswer2('');
    setRecoveryNewPin('');
    setRecoveryConfirmPin('');
    setIsForgotPinMode(false);
    setSavedSuccessMessage(res.message);
    setTimeout(() => setSavedSuccessMessage(null), 4500);
  };

  const handleUpdateQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccessMessage(null);

    if (!answer1.trim() || !answer2.trim()) {
      setErrorMessage('Please provide answers for both Security Questions.');
      return;
    }
    if (question1.trim().toLowerCase() === question2.trim().toLowerCase()) {
      setErrorMessage('Please pick 2 different Security Questions.');
      return;
    }

    // Only require existing PIN if user already has a Payment PIN configured
    if (hasExistingPin) {
      const check = verifyPaymentPinDetailed(questionPin);
      if (!check.success) {
        setErrorMessage(check.message || 'Current PIN verification required to update existing security questions.');
        return;
      }
    }

    const res = setSecurityQuestions([
      { question: question1, answer: answer1.trim() },
      { question: question2, answer: answer2.trim() },
    ]);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setQuestionPin('');
    setSavedSuccessMessage(res.message);
    if (!hasExistingPin) {
      setActiveTab('pin');
    }
    setTimeout(() => setSavedSuccessMessage(null), 4500);
  };

  return (
    <div
      onClick={() => setIsSecurityModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                Payment PIN & Security Questions
              </h3>
              <p className="text-[10px] text-slate-400">
                Set 2 recovery questions first, then create your 4-digit PIN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSecurityModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lockout Banner */}
        {lockoutRemaining !== null && lockoutRemaining > 0 && (
          <div className="mx-4 mt-3 p-3 bg-rose-600 text-white rounded-2xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 text-xs font-semibold">
            <Clock className="w-4 h-4 shrink-0 animate-spin" />
            <span>Anti-Fraud Lockout Active: Please wait {lockoutRemaining}s before attempting again.</span>
          </div>
        )}

        {/* Success Alert */}
        {savedSuccessMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-600 text-white rounded-2xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedSuccessMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-red-500 text-white rounded-2xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('questions');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'questions'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>1. Security Questions (2)</span>
            {hasTwoQuestions && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setIsForgotPinMode(false);
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pin'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>2. Payment PIN</span>
            {hasExistingPin && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'questions' && (
            <form onSubmit={handleUpdateQuestions} className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Step 1: Set 2 Security Questions</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  You must configure 2 Security Questions & Answers before creating your Payment PIN. If you ever forget your PIN, you&apos;ll answer both questions to reset it.
                </p>
              </div>

              <div className="space-y-3">
                {/* Question 1 */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-300">
                    Security Question 1
                  </label>
                  <select
                    value={question1}
                    onChange={(e) => setQuestion1(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {PRESET_SECURITY_QUESTIONS.map((q) => (
                      <option key={`q1_${q}`} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={answer1}
                    onChange={(e) => setAnswer1(e.target.value)}
                    placeholder="Enter your secret answer 1"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Question 2 */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-300">
                    Security Question 2 (Must be different)
                  </label>
                  <select
                    value={question2}
                    onChange={(e) => setQuestion2(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {PRESET_SECURITY_QUESTIONS.map((q) => (
                      <option key={`q2_${q}`} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={answer2}
                    onChange={(e) => setAnswer2(e.target.value)}
                    placeholder="Enter your secret answer 2"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {hasExistingPin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Authorize Change with Current 4-Digit Payment PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={questionPin}
                      onChange={(e) => setQuestionPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      required
                      disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                      className="w-full px-4 py-2 text-center text-lg font-bold tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
              >
                <span>{hasExistingPin ? 'Update 2 Security Questions' : 'Save Questions & Continue to PIN'}</span>
                {!hasExistingPin && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}

          {activeTab === 'pin' && !hasTwoQuestions && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  Security Questions Required First
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                  Before creating your 4-digit Payment PIN, please set up 2 Security Questions & Answers so your wallet stays recoverable.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setActiveTab('questions');
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors"
              >
                Set Up 2 Security Questions Now
              </button>
            </div>
          )}

          {activeTab === 'pin' && hasTwoQuestions && !isForgotPinMode && (
            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-xs text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>
                    {hasExistingPin ? 'Change Your 4-Digit Payment PIN' : 'Step 2: Create Your 4-Digit Payment PIN'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your personal 4-digit PIN protects transfers, sponsored ad payments, withdrawals, and escrow releases. Weak codes like 1234 or 0000 are rejected.
                </p>
              </div>

              <div className="space-y-3">
                {hasExistingPin && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Current 4-Digit PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setIsForgotPinMode(true);
                        }}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Forgot PIN?
                      </button>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      required
                      disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                      className="w-full px-4 py-2.5 text-center text-xl font-bold tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {hasExistingPin ? 'Enter New 4-Digit PIN' : 'Create 4-Digit Payment PIN'}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                    className="w-full px-4 py-2.5 text-center text-xl font-bold tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                    className="w-full px-4 py-2.5 text-center text-xl font-bold tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
              >
                {hasExistingPin ? 'Update Payment PIN' : 'Create Payment PIN'}
              </button>
            </form>
          )}

          {activeTab === 'pin' && hasTwoQuestions && isForgotPinMode && (
            <form onSubmit={handleForgotPinReset} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setIsForgotPinMode(false);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to PIN Update</span>
                </button>
                <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>PIN Recovery</span>
                </span>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                Answer both of your saved Security Questions below to reset your forgotten Payment PIN.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Q1: {configuredQuestions[0]?.question}
                  </label>
                  <input
                    type="text"
                    value={recoveryAnswer1}
                    onChange={(e) => setRecoveryAnswer1(e.target.value)}
                    placeholder="Enter answer 1"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Q2: {configuredQuestions[1]?.question}
                  </label>
                  <input
                    type="text"
                    value={recoveryAnswer2}
                    onChange={(e) => setRecoveryAnswer2(e.target.value)}
                    placeholder="Enter answer 2"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={recoveryNewPin}
                      onChange={(e) => setRecoveryNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      required
                      className="w-full px-3 py-2 text-center text-lg font-bold tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={recoveryConfirmPin}
                      onChange={(e) => setRecoveryConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      required
                      className="w-full px-3 py-2 text-center text-lg font-bold tracking-widest font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
              >
                Verify Answers & Reset Payment PIN
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

