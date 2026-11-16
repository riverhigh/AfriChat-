import React, { useState } from 'react';
import {
  Check,
  X,
  Dices,
  Trophy,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { LudoGameState } from '../types';
import { useApp, phonesMatch } from '../context/AppContext';

// 52-cell outer loop on 15x15 cross grid [row, col]
export const LUDO_MAIN_TRACK: [number, number][] = [
  // Index 0: Purple start (13,6) moving up column 6
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Left arm bottom row moving left
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // Left edge middle
  [7, 0],
  // Left arm top row moving right
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Top arm left column moving up
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Top edge middle
  [0, 7], [0, 8],
  // Index 26: Amber start (1,8) moving down column 8
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Right arm top row moving right
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Right edge middle
  [7, 14],
  // Right arm bottom row moving left
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Bottom arm right column moving down
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom edge middle + bottom-left corner
  [14, 7], [14, 6],
];

export const LUDO_SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const PURPLE_HOME_COL: [number, number][] = [
  [13, 7],
  [12, 7],
  [11, 7],
  [10, 7],
  [9, 7],
];

const AMBER_HOME_COL: [number, number][] = [
  [1, 7],
  [2, 7],
  [3, 7],
  [4, 7],
  [5, 7],
];

const PURPLE_YARD_SLOTS: [number, number][] = [
  [10.8, 1.8],
  [10.8, 3.8],
  [12.8, 1.8],
  [12.8, 3.8],
];

const AMBER_YARD_SLOTS: [number, number][] = [
  [1.8, 10.8],
  [1.8, 12.8],
  [3.8, 10.8],
  [3.8, 12.8],
];

function getTokenCenter(
  step: number,
  tokenIndex: number,
  isChallenger: boolean
): { cx: number; cy: number } {
  const cellSize = 20;
  if (step < 0) {
    const slots = isChallenger ? PURPLE_YARD_SLOTS : AMBER_YARD_SLOTS;
    const [r, c] = slots[tokenIndex];
    return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
  }
  if (step >= 56) {
    // Inside center home triangle
    const offset = (tokenIndex - 1.5) * 4;
    return isChallenger
      ? { cx: 150 + offset, cy: 162 }
      : { cx: 150 + offset, cy: 138 };
  }
  if (step >= 51) {
    const colIdx = step - 51;
    const homeArr = isChallenger ? PURPLE_HOME_COL : AMBER_HOME_COL;
    const [r, c] = homeArr[Math.min(4, colIdx)];
    return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
  }
  const offset = isChallenger ? 0 : 26;
  const trackIdx = (step + offset) % 52;
  const [r, c] = LUDO_MAIN_TRACK[trackIdx];
  return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
}

export function canMoveLudoToken(step: number, dice: number): boolean {
  if (step >= 56) return false;
  if (step < 0) return dice === 6;
  return step + dice <= 56;
}

interface LudoGameCardProps {
  game: LudoGameState;
}

export const LudoGameCard: React.FC<LudoGameCardProps> = ({ game }) => {
  const {
    currentUser,
    acceptLudoChallenge,
    declineLudoChallenge,
    rollLudoDice,
    moveLudoToken,
    setIsWalletModalOpen,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  const myPhone = currentUser.phoneNumber || currentUser.id;
  const isChallenger = phonesMatch(myPhone, game.challengerPhone);
  const isOpponent =
    !isChallenger &&
    (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));

  const isMyTurn =
    game.status === 'active' && phonesMatch(myPhone, game.currentTurnPhone);
  const sym =
    game.currency === 'KES'
      ? 'KSh'
      : game.currency === 'GHS'
      ? 'GH₵'
      : game.currency === 'ZAR'
      ? 'R'
      : '₦';

  const myTokens = isChallenger ? game.challengerTokens : game.opponentTokens;
  const canRoll = isMyTurn && !game.hasRolled && !busy;
  const dice = game.diceValue;

  const handleAccept = async () => {
    setBusy(true);
    setFeedback(null);
    setInsufficientFunds(false);
    try {
      const res = await acceptLudoChallenge(game);
      if (!res.success) {
        setFeedback(res.message || 'Unable to accept Ludo challenge.');
        if (res.insufficientFunds) setInsufficientFunds(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await declineLudoChallenge(game);
      if (!res.success) setFeedback(res.message || 'Unable to close challenge.');
    } finally {
      setBusy(false);
    }
  };

  const handleRoll = async () => {
    if (!canRoll) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await rollLudoDice(game);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMoveToken = async (tokenIndex: number) => {
    if (!isMyTurn || !game.hasRolled || !dice || busy) return;
    if (!canMoveLudoToken(myTokens[tokenIndex], dice)) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await moveLudoToken(game, tokenIndex);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const purpleHomeCount = (game.challengerTokens || []).filter((s) => s >= 56).length;
  const amberHomeCount = (game.opponentTokens || []).filter((s) => s >= 56).length;

  return (
    <div className="w-full min-w-[268px] max-w-[330px] rounded-2xl overflow-hidden border border-purple-300/60 dark:border-purple-700/50 bg-white dark:bg-neutral-900 shadow-lg text-slate-900 dark:text-white">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-700 via-violet-700 to-amber-500 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Dices className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold leading-tight truncate">
              Ludo Board Match
            </div>
            <div className="text-[10px] text-purple-100 truncate">
              {game.mode === 'bet'
                ? `${sym}${game.betAmount.toLocaleString()} Stake · Pot ${sym}${game.winnerPayout.toLocaleString()}`
                : 'Friendly Match (Free)'}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 shrink-0">
          {game.status === 'pending'
            ? 'Pending'
            : game.status === 'active'
            ? 'Live'
            : game.status.toUpperCase()}
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Player Legend */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 font-bold truncate text-purple-700 dark:text-purple-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
              {game.challengerName}
            </span>
            <span className="font-mono font-bold text-purple-600 shrink-0">
              {purpleHomeCount}/4
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 font-bold truncate text-amber-700 dark:text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              {game.opponentName || 'Opponent'}
            </span>
            <span className="font-mono font-bold text-amber-600 shrink-0">
              {amberHomeCount}/4
            </span>
          </div>
        </div>

        {/* 15x15 SVG Cross Board */}
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-neutral-700 bg-white">
          <svg viewBox="0 0 300 300" className="w-full h-auto block select-none">
            {/* Base Grid */}
            <rect x="0" y="0" width="300" height="300" fill="#f8fafc" />

            {/* 4 Corner Yards */}
            <rect x="0" y="0" width="120" height="120" fill="#e2e8f0" stroke="#cbd5e1" />
            <rect x="180" y="0" width="120" height="120" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="198" y="18" width="84" height="84" rx="12" fill="#ffffff" stroke="#f59e0b" />
            <rect x="0" y="180" width="120" height="120" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
            <rect x="18" y="198" width="84" height="84" rx="12" fill="#ffffff" stroke="#7c3aed" />
            <rect x="180" y="180" width="120" height="120" fill="#e2e8f0" stroke="#cbd5e1" />

            {/* Main 52-cell Track */}
            {LUDO_MAIN_TRACK.map(([r, c], idx) => {
              const isPurpleStart = idx === 0;
              const isAmberStart = idx === 26;
              const isSafe = LUDO_SAFE_TRACK_INDICES.has(idx);
              const fill = isPurpleStart
                ? '#7c3aed'
                : isAmberStart
                ? '#f59e0b'
                : isSafe
                ? '#e2e8f0'
                : '#ffffff';
              return (
                <g key={idx}>
                  <rect
                    x={c * 20}
                    y={r * 20}
                    width="20"
                    height="20"
                    fill={fill}
                    stroke="#cbd5e1"
                    strokeWidth="0.7"
                  />
                  {isSafe && !isPurpleStart && !isAmberStart && (
                    <circle cx={c * 20 + 10} cy={r * 20 + 10} r="3" fill="#94a3b8" />
                  )}
                </g>
              );
            })}

            {/* Purple & Amber Home Columns */}
            {PURPLE_HOME_COL.map(([r, c], i) => (
              <rect
                key={`ph_${i}`}
                x={c * 20}
                y={r * 20}
                width="20"
                height="20"
                fill="#c4b5fd"
                stroke="#7c3aed"
                strokeWidth="0.7"
              />
            ))}
            {AMBER_HOME_COL.map(([r, c], i) => (
              <rect
                key={`ah_${i}`}
                x={c * 20}
                y={r * 20}
                width="20"
                height="20"
                fill="#fde68a"
                stroke="#d97706"
                strokeWidth="0.7"
              />
            ))}

            {/* Center Home Goal */}
            <rect x="120" y="120" width="60" height="60" fill="#ffffff" stroke="#94a3b8" />
            <polygon points="120,180 180,180 150,150" fill="#7c3aed" opacity="0.85" />
            <polygon points="120,120 180,120 150,150" fill="#f59e0b" opacity="0.85" />
            <polygon points="120,120 120,180 150,150" fill="#cbd5e1" opacity="0.6" />
            <polygon points="180,120 180,180 150,150" fill="#cbd5e1" opacity="0.6" />

            {/* Challenger (Purple) Tokens */}
            {(game.challengerTokens || [-1, -1, -1, -1]).map((step, idx) => {
              const { cx, cy } = getTokenCenter(step, idx, true);
              const clickable =
                isChallenger &&
                isMyTurn &&
                game.hasRolled &&
                Boolean(dice) &&
                canMoveLudoToken(step, dice!) &&
                !busy;
              return (
                <g
                  key={`p_${idx}`}
                  onClick={() => clickable && handleMoveToken(idx)}
                  style={{ cursor: clickable ? 'pointer' : 'default' }}
                >
                  {clickable && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10.5"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="7.5"
                    fill="#7c3aed"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={cx}
                    y={cy + 2.8}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill="#ffffff"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Opponent (Amber) Tokens */}
            {(game.opponentTokens || [-1, -1, -1, -1]).map((step, idx) => {
              const { cx, cy } = getTokenCenter(step, idx, false);
              const clickable =
                !isChallenger &&
                isOpponent &&
                isMyTurn &&
                game.hasRolled &&
                Boolean(dice) &&
                canMoveLudoToken(step, dice!) &&
                !busy;
              return (
                <g
                  key={`a_${idx}`}
                  onClick={() => clickable && handleMoveToken(idx)}
                  style={{ cursor: clickable ? 'pointer' : 'default' }}
                >
                  {clickable && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10.5"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="7.5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={cx}
                    y={cy + 2.8}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill="#111827"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dice & Turn Controls */}
        {game.status === 'active' && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/70 border border-slate-200 dark:border-neutral-700/60">
            <div className="min-w-0">
              <div className="text-[11px] font-bold truncate">
                {isMyTurn
                  ? game.hasRolled
                    ? `Rolled ${dice}! Tap a highlighted token`
                    : 'Your turn — Roll the dice'
                  : `${game.currentTurnName}'s turn`}
              </div>
              {game.lastActionNote && (
                <div className="text-[10px] text-slate-500 dark:text-neutral-400 truncate">
                  {game.lastActionNote}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!canRoll}
              onClick={handleRoll}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${
                canRoll
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-neutral-700 text-slate-500 dark:text-neutral-300 cursor-not-allowed'
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>{game.hasRolled && dice ? `Dice: ${dice}` : 'Roll'}</span>
            </button>
          </div>
        )}

        {game.status === 'won' && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/70 dark:border-amber-700/50 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs font-extrabold">
              <Trophy className="w-4 h-4" />
              <span>
                {phonesMatch(myPhone, game.winnerPhone)
                  ? 'You Won Ludo!'
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
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {feedback}
            </span>
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
    </div>
  );
};
