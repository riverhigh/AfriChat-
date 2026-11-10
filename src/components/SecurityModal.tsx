import React, { useState, useEffect } from 'react';
import { X, Lock, Key, ShieldCheck, CheckCircle2, HelpCircle, AlertTriangle, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

const PRESET_SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first primary school in Nigeria?",
  "What is your favorite African traditional dish (e.g. Amala, Jollof, Egusi)?",
  "What was your childhood street or neighborhood in Lagos/Accra?",
  "What is the nickname your grandmother called you?",
];

export const SecurityModal: React.FC = () => {
  const {
    isSecurityModalOpen,
    setIsSecurityModalOpen,
    securitySettings,
    updatePaymentPin,
    verifyPaymentPinDetailed,
    setSecurityQuestion,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pin' | 'questions'>('pin');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [questionPin, setQuestionPin] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(
    securitySettings.securityQuestion || PRESET_SECURITY_QUESTIONS[0]
  );
  const [securityAnswer, setSecurityAnswer] = useState(securitySettings.securityAnswer || '');
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

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

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccessMessage(null);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMessage('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('New PIN and Confirm PIN do not match.');
      return;
    }

    const res = updatePaymentPin(newPin, oldPin);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setNewPin('');
    setConfirmPin('');
    setOldPin('');
    setSavedSuccessMessage(res.message);
    setTimeout(() => setSavedSuccessMessage(null), 4000);
  };

  const handleUpdateQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccessMessage(null);

    if (!securityAnswer.trim()) {
      setErrorMessage('Please enter an answer for your security question.');
      return;
    }

    // Require current PIN authorization to update security questions
    const check = verifyPaymentPinDetailed(questionPin);
    if (!check.success) {
      setErrorMessage(check.message || 'Current PIN verification required to update security questions.');
      return;
    }

    setSecurityQuestion(selectedQuestion, securityAnswer.trim());
    setQuestionPin('');
    setSavedSuccessMessage('Security recovery question and answer successfully updated!');
    setTimeout(() => setSavedSuccessMessage(null), 4000);
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
                Wallet transaction authorization & account recovery
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
              setActiveTab('pin');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'pin'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Payment PIN (4 Digits)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('questions');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'questions'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Security Questions
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'pin' && (
            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-xs text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Wallet Transaction Protection</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your 4-digit PIN is strictly required before withdrawals, releasing escrow funds, or modifying security settings.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current 4-Digit PIN {securitySettings.paymentPin === '1234' && <span className="text-slate-400 font-normal">(Default is 1234)</span>}
                  </label>
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Enter New 4-Digit PIN
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
                    Confirm New 4-Digit PIN
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
                Save New Payment PIN
              </button>
            </form>
          )}

          {activeTab === 'questions' && (
            <form onSubmit={handleUpdateQuestions} className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800/60 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Account Recovery Questions</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Used to recover your wallet or change your PIN if you lose your phone or forget your code.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Security Question
                  </label>
                  <select
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {PRESET_SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Secret Answer
                  </label>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="e.g. Adebayo, St. Finbarrs, Amala and Gbegiri"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Authorize with Current Payment PIN
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
              </div>

              <button
                type="submit"
                disabled={lockoutRemaining !== null && lockoutRemaining > 0}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
              >
                Save Security Question & Answer
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
