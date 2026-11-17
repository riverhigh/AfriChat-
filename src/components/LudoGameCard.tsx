import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  X,
  Dices,
  Trophy,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Bot,
  BadgeCheck,
  Maximize2,
  ArrowLeft,
  Flag,
} from 'lucide-react';
import { LudoGameState } from '../types';
import { useApp, phonesMatch } from '../context/AppContext';
import {
  getLudoSeedOffset,
  canMoveLudoSingleDie,
  canMoveLudoCombinedDice,
} from '../utils/gameAiEngine';

// 52-cell outer loop on 15x15 cross grid [row, col]
export const LUDO_MAIN_TRACK: [number, number][] = [
  // Index 0: Purple Castle A start (13,6) moving up column 6
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Left arm bottom row moving left
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // Left edge middle
  [7, 0],
  // Left arm top row moving right (Index 13: [6,1] = Amber Castle A start)
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Top arm left column moving up
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Top edge middle
  [0, 7], [0, 8],
  // Index 26: Purple Castle B start (1,8) moving down column 8
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Right arm top row moving right
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Right edge middle
  [7, 14],
  // Right arm bottom row moving left (Index 39: [8,13] = Amber Castle B start)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Bottom arm right column moving down
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom edge middle + bottom-left corner
  [14, 7], [14, 6],
];

export const LUDO_SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 4 Home Columns matching Purple Castle A (bottom), Purple Castle B (top), Amber Castle A (left), Amber Castle B (right)
const PURPLE_HOME_COL_A: [number, number][] = [
  [13, 7], [12, 7], [11, 7], [10, 7], [9, 7],
];
const PURPLE_HOME_COL_B: [number, number][] = [
  [1, 7], [2, 7], [3, 7], [4, 7], [5, 7],
];
const AMBER_HOME_COL_A: [number, number][] = [
  [7, 1], [7, 2], [7, 3], [7, 4], [7, 5],
];
const AMBER_HOME_COL_B: [number, number][] = [
  [7, 13], [7, 12], [7, 11], [7, 10], [7, 9],
];

// Yard slots for 2 Castles per player (4 seeds each = 8 seeds per player)
const PURPLE_CASTLE_A_SLOTS: [number, number][] = [
  [10.8, 1.8], [10.8, 3.8], [12.8, 1.8], [12.8, 3.8],
];
const PURPLE_CASTLE_B_SLOTS: [number, number][] = [
  [1.8, 10.8], [1.8, 12.8], [3.8, 10.8], [3.8, 12.8],
];
const AMBER_CASTLE_A_SLOTS: [number, number][] = [
  [1.8, 1.8], [1.8, 3.8], [3.8, 1.8], [3.8, 3.8],
];
const AMBER_CASTLE_B_SLOTS: [number, number][] = [
  [10.8, 10.8], [10.8, 12.8], [12.8, 10.8], [12.8, 12.8],
];

function getTokenCenter(
  step: number,
  tokenIndex: number,
  isChallenger: boolean,
  totalSeeds: number
): { cx: number; cy: number } {
  const cellSize = 20;
  const safeIdx = Number.isFinite(tokenIndex) && tokenIndex >= 0 ? tokenIndex : 0;
  const isCastleB = totalSeeds > 4 && safeIdx >= 4;
  const localSlot = Math.max(0, Math.min(3, safeIdx % 4));

  if (!Number.isFinite(step) || step < 0) {
    const slots = isChallenger
      ? isCastleB
        ? PURPLE_CASTLE_B_SLOTS
        : PURPLE_CASTLE_A_SLOTS
      : isCastleB
      ? AMBER_CASTLE_B_SLOTS
      : AMBER_CASTLE_A_SLOTS;
    const [r, c] = slots[localSlot] || slots[0];
    return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
  }
  if (step >= 56) {
    const spread = (localSlot - 1.5) * 4.2;
    if (isChallenger) {
      return isCastleB
        ? { cx: 150 + spread, cy: 136 }
        : { cx: 150 + spread, cy: 164 };
    }
    return isCastleB
      ? { cx: 164, cy: 150 + spread }
      : { cx: 136, cy: 150 + spread };
  }
  if (step >= 51) {
    const colIdx = Math.max(0, Math.min(4, step - 51));
    const homeArr = isChallenger
      ? isCastleB
        ? PURPLE_HOME_COL_B
        : PURPLE_HOME_COL_A
      : isCastleB
      ? AMBER_HOME_COL_B
      : AMBER_HOME_COL_A;
    const [r, c] = homeArr[colIdx] || homeArr[0];
    return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
  }

  const offset = getLudoSeedOffset(safeIdx, isChallenger, totalSeeds);
  const trackIdx = (((Math.floor(step) + offset) % 52) + 52) % 52;
  const [r, c] = LUDO_MAIN_TRACK[trackIdx] || LUDO_MAIN_TRACK[0];
  return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
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
    forfeitLudoGame,
    setIsWalletModalOpen,
    upgradeVerificationBadge,
  } = useApp();

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [requiresVerifiedBadge, setRequiresVerifiedBadge] = useState(false);
  const [dieChoice, setDieChoice] = useState<'die0' | 'die1' | 'combined'>('die0');
  const [isFullMode, setIsFullMode] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);

  const myPhone = currentUser.phoneNumber || currentUser.id;
  const isChallenger = phonesMatch(myPhone, game.challengerPhone);
  const isOpponent =
    !isChallenger &&
    (!game.opponentPhone || phonesMatch(myPhone, game.opponentPhone));
  const isParticipant = isChallenger || isOpponent;

  useEffect(() => {
    if (game.status !== 'active') setConfirmForfeit(false);
  }, [game.status]);

  useEffect(() => {
    if (!isFullMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullMode]);

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

  const myTokens = (isChallenger ? game.challengerTokens : game.opponentTokens) || [];
  const totalSeeds = myTokens.length || 8;
  const canRoll = isMyTurn && !game.hasRolled && !busy;

  const remainingDice = useMemo(() => {
    if (game.diceValues && game.diceValues.length > 0) return game.diceValues;
    if (game.diceValue) return [game.diceValue];
    return [];
  }, [game.diceValues, game.diceValue]);

  // Keep selected dieChoice valid & auto-select a playable choice when a roll completes
  useEffect(() => {
    if (!isMyTurn || !game.hasRolled || remainingDice.length === 0) {
      setDieChoice('die0');
      return;
    }
    const tokens = myTokens || [];
    const canDie0 = tokens.some((s) => canMoveLudoSingleDie(s, remainingDice[0]));
    const canDie1 =
      remainingDice.length > 1 && tokens.some((s) => canMoveLudoSingleDie(s, remainingDice[1]));
    const canComb =
      remainingDice.length === 2 &&
      tokens.some((s) => canMoveLudoCombinedDice(s, remainingDice[0], remainingDice[1]));

    if (dieChoice === 'die1' && remainingDice.length < 2) {
      setDieChoice('die0');
    } else if (dieChoice === 'combined' && remainingDice.length < 2) {
      setDieChoice('die0');
    } else if (dieChoice === 'die0' && !canDie0) {
      if (canDie1) setDieChoice('die1');
      else if (canComb) setDieChoice('combined');
    }
  }, [isMyTurn, game.hasRolled, remainingDice, myTokens, dieChoice]);

  const isStepPlayableWithChoice = (step: number): boolean => {
    if (remainingDice.length === 0) return false;
    if (dieChoice === 'combined') {
      if (remainingDice.length < 2) return false;
      return canMoveLudoCombinedDice(step, remainingDice[0], remainingDice[1]);
    }
    const idx = dieChoice === 'die1' && remainingDice.length > 1 ? 1 : 0;
    return canMoveLudoSingleDie(step, remainingDice[idx]);
  };

  const handleAccept = async () => {
    setBusy(true);
    setFeedback(null);
    setInsufficientFunds(false);
    setRequiresVerifiedBadge(false);
    try {
      const res = await acceptLudoChallenge(game);
      if (!res.success) {
        setFeedback(res.message || 'Unable to accept Ludo challenge.');
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
      const res = await declineLudoChallenge(game);
      if (!res.success) setFeedback(res.message || 'Unable to close challenge.');
    } finally {
      setBusy(false);
    }
  };

  const handleForfeit = async () => {
    if (busy || game.status !== 'active') return;
    setBusy(true);
    setFeedback(null);
    setConfirmForfeit(false);
    try {
      const res = await forfeitLudoGame(game);
      if (!res.success && res.message) setFeedback(res.message);
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
    if (!isMyTurn || !game.hasRolled || remainingDice.length === 0 || busy) return;
    if (!isStepPlayableWithChoice(myTokens[tokenIndex])) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await moveLudoToken(game, tokenIndex, dieChoice);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const challengerList = game.challengerTokens || Array(8).fill(-1);
  const opponentList = game.opponentTokens || Array(8).fill(-1);
  const purpleHomeCount = challengerList.filter((s) => s >= 56).length;
  const amberHomeCount = opponentList.filter((s) => s >= 56).length;

  // Compute jitter for overlapping active seeds on the board
  const allSeedsWithCoords = useMemo(() => {
    const list: {
      side: 'purple' | 'amber';
      idx: number;
      step: number;
      cx: number;
      cy: number;
    }[] = [];

    challengerList.forEach((step, idx) => {
      const pos = getTokenCenter(step, idx, true, challengerList.length);
      list.push({ side: 'purple', idx, step, cx: pos.cx, cy: pos.cy });
    });
    opponentList.forEach((step, idx) => {
      const pos = getTokenCenter(step, idx, false, opponentList.length);
      list.push({ side: 'amber', idx, step, cx: pos.cx, cy: pos.cy });
    });

    const buckets = new Map<string, number[]>();
    list.forEach((item, posIdx) => {
      if (item.step < 0 || item.step >= 56) return;
      const key = `${Math.round(item.cx)}_${Math.round(item.cy)}`;
      const arr = buckets.get(key) || [];
      arr.push(posIdx);
      buckets.set(key, arr);
    });

    buckets.forEach((indices) => {
      if (indices.length <= 1) return;
      indices.forEach((posIdx, order) => {
        const angle = (order / indices.length) * Math.PI * 2;
        list[posIdx].cx += Math.cos(angle) * 3.5;
        list[posIdx].cy += Math.sin(angle) * 3.5;
      });
    });

    return list;
  }, [challengerList, opponentList]);

  const oppName = isChallenger
    ? game.opponentName || 'Opponent'
    : game.challengerName || 'Challenger';

  const renderForfeitBar = () => {
    if (game.status !== 'active' || !isParticipant) return null;
    if (confirmForfeit) {
      return (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-200 text-center">
            Forfeit match? {oppName} wins{game.mode === 'bet' ? ` (${sym}${game.winnerPayout.toLocaleString()})` : ''}.
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmForfeit(false)}
              className="py-1.5 px-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[11px] font-bold text-slate-700 dark:text-neutral-200"
            >
              Keep Playing
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleForfeit}
              className="py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1"
            >
              <Flag className="w-3 h-3" />
              <span>Confirm Forfeit</span>
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex justify-end pt-0.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmForfeit(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-[10px] font-bold transition-colors"
        >
          <Flag className="w-3 h-3" />
          <span>Forfeit</span>
        </button>
      </div>
    );
  };

  const renderArenaBody = (full: boolean) => (
      <div className={full ? 'p-4 sm:p-6 space-y-3.5 max-w-lg w-full mx-auto' : 'p-3 space-y-2.5'}>
        {/* Player Legend */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 font-bold truncate text-purple-700 dark:text-purple-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
              {game.challengerName}
            </span>
            <span className="font-mono font-bold text-purple-600 shrink-0">
              {purpleHomeCount}/{challengerList.length}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 font-bold truncate text-amber-700 dark:text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              {game.opponentName || 'Opponent'}
            </span>
            <span className="font-mono font-bold text-amber-600 shrink-0">
              {amberHomeCount}/{opponentList.length}
            </span>
          </div>
        </div>

        {/* 15x15 SVG Cross Board (All 4 Castles: Purple A/B diagonal, Amber A/B diagonal) */}
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-neutral-700 bg-white">
          <svg viewBox="0 0 300 300" className="w-full h-auto block select-none">
            <rect x="0" y="0" width="300" height="300" fill="#f8fafc" />

            {/* Top-Left: Amber Castle A */}
            <rect x="0" y="0" width="120" height="120" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="18" y="18" width="84" height="84" rx="12" fill="#ffffff" stroke="#f59e0b" />
            <text x="10" y="13" fontSize="8" fontWeight="800" fill="#b45309">AMBER A</text>

            {/* Top-Right: Purple Castle B */}
            <rect x="180" y="0" width="120" height="120" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
            <rect x="198" y="18" width="84" height="84" rx="12" fill="#ffffff" stroke="#7c3aed" />
            <text x="248" y="13" fontSize="8" fontWeight="800" fill="#5b21b6">PURPLE B</text>

            {/* Bottom-Left: Purple Castle A */}
            <rect x="0" y="180" width="120" height="120" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
            <rect x="18" y="198" width="84" height="84" rx="12" fill="#ffffff" stroke="#7c3aed" />
            <text x="10" y="294" fontSize="8" fontWeight="800" fill="#5b21b6">PURPLE A</text>

            {/* Bottom-Right: Amber Castle B */}
            <rect x="180" y="180" width="120" height="120" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="198" y="198" width="84" height="84" rx="12" fill="#ffffff" stroke="#f59e0b" />
            <text x="250" y="294" fontSize="8" fontWeight="800" fill="#b45309">AMBER B</text>

            {/* Main 52-cell Track */}
            {LUDO_MAIN_TRACK.map(([r, c], idx) => {
              const isPurpleStart = idx === 0 || idx === 26;
              const isAmberStart = idx === 13 || idx === 39;
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

            {/* All 4 Home Columns */}
            {[...PURPLE_HOME_COL_A, ...PURPLE_HOME_COL_B].map(([r, c], i) => (
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
            {[...AMBER_HOME_COL_A, ...AMBER_HOME_COL_B].map(([r, c], i) => (
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

            {/* Center Home Goal Triangles */}
            <rect x="120" y="120" width="60" height="60" fill="#ffffff" stroke="#94a3b8" />
            <polygon points="120,180 180,180 150,150" fill="#7c3aed" opacity="0.85" />
            <polygon points="120,120 180,120 150,150" fill="#7c3aed" opacity="0.85" />
            <polygon points="120,120 120,180 150,150" fill="#f59e0b" opacity="0.85" />
            <polygon points="180,120 180,180 150,150" fill="#f59e0b" opacity="0.85" />

            {/* All 16 Seeds (8 Purple + 8 Amber) */}
            {allSeedsWithCoords.map((seed) => {
              const isMine =
                (seed.side === 'purple' && isChallenger) ||
                (seed.side === 'amber' && !isChallenger && isOpponent);
              const clickable =
                isMine &&
                isMyTurn &&
                game.hasRolled &&
                remainingDice.length > 0 &&
                isStepPlayableWithChoice(seed.step) &&
                !busy;
              const isPurple = seed.side === 'purple';

              return (
                <g
                  key={`${seed.side}_${seed.idx}`}
                  onClick={() => clickable && handleMoveToken(seed.idx)}
                  style={{ cursor: clickable ? 'pointer' : 'default' }}
                >
                  {clickable && (
                    <circle
                      cx={seed.cx}
                      cy={seed.cy}
                      r="10"
                      fill="none"
                      stroke={isPurple ? '#7c3aed' : '#d97706'}
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  )}
                  <circle
                    cx={seed.cx}
                    cy={seed.cy}
                    r="6.8"
                    fill={isPurple ? '#7c3aed' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                  />
                  <text
                    x={seed.cx}
                    y={seed.cy + 2.4}
                    textAnchor="middle"
                    fontSize="6.5"
                    fontWeight="800"
                    fill={isPurple ? '#ffffff' : '#111827'}
                  >
                    {seed.idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 2-Dice & Split/Combined Turn Controls */}
        {game.status === 'active' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/70 border border-slate-200 dark:border-neutral-700/60">
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">
                  {isMyTurn
                    ? game.hasRolled
                      ? `Rolled [${remainingDice.join(' & ')}] — select mode & seed`
                      : 'Your turn — Roll 2 Dice'
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
                <span>
                  {game.hasRolled && remainingDice.length > 0
                    ? `${remainingDice.join(' + ')}`
                    : 'Roll 2'}
                </span>
              </button>
            </div>

            {/* Interactive Split vs Combined Dice Selector */}
            {isMyTurn && game.hasRolled && remainingDice.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDieChoice('die0')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    dieChoice === 'die0'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                  }`}
                >
                  Die 1 ({remainingDice[0]})
                </button>
                {remainingDice.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setDieChoice('die1')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                        dieChoice === 'die1'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                      }`}
                    >
                      Die 2 ({remainingDice[1]})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDieChoice('combined')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                        dieChoice === 'combined'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                      }`}
                    >
                      Combine ({remainingDice[0] + remainingDice[1]})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {renderForfeitBar()}

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
            {game.lastActionNote && (
              <div className="text-[11px] text-slate-600 dark:text-neutral-300">
                {game.lastActionNote}
              </div>
            )}
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
  );

  return (
    <>
      <div className="w-full min-w-[268px] max-w-[330px] rounded-2xl overflow-hidden border border-purple-300/60 dark:border-purple-700/50 bg-white dark:bg-neutral-900 shadow-lg text-slate-900 dark:text-white">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-700 via-violet-700 to-amber-500 text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Dices className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold leading-tight truncate flex items-center gap-1.5">
                <span>Ludo ({totalSeeds} Seeds · 2 Dice)</span>
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
                  ? 'Friendly 2-Castle vs AgcBot (Hard)'
                  : 'Friendly 2-Castle Match (Free)'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
              {game.status === 'pending'
                ? 'Pending'
                : game.status === 'active'
                ? 'Live'
                : game.status.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => setIsFullMode(true)}
              aria-label="Open Ludo Full Mode"
              title="Open Full Mode"
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {renderArenaBody(false)}
      </div>

      {isFullMode &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[75] bg-slate-950 text-white flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full Mode Header with Back Button */}
            <div
              className="px-4 py-3 bg-gradient-to-r from-indigo-800 via-violet-800 to-amber-600 border-b border-white/10 flex items-center justify-between gap-3 shrink-0"
              style={{ paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 8px), 12px)' }}
            >
              <button
                type="button"
                onClick={() => setIsFullMode(false)}
                className="min-h-[44px] px-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="min-w-0 text-center">
                <div className="text-sm font-black truncate">Ludo Arena</div>
                <div className="text-[11px] text-purple-100 truncate">
                  {game.mode === 'bet'
                    ? `${sym}${game.betAmount.toLocaleString()} Bet · Win ${sym}${game.winnerPayout.toLocaleString()}`
                    : 'Friendly 8-Seed Match'}
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 shrink-0">
                {game.status === 'active' ? 'Live' : game.status.toUpperCase()}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-950 text-slate-900 dark:text-white flex items-start justify-center">
              {renderArenaBody(true)}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
