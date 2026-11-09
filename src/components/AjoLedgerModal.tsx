import React, { useState } from 'react';
import {
  X,
  Coins,
  ShieldCheck,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Plus,
  BadgeCheck,
  Crown,
  Lock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AjoLedgerModal: React.FC = () => {
  const {
    isAjoModalOpen,
    setIsAjoModalOpen,
    activeAjoGroup,
    contributeToAjo,
    activeChatId,
    wallet,
    formatPrice,
    currentUser,
    upgradeVerificationBadge,
    createAjoGroup,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ledger' | 'host'>('ledger');
  const [notification, setNotification] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // New Ajo Form state
  const [newAjoName, setNewAjoName] = useState('Balogun Market Hustlers Circle');
  const [newAjoAmount, setNewAjoAmount] = useState<number>(50000);
  const [newAjoFrequency, setNewAjoFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [newAjoRounds, setNewAjoRounds] = useState<number>(10);
  const [newAjoRules, setNewAjoRules] = useState('All members must pay by 6:00 PM on cycle due date. Smart escrow holds funds until host disbursement.');

  if (!isAjoModalOpen) return null;

  const myMember = activeAjoGroup?.members?.find((m) => m.id === 'm1' || m.id === 'm_host');
  const hasPaidCurrent = myMember?.hasPaidCurrentCycle ?? false;

  const handlePayContribution = () => {
    if (!activeAjoGroup) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const res = contributeToAjo(
        activeChatId || 'chat_1',
        activeAjoGroup.id,
        activeAjoGroup.cycleContributionAmount
      );
      if (res.success) {
        setNotification(res.message);
        setTimeout(() => setNotification(null), 3500);
      } else {
        alert(res.message);
      }
    }, 600);
  };

  const handleUpgradeVerification = (badge: 'blue' | 'gold' | 'creator_plus') => {
    setIsProcessing(true);
    const res = upgradeVerificationBadge(badge);
    setIsProcessing(false);
    if (res.success) {
      setNotification(res.message);
      setTimeout(() => setNotification(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const handleCreateAjo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAjoName.trim()) {
      alert('Please enter an Ajo Club Name');
      return;
    }
    const res = createAjoGroup({
      name: newAjoName.trim(),
      cycleContributionAmount: newAjoAmount,
      frequency: newAjoFrequency,
      totalRounds: newAjoRounds,
      rules: newAjoRules,
    });

    if (res.success) {
      setNotification(res.message);
      setActiveTab('ledger');
      setTimeout(() => setNotification(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const isVerifiedHost = currentUser.verificationBadge === 'blue' || currentUser.verificationBadge === 'gold' || currentUser.verificationBadge === 'creator_plus';

  return (
    <div
      onClick={() => setIsAjoModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                  Ajo / Esusu Savings Club
                </h3>
                {currentUser.verificationBadge && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      currentUser.verificationBadge === 'gold'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    <BadgeCheck className="w-3 h-3" />
                    <span>{currentUser.verificationBadge === 'gold' ? 'Gold Host' : 'Blue Host'}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Rotational community savings with verified escrow safeguards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAjoModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tab Navigation: Active Ledger vs Host New Ajo */}
        <div className="grid grid-cols-2 p-1 mx-4 mt-3 bg-slate-100 dark:bg-neutral-900 rounded-xl text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ledger'
                ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Active Club Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('host')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'host'
                ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Host New Ajo</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {notification && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
          )}

          {activeTab === 'host' ? (
            /* Host New Ajo / Verification Checkmark Gateway */
            <div className="space-y-4">
              {!isVerifiedHost ? (
                /* Verification Gate Required */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Host Verification Checkmark Required</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      To host an Ajo / Esusu group and hold rotational community funds, hosts must have an active <strong>Blue Checkmark (₦4,000/mo · 2% platform fee)</strong> or <strong>Gold Creator Checkmark (₦11,000/mo)</strong> or <strong>Creator Plus (₦25,000/mo · 2% fee)</strong> to guarantee anti-default security.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Blue Checkmark Option (₦4,000 / month - 2% fee) */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-blue-200 dark:border-blue-900/40 relative overflow-hidden space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                            <BadgeCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                Blue Checkmark Host
                              </h4>
                              <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded-full">
                                2% Platform Fee
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                              ₦4,000 / month
                            </span>
                          </div>
                        </div>
                      </div>

                      <ul className="text-[11px] text-slate-600 dark:text-neutral-400 space-y-1 pl-1">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Blue Host badge on profile and group chat</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Host community rotational cycles (platform takes 2% on pot)</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Automated wallet deduction & smart escrow ledger</span>
                        </li>
                      </ul>

                      <button
                        type="button"
                        onClick={() => handleUpgradeVerification('blue')}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <BadgeCheck className="w-4 h-4" />
                        <span>Pay ₦4,000 & Get Blue Verified (2% fee)</span>
                      </button>
                    </div>

                    {/* Gold Checkmark Creator Option (₦11,000 / month - 5% fee) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent border border-amber-300 dark:border-amber-900/50 relative overflow-hidden space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
                            <Crown className="w-5 h-5 text-amber-100" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                Gold Creator Checkmark
                              </h4>
                              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full">
                                5% Fee on Earnings
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                              ₦11,000 / month
                            </span>
                          </div>
                        </div>
                      </div>

                      <ul className="text-[11px] text-slate-600 dark:text-neutral-400 space-y-1 pl-1">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Gold Creator Verified badge across app, chats & updates</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Host unlimited Ajo pots (platform takes 2%) + Creator Studio</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Platform charges 5% on all ticket, song & subscription earnings</span>
                        </li>
                      </ul>

                      <button
                        type="button"
                        onClick={() => handleUpgradeVerification('gold')}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-4 h-4 text-amber-200" />
                        <span>Pay ₦11,000 & Get Gold Creator Badge</span>
                      </button>
                    </div>

                    {/* Creator Plus Option (₦25,000 / month - 2% fee) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent border border-purple-300 dark:border-purple-800 relative overflow-hidden space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-xs">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                Creator Plus Plan
                              </h4>
                              <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded-full">
                                Only 2% Fee!
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                              ₦25,000 / month
                            </span>
                          </div>
                        </div>
                      </div>

                      <ul className="text-[11px] text-slate-600 dark:text-neutral-400 space-y-1 pl-1">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>Lowest platform fee: only 2% on all earnings + 2% on Ajo pots</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>Host unlimited high-limit Ajo pots with verified priority</span>
                        </li>
                      </ul>

                      <button
                        type="button"
                        onClick={() => handleUpgradeVerification('creator_plus')}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:opacity-95 active:scale-98 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-purple-200" />
                        <span>Pay ₦25,000 & Get Creator Plus (2% Fee)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Verified Host - Create Form */
                <form onSubmit={handleCreateAjo} className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 flex items-center gap-2.5">
                    <BadgeCheck className={`w-5 h-5 ${currentUser.verificationBadge === 'gold' || currentUser.verificationBadge === 'creator_plus' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div>
                      <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                        Verified {currentUser.verificationBadge === 'creator_plus' ? 'Creator Plus Host (2% fee)' : currentUser.verificationBadge === 'gold' ? 'Gold Creator Host (5% fee)' : 'Blue Ajo Host (2% fee)'}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        Authorized to host community smart escrow pots
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Ajo / Esusu Club Name
                    </label>
                    <input
                      type="text"
                      value={newAjoName}
                      onChange={(e) => setNewAjoName(e.target.value)}
                      placeholder="e.g. Balogun Traders Weekly Circle"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Cycle Contribution
                      </label>
                      <select
                        value={newAjoAmount}
                        onChange={(e) => setNewAjoAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      >
                        <option value={10000}>₦10,000 / cycle</option>
                        <option value={25000}>₦25,000 / cycle</option>
                        <option value={50000}>₦50,000 / cycle</option>
                        <option value={100000}>₦100,000 / cycle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={newAjoFrequency}
                        onChange={(e) => setNewAjoFrequency(e.target.value as 'weekly' | 'monthly')}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                      >
                        <option value="weekly">Weekly Rotation</option>
                        <option value="monthly">Monthly Rotation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Total Members / Rounds
                    </label>
                    <select
                      value={newAjoRounds}
                      onChange={(e) => setNewAjoRounds(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white"
                    >
                      <option value={5}>5 Members (5 Rounds)</option>
                      <option value={10}>10 Members (10 Rounds)</option>
                      <option value={12}>12 Members (12 Rounds)</option>
                    </select>
                  </div>

                  {/* Calculated Payout Pot Card */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block">Total Payout Pot / Round:</span>
                      <span className="text-base font-bold text-amber-900 dark:text-amber-200">
                        ₦{(newAjoAmount * newAjoRounds).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      {newAjoFrequency}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                      Smart Escrow Rules
                    </label>
                    <textarea
                      rows={2}
                      value={newAjoRules}
                      onChange={(e) => setNewAjoRules(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Launch Verified Ajo Club (₦{(newAjoAmount * newAjoRounds).toLocaleString()} Pot)</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Active Group Pot Hero Card & Ledger */
            activeAjoGroup ? (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-indigo-200">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      {activeAjoGroup.name}
                    </span>
                    <span className="font-mono bg-white/15 px-2 py-0.5 rounded-full text-[10px] text-amber-300 font-bold">
                      Round {activeAjoGroup.currentRound} of {activeAjoGroup.totalRounds}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-indigo-200 block">Total Round Payout Pot:</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-white">
                        ₦{activeAjoGroup.totalPoolPerRound.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-indigo-200 block">Each Member:</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        ₦{activeAjoGroup.cycleContributionAmount.toLocaleString()}/cycle
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-indigo-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Next Beneficiary: <strong>{activeAjoGroup.currentRecipientName}</strong></span>
                    </div>
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md text-[10px]">
                      {activeAjoGroup.nextPayoutDate}
                    </span>
                  </div>
                </div>

                {/* Contribution Action Banner */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Your Round {activeAjoGroup.currentRound} Status
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {hasPaidCurrent
                        ? `✓ ₦${activeAjoGroup.cycleContributionAmount.toLocaleString()} paid into group escrow`
                        : `Pending contribution: ₦${activeAjoGroup.cycleContributionAmount.toLocaleString()}`}
                    </div>
                  </div>

                  {hasPaidCurrent ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold font-mono text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePayContribution}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : `Pay ₦${activeAjoGroup.cycleContributionAmount.toLocaleString()} Now`}
                    </button>
                  )}
                </div>

                {/* Rotational Payout Roster */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    <span>Rotational Payout Schedule</span>
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      Transparent Ledger
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800">
                    {activeAjoGroup.members.map((member) => (
                      <div key={member.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold text-slate-400 text-xs w-4">
                            #{member.payoutPosition}
                          </span>
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {member.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Payout: {member.payoutDate}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {member.isReceivedPayout ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Collected
                            </span>
                          ) : member.hasPaidCurrentCycle ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              Paid Current
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rules & Guarantee Note */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Smart Escrow Rules</span>
                  </div>
                  <p className="leading-relaxed opacity-90">
                    {activeAjoGroup.rules}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-3">
                <Coins className="w-10 h-10 mx-auto text-amber-500" />
                <p>No active Ajo group found. Tap &ldquo;Host New Ajo&rdquo; above to launch a savings circle.</p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#121020] flex gap-2">
          <button
            type="button"
            onClick={() => setIsAjoModalOpen(false)}
            className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

