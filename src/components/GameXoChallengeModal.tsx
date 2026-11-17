import React, { useEffect, useState } from 'react';
import {
  X,
  Gamepad2,
  Coins,
  ShieldCheck,
  AlertCircle,
  Send,
  Trophy,
  Grid3X3,
  Layers,
  Dices,
  BadgeCheck,
  Lock,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  STANDARD_GAME_BET_LIMIT,
  VERIFIED_GAME_BET_LIMIT,
  VERIFIED_BADGE_MONTHLY_FEE,
} from '../types';

type SelectedGameType = 'xo' | 'whot' | 'ludo';

const GAME_OPTIONS: {
  id: SelectedGameType;
  label: string;
  tagline: string;
  desc: string;
  icon: React.ElementType;
  accent: string;
}[] = [
  {
    id: 'xo',
    label: 'X / O',
    tagline: 'Tic-Tac-Toe',
    desc: 'Classic 3x3 Tic-Tac-Toe live in chat. You play as X (first move) and your opponent plays as O.',
    icon: Grid3X3,
    accent: 'text-purple-500',
  },
  {
    id: 'whot',
    label: 'Whot!',
    tagline: 'Nigerian Cards',
    desc: 'Lightweight classic Whot! card game. Match shapes or numbers, drop Hold On / Pick Two / General Market & Whot 20!',
    icon: Layers,
    accent: 'text-amber-500',
  },
  {
    id: 'ludo',
    label: 'Ludo',
    tagline: '2-Player Board',
    desc: 'Fast lightweight 2-player Ludo race with 4 tokens per player, roll-6 bonus, safe stars, captures & Home finish!',
    icon: Dices,
    accent: 'text-emerald-500',
  },
];

const QUICK_BET_AMOUNTS = [500, 1000, 5000, 10000, 25000, 50000];

export const GameXoChallengeModal: React.FC = () => {
  const {
    isGameXoModalOpen,
    setIsGameXoModalOpen,
    activeChatId,
    chats,
    wallet,
    currency,
    CURRENCY_SYMBOLS,
    formatPrice,
    sendXoChallenge,
    sendWhotChallenge,
    sendLudoChallenge,
    setIsWalletModalOpen,
    getGameBetLimit,
    upgradeVerificationBadge,
  } = useApp();

  const [selectedGame, setSelectedGame] = useState<SelectedGameType>('xo');
  const [mode, setMode] = useState<'friendly' | 'bet'>('friendly');
  const [betInput, setBetInput] = useState<string>('1000');
  const [errorMsg, setErrorMsg] = useState<{
    text: string;
    insufficient?: boolean;
    requiresVerifiedBadge?: boolean;
  } | null>(null);
  const [badgeSuccessMsg, setBadgeSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentChat = chats.find(
    (c) =>
      c.id === activeChatId ||
      (activeChatId?.startsWith('dm_') && c.phone && activeChatId.includes(c.phone.replace(/\D/g, '')))
  );
  const resolvedChatId = currentChat?.id || activeChatId || '';
  const isAiChat = Boolean(currentChat?.isBot || resolvedChatId === 'chat_afribot_ai');

  useEffect(() => {
    if (isAiChat && mode === 'bet') {
      setMode('friendly');
      setErrorMsg(null);
    }
  }, [isAiChat, mode]);

  if (!isGameXoModalOpen) return null;

  const sym = CURRENCY_SYMBOLS[currency || 'NGN'] || '₦';
  const activeGameMeta = GAME_OPTIONS.find((g) => g.id === selectedGame) || GAME_OPTIONS[0];
  const effectiveMode: 'friendly' | 'bet' = isAiChat ? 'friendly' : mode;

  const { isVerified, maxBet } = getGameBetLimit();

  const parsedBet = effectiveMode === 'bet' ? Math.round(Number(betInput) || 0) : 0;
  const totalPot = effectiveMode === 'bet' ? parsedBet * 2 : 0;
  const platformFee = effectiveMode === 'bet' ? Math.round(totalPot * 0.01) : 0;
  const winnerPayout = totalPot - platformFee;

  const handleUpgradeBadge = () => {
    setErrorMsg(null);
    setBadgeSuccessMsg(null);
    const res = upgradeVerificationBadge('blue');
    if (!res.success) {
      setErrorMsg({
        text: res.message,
        insufficient: true,
      });
      return;
    }
    setBadgeSuccessMsg(
      `Verified Badge active! Your game bet limit is now ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}/game.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setBadgeSuccessMsg(null);
    if (!resolvedChatId) {
      setErrorMsg({ text: 'Open a chat before sending a game challenge.' });
      return;
    }
    if (effectiveMode === 'bet' && parsedBet < 50) {
      setErrorMsg({ text: `Minimum bet amount is ${sym}50.` });
      return;
    }
    if (effectiveMode === 'bet' && parsedBet > maxBet) {
      setErrorMsg({
        text: isVerified
          ? `Maximum bet per game is ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}.`
          : `Standard max bet is ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()} per game. Upgrade to Verified Badge (₦${VERIFIED_BADGE_MONTHLY_FEE.toLocaleString()}/mo) for a ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit!`,
        requiresVerifiedBadge: !isVerified,
      });
      return;
    }
    if (effectiveMode === 'bet' && wallet.availableBalance < parsedBet) {
      setErrorMsg({
        text: `Insufficient wallet balance (${formatPrice(wallet.availableBalance, currency)}). Need ${sym}${parsedBet.toLocaleString()} to lock your match stake.`,
        insufficient: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res =
        selectedGame === 'whot'
          ? await sendWhotChallenge(resolvedChatId, effectiveMode, parsedBet)
          : selectedGame === 'ludo'
          ? await sendLudoChallenge(resolvedChatId, effectiveMode, parsedBet)
          : await sendXoChallenge(resolvedChatId, effectiveMode, parsedBet);

      if (!res.success) {
        setErrorMsg({
          text: res.message || `Unable to send ${activeGameMeta.label} challenge.`,
          insufficient: res.insufficientFunds,
          requiresVerifiedBadge: res.requiresVerifiedBadge,
        });
        return;
      }
      setIsGameXoModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => setIsGameXoModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#161426] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-display">
                {isAiChat ? `Play ${activeGameMeta.label} vs Hard AI` : `Send ${activeGameMeta.label} Challenge`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeGameMeta.tagline} · {isAiChat ? 'Friendly Match · Hard AI Level' : `Live Multiplayer · vs ${currentChat?.name || 'Contact'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGameXoModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {badgeSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-medium">{badgeSuccessMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-200 space-y-2">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg.text}</span>
              </div>
              {(errorMsg.insufficient || errorMsg.requiresVerifiedBadge) && (
                <div className="flex flex-wrap gap-2 pl-6">
                  {errorMsg.requiresVerifiedBadge && !isVerified && (
                    <button
                      type="button"
                      onClick={handleUpgradeBadge}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap"
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>Verify Badge (₦{VERIFIED_BADGE_MONTHLY_FEE.toLocaleString()}/mo)</span>
                    </button>
                  )}
                  {errorMsg.insufficient && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsGameXoModalOpen(false);
                        setIsWalletModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0 whitespace-nowrap"
                    >
                      Top Up Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Game Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Choose Lightweight Game
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GAME_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const active = selectedGame === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedGame(opt.id);
                      setErrorMsg(null);
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                      active
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <IconComp className={`w-4 h-4 ${opt.accent}`} />
                      {active && (
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Segmented Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Match Type
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('friendly');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  effectiveMode === 'friendly'
                    ? 'bg-white dark:bg-[#231f3d] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-purple-500" />
                <span>Friendly (Free)</span>
              </button>
              <button
                type="button"
                disabled={isAiChat}
                onClick={() => {
                  if (isAiChat) return;
                  setMode('bet');
                  setErrorMsg(null);
                }}
                title={isAiChat ? 'AI Chat supports Friendly Hard-AI matches only' : 'Bet Match with Escrow'}
                className={`py-2.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  isAiChat
                    ? 'opacity-45 cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : effectiveMode === 'bet'
                    ? 'bg-white dark:bg-[#231f3d] text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isAiChat ? 'No Bet vs AI' : 'Bet Match (Escrow)'}</span>
              </button>
            </div>
          </div>

          {effectiveMode === 'friendly' ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {isAiChat ? `Friendly ${activeGameMeta.label} vs AgcBot` : `Friendly ${activeGameMeta.label} Match`}
                </span>
                {isAiChat && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600/15 text-purple-700 dark:text-purple-300 border border-purple-400/40 text-[10px] font-bold">
                    <Bot className="w-3 h-3" />
                    <span>HARD AI</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAiChat
                  ? `AgcBot plays ${activeGameMeta.label} at Hard AI difficulty — tactical moves, optimal blocks, and no mercy. Free friendly play in AI Chat!`
                  : activeGameMeta.desc}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Bet Limit Tier Banner */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
                  isVerified
                    ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70 text-sky-800 dark:text-sky-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <BadgeCheck
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isVerified ? 'text-sky-500' : 'text-amber-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-[11px] leading-tight">
                      {isVerified
                        ? `Verified Tier · Max Bet ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()}/game`
                        : `Standard Limit · Max ${sym}${STANDARD_GAME_BET_LIMIT.toLocaleString()}/game`}
                    </div>
                    <div className="text-[10px] opacity-85 mt-0.5">
                      {isVerified
                        ? 'Blue/Creator Verified Badge active — high-stakes matches unlocked.'
                        : `Get the Blue Verified Badge (₦${VERIFIED_BADGE_MONTHLY_FEE.toLocaleString()}/mo) to unlock ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} max bets.`}
                    </div>
                  </div>
                </div>
                {!isVerified && (
                  <button
                    type="button"
                    onClick={handleUpgradeBadge}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold shrink-0 whitespace-nowrap shadow-xs"
                  >
                    Verify ₦4k/mo
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Bet Amount Per Player ({currency})
                </span>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Wallet: <strong className="text-slate-900 dark:text-white">{formatPrice(wallet.availableBalance, currency)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                {QUICK_BET_AMOUNTS.map((amt) => {
                  const isLocked = amt > maxBet;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          setErrorMsg({
                            text: `${sym}${amt.toLocaleString()} bets require the Blue Verified Badge (₦${VERIFIED_BADGE_MONTHLY_FEE.toLocaleString()}/mo) for a ${sym}${VERIFIED_GAME_BET_LIMIT.toLocaleString()} limit.`,
                            requiresVerifiedBadge: true,
                          });
                          return;
                        }
                        setBetInput(String(amt));
                        setErrorMsg(null);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                        isLocked
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500'
                          : parsedBet === amt
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                      <span>{sym}{amt.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>

              <input
                type="number"
                min={50}
                max={maxBet}
                step={50}
                value={betInput}
                onChange={(e) => {
                  setBetInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={`Enter custom bet (${sym}50 - ${sym}${maxBet.toLocaleString()})`}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              {/* Pot & 1% Fee Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 tabular-nums">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Your Escrow Stake</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {sym}{parsedBet.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Total Match Pot (2 Players)</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {sym}{totalPot.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>System Fee (1% from winner&apos;s pot)</span>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    -{sym}{platformFee.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Winner Payout (99%)</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {sym}{winnerPayout.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Stakes are locked in escrow when each player accepts. Draws, declines, or cancellations automatically refund 100% of stakes.
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsGameXoModalOpen(false)}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Starting Match...'
                  : effectiveMode === 'bet'
                  ? `Send ${activeGameMeta.label} Bet (${sym}${parsedBet.toLocaleString()})`
                  : isAiChat
                  ? `Play ${activeGameMeta.label} vs Hard AI`
                  : `Send Friendly ${activeGameMeta.label}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
