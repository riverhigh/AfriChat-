import React, { useState } from 'react';
import {
  Check,
  X,
  Trophy,
  ShieldCheck,
  Layers,
  Hand,
  AlertCircle,
  Loader2,
  Sparkles,
  Bot,
  BadgeCheck,
} from 'lucide-react';
import { WhotCard, WhotGameState, WhotShape } from '../types';
import { useApp, phonesMatch } from '../context/AppContext';
import { isWhotCardPlayable } from '../utils/gameAiEngine';

const SHAPE_COLORS: Record<WhotShape, { text: string; bg: string; label: string }> = {
  circle: { text: 'text-rose-600', bg: 'bg-rose-50', label: 'Circle' },
  triangle: { text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Triangle' },
  cross: { text: 'text-sky-600', bg: 'bg-sky-50', label: 'Cross' },
  square: { text: 'text-amber-600', bg: 'bg-amber-50', label: 'Square' },
  star: { text: 'text-purple-700', bg: 'bg-purple-50', label: 'Star' },
  whot: { text: 'text-fuchsia-700', bg: 'bg-fuchsia-50', label: 'WHOT' },
};

const ACTION_TAG: Record<number, string> = {
  1: 'HOLD',
  2: '+2',
  5: '+3',
  8: 'SUSP',
  14: 'GEN',
  20: 'WILD',
};

const WhotShapeSvg: React.FC<{ shape: WhotShape; className?: string }> = ({
  shape,
  className = 'w-5 h-5',
}) => {
  switch (shape) {
    case 'circle':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <polygon points="12,3 22,20 2,20" />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <polygon points="12,2 15,9 22,9.5 16.5,14.5 18.2,21.5 12,17.8 5.8,21.5 7.5,14.5 2,9.5 9,9" />
        </svg>
      );
    case 'whot':
    default:
      return <Sparkles className={className} />;
  }
};

const WhotPlayingCard: React.FC<{
  card?: WhotCard | null;
  playable?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}> = ({ card, playable = false, disabled = false, compact = false, onClick }) => {
  if (!card) return null;
  const meta = SHAPE_COLORS[card.shape] || SHAPE_COLORS.circle;
  const displayNum = card.shape === 'whot' ? '20' : String(card.number ?? '');
  const tag = ACTION_TAG[card.shape === 'whot' ? 20 : card.number];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative rounded-xl border-2 bg-white shadow-sm flex flex-col justify-between transition-all select-none ${
        compact ? 'w-12 h-16 p-1.5' : 'w-14 h-20 p-1.5'
      } ${
        playable && !disabled
          ? 'border-purple-500 ring-2 ring-purple-400/50 -translate-y-1 hover:-translate-y-1.5 cursor-pointer shadow-md'
          : disabled
          ? 'border-slate-200 opacity-60 cursor-not-allowed'
          : 'border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-0.5">
        <span className={`text-[10px] font-black leading-none ${meta.text}`}>
          {displayNum}
        </span>
        {tag && (
          <span className="text-[7px] font-black leading-none px-1 py-0.5 rounded bg-slate-100 text-slate-600">
            {tag}
          </span>
        )}
      </div>
      <div className={`flex items-center justify-center ${meta.text}`}>
        <WhotShapeSvg shape={card.shape} className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
      </div>
      <div className={`text-[10px] font-black leading-none text-right ${meta.text}`}>
        {displayNum}
      </div>
    </button>
  );
};

interface WhotGameCardProps {
  game: WhotGameState;
}

export const WhotGameCard: React.FC<WhotGameCardProps> = ({ game }) => {
  const {
    currentUser,
    acceptWhotChallenge,
    declineWhotChallenge,
    playWhotCard,
    drawWhotCard,
    setIsWalletModalOpen,
    upgradeVerificationBadge,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [requiresVerifiedBadge, setRequiresVerifiedBadge] = useState(false);
  const [pendingWhotCard, setPendingWhotCard] = useState<WhotCard | null>(null);

  const myPhone = currentUser.phoneNumber || currentUser.id;
  const isChallenger = phonesMatch(myPhone, game.challengerPhone);
  const isOpponent =
    !isChallenger &&
    (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));

  const myHand = isChallenger ? game.challengerHand : game.opponentHand;
  const oppHandCount = isChallenger
    ? game.opponentHand?.length ?? 0
    : game.challengerHand?.length ?? 0;

  const isMyTurn =
    game.status === 'active' && phonesMatch(myPhone, game.currentTurnPhone);
  const pendingDraw = game.pendingDrawCount || 0;
  const sym =
    game.currency === 'KES'
      ? 'KSh'
      : game.currency === 'GHS'
      ? 'GH₵'
      : game.currency === 'ZAR'
      ? 'R'
      : '₦';

  const canPlayCard = (card: WhotCard): boolean => {
    if (!isMyTurn) return false;
    return isWhotCardPlayable(card, game);
  };

  const handleAccept = async () => {
    setBusy(true);
    setFeedback(null);
    setInsufficientFunds(false);
    setRequiresVerifiedBadge(false);
    try {
      const res = await acceptWhotChallenge(game);
      if (!res.success) {
        setFeedback(res.message || 'Could not accept Whot! challenge.');
        if ((res as { insufficientFunds?: boolean }).insufficientFunds) setInsufficientFunds(true);
        if ((res as { requiresVerifiedBadge?: boolean }).requiresVerifiedBadge) setRequiresVerifiedBadge(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUpgradeBadge = () => {
    const res = upgradeVerificationBadge('blue');
    if (!res.success) {
      setFeedback(res.message);
      setInsufficientFunds(true);
      setRequiresVerifiedBadge(false);
      return;
    }
    setRequiresVerifiedBadge(false);
    setInsufficientFunds(false);
    setFeedback('Verified Badge active! Tap Accept to join this match.');
  };

  const handleDecline = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await declineWhotChallenge(game);
      if (!res.success) setFeedback(res.message || 'Unable to close challenge.');
    } finally {
      setBusy(false);
    }
  };

  const handleCardTap = async (card: WhotCard) => {
    if (!canPlayCard(card) || busy) return;
    if (card.shape === 'whot' || card.number === 20) {
      setPendingWhotCard(card);
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await playWhotCard(game, card.id);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectWhotShape = async (shape: WhotShape) => {
    if (!pendingWhotCard || busy) return;
    const chosen = pendingWhotCard;
    setPendingWhotCard(null);
    setBusy(true);
    setFeedback(null);
    try {
      const res = await playWhotCard(game, chosen.id, shape);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDraw = async () => {
    if (!isMyTurn || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await drawWhotCard(game);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const oppName = isChallenger
    ? game.opponentName || 'Opponent'
    : game.challengerName || 'Challenger';

  return (
    <div className="w-full min-w-[260px] max-w-[330px] rounded-2xl overflow-hidden border border-purple-300/60 dark:border-purple-700/50 bg-white dark:bg-neutral-900 shadow-lg text-slate-900 dark:text-white">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-violet-700 via-purple-700 to-fuchsia-600 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-black text-[11px] shrink-0">
            W!
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold leading-tight truncate flex items-center gap-1.5">
              <span>Whot! Card Match</span>
              {game.isAiOpponent && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold">
                  <Bot className="w-2.5 h-2.5" />
                  Hard AI
                </span>
              )}
            </div>
            <div className="text-[10px] text-purple-100 truncate">
              {game.mode === 'bet'
                ? `${sym}${game.betAmount.toLocaleString()} Stake · Pot ${sym}${game.winnerPayout.toLocaleString()}`
                : game.isAiOpponent
                ? 'Friendly Match vs AgcBot (Hard)'
                : 'Friendly Match (Free)'}
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            game.status === 'active'
              ? 'bg-emerald-400/25 text-emerald-100'
              : game.status === 'won'
              ? 'bg-amber-400/30 text-amber-100'
              : 'bg-white/20 text-white'
          }`}
        >
          {game.status === 'pending'
            ? 'Pending'
            : game.status === 'active'
            ? 'Live'
            : game.status.toUpperCase()}
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Opponent Hand (Card Backs) */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/70 border border-slate-200/70 dark:border-neutral-700/60">
          <div className="min-w-0">
            <div className="text-[11px] font-bold truncate">{oppName}</div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-400">
              {oppHandCount} {oppHandCount === 1 ? 'card left (Last Card!)' : 'cards'}
            </div>
          </div>
          <div className="flex items-center -space-x-2">
            {Array.from({ length: Math.min(oppHandCount, 5) }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-8 rounded-md bg-gradient-to-br from-purple-700 to-fuchsia-700 border border-white/80 dark:border-neutral-900 shadow-xs flex items-center justify-center text-[8px] font-black text-white"
              >
                W
              </div>
            ))}
          </div>
        </div>

        {/* Center Call Card & Market */}
        {game.status !== 'pending' && (
          <div className="flex items-center justify-center gap-4 py-1">
            {/* Draw Market */}
            <button
              type="button"
              disabled={!isMyTurn || busy}
              onClick={handleDraw}
              className={`flex flex-col items-center justify-center w-16 h-20 rounded-xl border-2 transition-all ${
                isMyTurn && !busy
                  ? pendingDraw > 0
                    ? 'bg-gradient-to-br from-rose-600 to-amber-600 border-rose-300 text-white shadow-md hover:scale-105 cursor-pointer animate-pulse'
                    : 'bg-gradient-to-br from-purple-700 to-indigo-800 border-purple-400 text-white shadow-md hover:scale-105 cursor-pointer'
                  : 'bg-purple-900/40 border-purple-800/40 text-purple-200 opacity-70 cursor-not-allowed'
              }`}
              title={pendingDraw > 0 ? `Pick ${pendingDraw} penalty cards` : 'Draw from Market'}
            >
              <Layers className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-bold">
                {pendingDraw > 0 && isMyTurn ? `PICK ${pendingDraw}` : 'MARKET'}
              </span>
              <span className="text-[9px] font-mono opacity-85">
                {game.deck?.length ?? 0} left
              </span>
            </button>

            {/* Call Card */}
            <div className="flex flex-col items-center gap-1">
              <WhotPlayingCard card={game.topCard || { id: 'fallback_card', shape: 'circle', number: 1 }} />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400">
                {game.requestedShape
                  ? `Need: ${SHAPE_COLORS[game.requestedShape]?.label || game.requestedShape}`
                  : 'Call Card'}
              </span>
              {(game.reshuffleCount || 0) > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Reshuffled ×{game.reshuffleCount}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Whot 20 Shape Picker */}
        {pendingWhotCard && (
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 space-y-2">
            <div className="text-[11px] font-bold text-purple-800 dark:text-purple-200 text-center">
              Pick requested shape for WHOT (20)
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(['circle', 'triangle', 'cross', 'square', 'star'] as WhotShape[]).map((sh) => (
                <button
                  key={sh}
                  type="button"
                  onClick={() => handleSelectWhotShape(sh)}
                  className={`p-2 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 flex items-center justify-center hover:border-purple-500 ${SHAPE_COLORS[sh].text}`}
                  title={SHAPE_COLORS[sh].label}
                >
                  <WhotShapeSvg shape={sh} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Turn / Result Banner */}
        {game.status === 'active' && (
          <div
            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold text-center ${
              isMyTurn
                ? pendingDraw > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300'
            }`}
          >
            {isMyTurn
              ? pendingDraw > 0
                ? `Pick ${pendingDraw} or stack another ${
                    game.pendingDrawType === 'pick_three' ? '5 (Pick 3)' : '2 (Pick 2)'
                  }!`
                : 'Your turn — play a matching card or draw'
              : `Waiting for ${game.currentTurnName}...`}
          </div>
        )}

        {game.lastActionNote && game.status === 'active' && (
          <div className="text-[10px] text-center text-slate-500 dark:text-neutral-400">
            {game.lastActionNote}
          </div>
        )}

        {game.status === 'won' && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs font-extrabold">
              <Trophy className="w-4 h-4" />
              <span>
                {phonesMatch(myPhone, game.winnerPhone)
                  ? 'You Won Whot!!'
                  : `${game.winnerName || 'Opponent'} Won!`}
              </span>
            </div>
            {game.mode === 'bet' && (
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                Payout {sym}
                {game.winnerPayout.toLocaleString()} released (1% fee)
              </div>
            )}
          </div>
        )}

        {(game.status === 'declined' || game.status === 'cancelled') && (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-center text-xs text-slate-500 dark:text-neutral-400">
            Challenge {game.status}. {game.mode === 'bet' ? 'Escrow stakes refunded.' : ''}
          </div>
        )}

        {/* My Hand (only visible to logged-in participant!) */}
        {game.status === 'active' && (isChallenger || isOpponent) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-neutral-400">
              <span>Your Hand ({myHand?.length ?? 0} cards)</span>
              {isMyTurn && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDraw}
                  className={`hover:underline flex items-center gap-1 ${
                    pendingDraw > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-purple-600 dark:text-purple-400'
                  }`}
                >
                  <Hand className="w-3 h-3" />
                  {pendingDraw > 0 ? `Pick ${pendingDraw}` : 'Draw'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1">
              {(myHand || []).map((card) => {
                const ok = canPlayCard(card);
                return (
                  <div key={card.id} className="shrink-0">
                    <WhotPlayingCard
                      card={card}
                      compact
                      playable={ok}
                      disabled={!ok || busy}
                      onClick={() => handleCardTap(card)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Accept/Decline Controls */}
        {game.status === 'pending' && (
          <div className="space-y-2">
            {game.mode === 'bet' && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Escrow locked by challenger · Winner takes {sym}
                  {game.winnerPayout.toLocaleString()}
                </span>
              </div>
            )}
            {isChallenger ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Waiting for opponent to accept...
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDecline}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : isOpponent ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDecline}
                  className="py-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-xs font-bold flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Decline
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAccept}
                  className="py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Accept{game.mode === 'bet' ? ` (${sym}${game.betAmount.toLocaleString()})` : ''}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {feedback && (
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
            {(requiresVerifiedBadge || insufficientFunds) && (
              <div className="flex flex-wrap gap-2 pl-5">
                {requiresVerifiedBadge && (
                  <button
                    type="button"
                    onClick={handleUpgradeBadge}
                    className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold inline-flex items-center gap-1"
                  >
                    <BadgeCheck className="w-3 h-3" />
                    <span>Verify (₦4k/mo)</span>
                  </button>
                )}
                {insufficientFunds && (
                  <button
                    type="button"
                    onClick={() => setIsWalletModalOpen(true)}
                    className="underline font-bold shrink-0"
                  >
                    Top Up
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
