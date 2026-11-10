import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Users,
  Coins,
  ArrowRight,
  Smartphone,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  Send,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReferralModal: React.FC = () => {
  const {
    referralProgram,
    isReferralModalOpen,
    setIsReferralModalOpen,
    claimReferralBonus,
    simulateInviteContact,
    formatPrice,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimToast, setClaimToast] = useState<string | null>(null);
  const [simName, setSimName] = useState('');
  const [simPhone, setSimPhone] = useState('+23480');
  const [simIsGenuine, setSimIsGenuine] = useState(true);
  const [showSimForm, setShowSimForm] = useState(false);

  if (!isReferralModalOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralProgram.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralProgram.referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareInvite = () => {
    const text = `Join me on AGC with zero-data chat, Escrow protection & artisan services! Use my invite code ${referralProgram.referralCode} to get started: ${referralProgram.referralLink}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Invite message copied! You can share it via SMS or Social Chat.');
    }
  };

  const handleClaim = () => {
    const res = claimReferralBonus();
    setClaimToast(res.message);
    setTimeout(() => setClaimToast(null), 3500);
  };

  const handleSimulateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim()) return;
    simulateInviteContact(simName.trim(), simPhone.trim(), simIsGenuine);
    setSimName('');
    setShowSimForm(false);
    alert(
      simIsGenuine
        ? `✅ Invited ${simName}! Contact verified OTP & funded wallet. ₦500 referral bonus unlocked!`
        : `⚠️ Invited ${simName} as unverified ghost number. Marked as 'Pending' until OTP and min ₦500 transaction are fulfilled.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-black text-slate-900 dark:text-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Invite & Earn ₦500</span>
                <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                  Anti-Ghost Protected
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Verified rewards for authentic active African community members
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReferralModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Toast Notice */}
          {claimToast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{claimToast}</span>
            </div>
          )}

          {/* Wallet Reward Card */}
          <div className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  Referral Reward Balance
                </span>
                <div className="text-3xl font-extrabold font-mono mt-1">
                  ₦{referralProgram.availableBonus.toLocaleString()}
                </div>
                <p className="text-[11px] text-emerald-100/90 mt-1">
                  Total lifetime earned: <span className="font-bold">₦{referralProgram.totalEarned.toLocaleString()}</span>
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
                <Coins className="w-6 h-6 text-amber-300" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
              <div className="text-[11px] text-emerald-100">
                ₦500 per friend who verifies & executes first deal
              </div>
              <button
                onClick={handleClaim}
                disabled={referralProgram.availableBonus <= 0}
                className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>Claim to Wallet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Referral Code & Quick Share Box */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                Your Unique Invite Code
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Share anywhere
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span>{referralProgram.referralCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <button
                onClick={handleShareInvite}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-neutral-400">
              <span className="truncate max-w-[260px] font-mono text-[10px]">
                {referralProgram.referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="text-slate-600 dark:text-neutral-300 font-semibold hover:text-emerald-500 shrink-0 ml-2"
              >
                {copiedLink ? 'Link Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Anti-Ghost Verification Conditions Checklist */}
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Anti-Ghost Fraud Safeguards (Mandatory Conditions)</span>
            </div>
            <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              To prevent fraudulent bot signups and inactive virtual SIM numbers, the ₦500 reward is only credited when your invitee satisfies genuine human criteria:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-amber-200 dark:border-amber-950/60 flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold block text-slate-800 dark:text-neutral-200">
                    1. Phone OTP
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    Active telco SIM SMS verified
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-amber-200 dark:border-amber-950/60 flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold block text-slate-800 dark:text-neutral-200">
                    2. Min ₦500 Top-up
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    Or first Escrow deal completed
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-black border border-amber-200 dark:border-amber-950/60 flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold block text-slate-800 dark:text-neutral-200">
                    3. Real Activity
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">
                    Chats or marketplace appointment
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Statistics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white block">
                {referralProgram.totalInvited}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Invites Sent
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                {referralProgram.activeVerifiedCount}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Active & Verified
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
              <span className="text-xl font-bold font-mono text-amber-500 block">
                {referralProgram.pendingCount}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Pending Actions
              </span>
            </div>
          </div>

          {/* Invited Friends List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Referred Members ({referralProgram.referredList.length})
                </h4>
              </div>

              <button
                onClick={() => setShowSimForm(!showSimForm)}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Test Invite Flow</span>
              </button>
            </div>

            {/* Test Simulation Drawer */}
            {showSimForm && (
              <form
                onSubmit={handleSimulateInvite}
                className="mb-3 p-3.5 bg-slate-100 dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 space-y-2.5 animate-in slide-in-from-top-2"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Simulate Inviting a Contact
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Friend's Name"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-black border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={simIsGenuine}
                      onChange={(e) => setSimIsGenuine(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Passes OTP & Funds ₦500 (Authentic User)</span>
                  </label>

                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Simulate
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100 dark:divide-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-black">
              {referralProgram.referredList.map((contact) => (
                <div key={contact.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-neutral-300">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        contact.name[0]
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {contact.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {contact.phone}
                        </span>
                      </div>

                      {/* Anti-fraud condition badges */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5 ${
                            contact.otpVerified
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-neutral-900 text-slate-400'
                          }`}
                        >
                          OTP: {contact.otpVerified ? '✓' : 'Pending'}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5 ${
                            contact.walletFundedOrTransacted
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-neutral-900 text-slate-400'
                          }`}
                        >
                          ₦500+: {contact.walletFundedOrTransacted ? '✓' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {contact.status === 'verified_active' ? (
                      <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>+₦500 Paid</span>
                      </span>
                    ) : contact.status === 'pending' ? (
                      <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] rounded-xl flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Pending Action</span>
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-xl flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Ghost Flagged</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {contact.joinedAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
