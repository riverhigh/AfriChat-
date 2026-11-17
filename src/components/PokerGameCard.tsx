import React, { useState } from 'react';
import {
  Check,
  X,
  Trophy,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Bot,
  BadgeCheck,
  Coins,
} from 'lucide-react';
import { PokerCard, PokerGameState, PokerSuit } from '../types';
import { useApp, phonesMatch } from '../context/AppContext';

const SUIT_META: Record<PokerSuit, { symbol: string; color: string }> = {
  spades: { symbol: '♠', color: 'text-slate-900' },
  hearts: { symbol: '♥', color: 'text-rose-600' },
  diamonds: { symbol: '♦', color: 'text-rose-600' },
  clubs: { symbol: '♣', color: 'text-slate-900' },
};

function formatRank(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

const MiniPokerCard: React.FC<{
  card?: PokerCard;
  faceDown?: boolean;
  small?: boolean;
}> = ({ card, faceDown = false, small = false }) => {
  if (faceDown || !card) {
    return (
      <div
        className={`${
          small ? 'w-8 h-11' : 'w-10 h-14'
        } rounded-lg border border-emerald-300/40 bg-gradient-to-br from-emerald-800 to-teal-950 shadow-xs flex items-center justify-center text-emerald-200/70 font-black text-xs select-none`}
      >
        ♠
      </div>
    );
  }
  const meta = SUIT_META[card.suit] || SUIT_META.spades;
  const r = formatRank(card.rank);
  return (
    <div
      className={`${
        small ? 'w-8 h-11 p-1' : 'w-10 h-14 p-1.5'
      } rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between select-none ${
        meta.color
      }`}
    >
      <div className="text-[10px] font-black leading-none text-left">{r}</div>
      <div className={`${small ? 'text-xs' : 'text-sm'} leading-none text-center`}>
        {meta.symbol}
      </div>
      <div className="text-[10px] font-black leading-none text-right">{r}</div>
    </div>
  );
};

interface PokerGameCardProps {
  game: PokerGameState;
}

export const PokerGameCard: React.FC<PokerGameCardProps> = ({ game }) => {
  const {
    currentUser,
    acceptPokerChallenge,
    declinePokerChallenge,
    performPokerAction,
    setIsWalletModalOpen,
    upgradeVerificationBadge,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [requiresVerifiedBadge, setRequiresVerifiedBadge] = useState(false);

  const myPhone = currentUser.phoneNumber || currentUser.id;
  const isChallenger = phonesMatch(myPhone, game.challengerPhone);
  const isOpponent =
    !isChallenger &&
    (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));
  const isParticipant = isChallenger || isOpponent;

  const myHole = isChallenger ? game.challengerHole : game.opponentHole;
  const oppHole = isChallenger ? game.opponentHole : game.challengerHole;
  const myChips = isChallenger ? game.challengerChips : game.opponentChips;
  const oppChips = isChallenger ? game.opponentChips : game.challengerChips;
  const myBet = isChallenger ? game.challengerBet : game.opponentBet;
  const oppBet = isChallenger ? game.opponentBet : game.challengerBet;

  const isMyTurn =
    game.status === 'active' && phonesMatch(myPhone, game.currentTurnPhone);
  const toCall = Math.max(0, oppBet - myBet);
  const sym =
    game.currency === 'KES'
      ? 'KSh'
      : game.currency === 'GHS'
      ? 'GH₵'
      : game.currency === 'ZAR'
      ? 'R'
      : '₦';

  const oppName = isChallenger
    ? game.opponentName || 'Opponent'
    : game.challengerName || 'Challenger';
  const showOppHole =
    game.phase === 'showdown' && (game.status === 'won' || game.status === 'draw') && game.communityCards.length >= 5;

  const handleAccept = async () => {
    setBusy(true);
    setFeedback(null);
    setInsufficientFunds(false);
    setRequiresVerifiedBadge(false);
    try {
      const res = await acceptPokerChallenge(game);
      if (!res.success) {
        setFeedback(res.message || 'Unable to accept Poker challenge.');
        if (res.insufficientFunds) setInsufficientFunds(true);
        if (res.requiresVerifiedBadge) setRequiresVerifiedBadge(true);
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
      const res = await declinePokerChallenge(game);
      if (!res.success) setFeedback(res.message || 'Unable to close challenge.');
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (
    action: 'fold' | 'check' | 'call' | 'raise',
    raiseBy?: number
  ) => {
    if (!isMyTurn || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await performPokerAction(game, action, raiseBy);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const phaseLabel =
    game.phase === 'preflop'
      ? 'PRE-FLOP'
      : game.phase === 'flop'
      ? 'FLOP'
      : game.phase === 'turn'
      ? 'TURN'
      : game.phase === 'river'
      ? 'RIVER'
      : 'SHOWDOWN';

  return (
    <div className="w-full min-w-[268px] max-w-[332px] rounded-2xl overflow-hidden border border-emerald-500/40 bg-white dark:bg-neutral-900 shadow-lg text-slate-900 dark:text-white">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center font-black text-sm shrink-0">
            ♠
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold leading-tight truncate flex items-center gap-1.5">
              <span>Texas Hold&apos;em</span>
              {game.isAiOpponent && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-bold">
                  <Bot className="w-2.5 h-2.5" />
                  Hard AI
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-100 truncate">
              {game.mode === 'bet'
                ? `${sym}${game.betAmount.toLocaleString()} Stake · Pot ${sym}${game.winnerPayout.toLocaleString()}`
                : game.isAiOpponent
                ? 'Friendly Poker vs AgcBot (Hard)'
                : 'Friendly Table (Free)'}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 shrink-0">
          {game.status === 'pending'
            ? 'Pending'
            : game.status === 'active'
            ? phaseLabel
            : game.status.toUpperCase()}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Felt Table */}
        <div className="rounded-xl p-2.5 bg-gradient-to-b from-emerald-900 via-emerald-950 to-teal-950 border border-emerald-700/60 text-white space-y-2.5">
          {/* Opponent Seat */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-bold truncate">{oppName}</div>
              <div className="text-[10px] text-emerald-200/80 font-mono">
                {oppChips} chips {oppBet > 0 ? `· Bet ${oppBet}` : ''}
              </div>
              {showOppHole && (
                <div className="text-[9px] text-amber-300 font-semibold truncate">
                  {isChallenger ? game.opponentHandLabel : game.challengerHandLabel}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <MiniPokerCard
                small
                card={oppHole?.[0]}
                faceDown={!showOppHole}
              />
              <MiniPokerCard
                small
                card={oppHole?.[1]}
                faceDown={!showOppHole}
              />
            </div>
          </div>

          {/* Community Cards + Pot */}
          <div className="py-1.5 px-2 rounded-lg bg-black/25 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-emerald-200/90 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                POT: <strong className="font-mono text-amber-300">{game.pot}</strong>
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                {phaseLabel}
              </span>
            </div>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <MiniPokerCard
                  key={i}
                  small
                  card={game.communityCards?.[i]}
                  faceDown={!game.communityCards?.[i]}
                />
              ))}
            </div>
          </div>

          {/* Player Private Hole Cards */}
          {isParticipant && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <MiniPokerCard card={myHole?.[0]} />
                <MiniPokerCard card={myHole?.[1]} />
              </div>
              <div className="text-right min-w-0">
                <div className="text-[11px] font-bold truncate">You</div>
                <div className="text-[10px] text-emerald-200/80 font-mono">
                  {myChips} chips {myBet > 0 ? `· Bet ${myBet}` : ''}
                </div>
                {showOppHole && (
                  <div className="text-[9px] text-amber-300 font-semibold truncate">
                    {isChallenger ? game.challengerHandLabel : game.opponentHandLabel}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Note */}
        {game.lastActionNote && game.status === 'active' && (
          <div className="text-[10px] text-center text-slate-500 dark:text-neutral-400">
            {game.lastActionNote}
          </div>
        )}

        {/* Active Turn Controls */}
        {game.status === 'active' && isParticipant && (
          isMyTurn ? (
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction('fold')}
                className="py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-extrabold"
              >
                Fold
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleAction(toCall === 0 ? 'check' : 'call')}
                className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold shadow-xs"
              >
                {toCall === 0 ? 'Check' : `Call ${Math.min(myChips, toCall)}`}
              </button>
              <button
                type="button"
                disabled={busy || myChips <= toCall}
                onClick={() => handleAction('raise', 40)}
                className="py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-45 text-white text-[10px] font-extrabold shadow-xs"
              >
                +40
              </button>
              <button
                type="button"
                disabled={busy || myChips <= 0}
                onClick={() => handleAction('raise', myChips)}
                className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 text-[10px] font-extrabold shadow-xs"
              >
                All-In
              </button>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-[11px] font-semibold text-center text-slate-600 dark:text-neutral-300">
              Waiting for {game.currentTurnName}...
            </div>
          )
        )}

        {/* Showdown / Fold Result Banner */}
        {(game.status === 'won' || game.status === 'draw') && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs font-extrabold">
              <Trophy className="w-4 h-4" />
              <span>
                {game.status === 'draw'
                  ? 'Split Pot Draw!'
                  : phonesMatch(myPhone, game.winnerPhone)
                  ? 'You Won the Hand!'
                  : `${game.winnerName || 'Opponent'} Won!`}
              </span>
            </div>
            {game.winningHandLabel && (
              <div className="text-[11px] font-semibold text-slate-700 dark:text-neutral-200">
                {game.winningHandLabel}
              </div>
            )}
            {game.mode === 'bet' && (
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                {game.status === 'draw'
                  ? 'Stakes refunded (0% fee)'
                  : `Payout ${sym}${game.winnerPayout.toLocaleString()} released (1% fee)`}
              </div>
            )}
          </div>
        )}

        {(game.status === 'declined' || game.status === 'cancelled') && (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-center text-xs text-slate-500 dark:text-neutral-400">
            Challenge {game.status}. {game.mode === 'bet' ? 'Escrow stakes refunded.' : ''}
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0"
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
                  className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
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
