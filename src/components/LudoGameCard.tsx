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
  Lock,
  Swords,
} from 'lucide-react';
import { LudoGameState } from '../types';
import { useApp, phonesMatch } from '../context/AppContext';
import {
  getLudoRulesConfig,
  getLudoSeedOffset,
  getLudoTrackIndex,
  getLegalLudoPlayState,
  isStepFinished,
} from '../utils/ludoRules';

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
  // Index 26: Castle B / Opposite start (1,8) moving down column 8
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Right arm top row moving right
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Right edge middle
  [7, 14],
  // Right arm bottom row moving left (Index 39: [8,13] = Amber Castle B start)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Bottom arm right column moving down
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom edge middle + bottom-left corner (Index 51: [14,6])
  [14, 7], [14, 6],
];

// Authentic Double-Dice Nigerian Ludo: ZERO safe squares on outer track!
export const LUDO_SAFE_TRACK_INDICES = new Set<number>();

// 4 Home Columns matching Bottom, Top, Left, Right arms
const PURPLE_HOME_COL_A: [number, number][] = [
  [13, 7], [12, 7], [11, 7], [10, 7], [9, 7],
];
const TOP_HOME_COL: [number, number][] = [
  [1, 7], [2, 7], [3, 7], [4, 7], [5, 7],
];
const AMBER_HOME_COL_A: [number, number][] = [
  [7, 1], [7, 2], [7, 3], [7, 4], [7, 5],
];
const AMBER_HOME_COL_B: [number, number][] = [
  [7, 13], [7, 12], [7, 11], [7, 10], [7, 9],
];

// Yard slots
const PURPLE_CASTLE_A_SLOTS: [number, number][] = [
  [10.8, 1.8], [10.8, 3.8], [12.8, 1.8], [12.8, 3.8],
];
const TOP_RIGHT_CASTLE_SLOTS: [number, number][] = [
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
  const isTwoHouse = totalSeeds > 4;
  const isCastleB = isTwoHouse && safeIdx >= 4;
  const localSlot = Math.max(0, Math.min(3, safeIdx % 4));

  // Yard (-1)
  if (!Number.isFinite(step) || step < 0) {
    const slots = !isTwoHouse
      ? isChallenger
        ? PURPLE_CASTLE_A_SLOTS
        : TOP_RIGHT_CASTLE_SLOTS
      : isChallenger
      ? isCastleB
        ? TOP_RIGHT_CASTLE_SLOTS
        : PURPLE_CASTLE_A_SLOTS
      : isCastleB
      ? AMBER_CASTLE_B_SLOTS
      : AMBER_CASTLE_A_SLOTS;
    const [r, c] = slots[localSlot] || slots[0];
    return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
  }

  // Finished Home (56)
  if (isStepFinished(step)) {
    const spread = (localSlot - 1.5) * 4.2;
    if (!isTwoHouse) {
      return isChallenger
        ? { cx: 150 + spread, cy: 170 }
        : { cx: 150 + spread, cy: 130 };
    }
    if (isChallenger) {
      return isCastleB
        ? { cx: 150 + spread, cy: 129 }
        : { cx: 150 + spread, cy: 171 };
    }
    return isCastleB
      ? { cx: 171, cy: 150 + spread }
      : { cx: 129, cy: 150 + spread };
  }

  // Private 5-tile Home Column (51..55)
  if (step >= 51 && step <= 55) {
    const colIdx = Math.max(0, Math.min(4, step - 51));
    const homeArr = !isTwoHouse
      ? isChallenger
        ? PURPLE_HOME_COL_A
        : TOP_HOME_COL
      : isChallenger
      ? isCastleB
        ? TOP_HOME_COL
        : PURPLE_HOME_COL_A
      : isCastleB
      ? AMBER_HOME_COL_B
      : AMBER_HOME_COL_A;
    const [r, c] = homeArr[colIdx] || homeArr[0];
    return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
  }

  // Shared 52-cell Outer Track (0..50 and 151 -> offset 51)
  const trackIdx = getLudoTrackIndex(step, safeIdx, isChallenger, totalSeeds);
  const [r, c] = LUDO_MAIN_TRACK[trackIdx ?? 0] || LUDO_MAIN_TRACK[0];
  return { cx: (c + 0.5) * cellSize, cy: (r + 0.5) * cellSize };
}

const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.26, 0.26],
    [0.5, 0.5],
    [0.74, 0.74],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.26, 0.26],
    [0.74, 0.26],
    [0.5, 0.5],
    [0.26, 0.74],
    [0.74, 0.74],
  ],
  6: [
    [0.28, 0.24],
    [0.72, 0.24],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.76],
    [0.72, 0.76],
  ],
};

interface SvgGraphicDieProps {
  x: number;
  y: number;
  size: number;
  value: number | null;
  used?: boolean;
  selected?: boolean;
  accentColor: string;
}

const SvgGraphicDie: React.FC<SvgGraphicDieProps> = ({
  x,
  y,
  size,
  value,
  used = false,
  selected = false,
  accentColor,
}) => {
  const pips = value && DIE_PIPS[value] ? DIE_PIPS[value] : [];
  const pipRadius = value === 1 ? size * 0.125 : size * 0.088;

  return (
    <g opacity={used ? 0.42 : 1}>
      {/* Subtle 3D drop shadow */}
      <rect
        x={x + 1}
        y={y + 1.5}
        width={size}
        height={size}
        rx={4.5}
        fill="#020617"
        opacity="0.45"
      />
      {/* Die body */}
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={4.5}
        fill={value === 6 ? '#fef9c3' : '#ffffff'}
        stroke={selected ? '#22c55e' : accentColor}
        strokeWidth={selected ? 2 : 1.4}
      />
      {value ? (
        <>
          {pips.map(([px, py], i) => (
            <circle
              key={i}
              cx={x + px * size}
              cy={y + py * size}
              r={pipRadius}
              fill={value === 6 ? '#b91c1c' : '#0f172a'}
            />
          ))}
        </>
      ) : (
        <text
          x={x + size / 2}
          y={y + size * 0.68}
          textAnchor="middle"
          fontSize={size * 0.55}
          fontWeight="900"
          fill="#64748b"
        >
          ?
        </text>
      )}
    </g>
  );
};

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

  const rules = useMemo(() => getLudoRulesConfig(game), [game]);

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

  const challengerList = game.challengerTokens || Array(rules.two_house_mode ? 8 : 4).fill(-1);
  const opponentList = game.opponentTokens || Array(rules.two_house_mode ? 8 : 4).fill(-1);
  const myTokens = isChallenger ? challengerList : opponentList;
  const totalSeeds = myTokens.length || (rules.two_house_mode ? 8 : 4);
  const isTwoHouse = totalSeeds > 4;
  const canRoll = isMyTurn && !game.hasRolled && !busy;

  const remainingDice = useMemo(() => {
    if (game.diceValues && game.diceValues.length > 0) return game.diceValues;
    if (game.diceValue && game.hasRolled) return [game.diceValue];
    return [];
  }, [game.diceValues, game.diceValue, game.hasRolled]);

  const legalState = useMemo(() => {
    if (!isMyTurn || !game.hasRolled || remainingDice.length === 0) {
      return null;
    }
    return getLegalLudoPlayState(game, isChallenger, remainingDice);
  }, [game, isChallenger, isMyTurn, remainingDice]);

  // Keep selected dieChoice valid & enforce Mandatory Play auto-selection
  useEffect(() => {
    if (!isMyTurn || !game.hasRolled || remainingDice.length === 0 || !legalState) {
      setDieChoice('die0');
      return;
    }
    const canD0 = legalState.playableDie0Tokens.size > 0;
    const canD1 = remainingDice.length > 1 && legalState.playableDie1Tokens.size > 0;
    const canComb = remainingDice.length === 2 && legalState.playableCombinedTokens.size > 0;

    if (dieChoice === 'die1' && !canD1) {
      if (canD0) setDieChoice('die0');
      else if (canComb) setDieChoice('combined');
    } else if (dieChoice === 'combined' && !canComb) {
      if (canD0) setDieChoice('die0');
      else if (canD1) setDieChoice('die1');
    } else if (dieChoice === 'die0' && !canD0) {
      if (canD1) setDieChoice('die1');
      else if (canComb) setDieChoice('combined');
    }
  }, [isMyTurn, game.hasRolled, remainingDice, legalState, dieChoice]);

  const isTokenPlayableWithChoice = (tokenIdx: number): boolean => {
    if (!legalState) return false;
    if (dieChoice === 'combined') return legalState.playableCombinedTokens.has(tokenIdx);
    if (dieChoice === 'die1') return legalState.playableDie1Tokens.has(tokenIdx);
    return legalState.playableDie0Tokens.has(tokenIdx);
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
    if (!isTokenPlayableWithChoice(tokenIndex)) {
      const reason = legalState?.reasonForBlockedToken(tokenIndex, dieChoice);
      if (reason) setFeedback(reason);
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await moveLudoToken(game, tokenIndex, dieChoice);
      if (!res.success && res.message) setFeedback(res.message);
    } finally {
      setBusy(false);
    }
  };

  const purpleHomeCount = challengerList.filter((s) => isStepFinished(s)).length;
  const amberHomeCount = opponentList.filter((s) => isStepFinished(s)).length;
  const purpleCaptures = game.challengerCaptures || 0;
  const amberCaptures = game.opponentCaptures || 0;

  // Compute coordinates + stack counts on outer track squares
  const { allSeedsWithCoords, stackBadges } = useMemo(() => {
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

    // Bucket tokens sharing the exact same board pixel coordinates
    const buckets = new Map<string, number[]>();
    const sideBuckets = new Map<string, { side: 'purple' | 'amber'; count: number; cx: number; cy: number }>();

    list.forEach((item, posIdx) => {
      if (item.step < 0 || isStepFinished(item.step)) return;
      const key = `${Math.round(item.cx)}_${Math.round(item.cy)}`;
      const arr = buckets.get(key) || [];
      arr.push(posIdx);
      buckets.set(key, arr);

      const sKey = `${item.side}_${key}`;
      const existing = sideBuckets.get(sKey);
      if (existing) {
        existing.count += 1;
      } else {
        sideBuckets.set(sKey, { side: item.side, count: 1, cx: item.cx, cy: item.cy });
      }
    });

    buckets.forEach((indices) => {
      if (indices.length <= 1) return;
      indices.forEach((posIdx, order) => {
        const angle = (order / indices.length) * Math.PI * 2;
        list[posIdx].cx += Math.cos(angle) * 3.6;
        list[posIdx].cy += Math.sin(angle) * 3.6;
      });
    });

    const badges = Array.from(sideBuckets.values()).filter((b) => b.count >= 2);
    return { allSeedsWithCoords: list, stackBadges: badges };
  }, [challengerList, opponentList]);

  // Center Board Graphic Dice Display values
  const centerDicePair: [number | null, number | null] = useMemo(() => {
    const pair = game.lastPlayedDice || game.rolledDice;
    if (pair && pair.length === 2) return [pair[0], pair[1]];
    if (game.diceValues && game.diceValues.length >= 2) {
      return [game.diceValues[0], game.diceValues[1]];
    }
    if (game.diceValues && game.diceValues.length === 1) {
      return [game.diceValues[0], null];
    }
    return [null, null];
  }, [game.lastPlayedDice, game.rolledDice, game.diceValues]);

  // Determine which of the two rolled dice have already been spent this turn
  const dieUsedFlags: [boolean, boolean] = useMemo(() => {
    if (!game.hasRolled || centerDicePair[0] === null || centerDicePair[1] === null) {
      return [false, false];
    }
    if (remainingDice.length >= 2) return [false, false];
    if (remainingDice.length === 1) {
      // One die spent, one remains
      if (remainingDice[0] === centerDicePair[0]) return [false, true];
      return [true, false];
    }
    return [true, true];
  }, [game.hasRolled, centerDicePair, remainingDice]);

  const activeTurnAccent = phonesMatch(game.currentTurnPhone, game.challengerPhone)
    ? '#7c3aed'
    : '#d97706';

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
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[10px] text-slate-400 dark:text-neutral-400 truncate">
          {rules.mandatory_capture_to_finish ? 'Capture Gate ON' : 'Open Home'} · Zero Safe Tiles
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmForfeit(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-[10px] font-bold transition-colors shrink-0"
        >
          <Flag className="w-3 h-3" />
          <span>Forfeit</span>
        </button>
      </div>
    );
  };

  const pendingTargetCoord =
    game.pendingStackTargetTrackIdx !== null &&
    game.pendingStackTargetTrackIdx !== undefined &&
    LUDO_MAIN_TRACK[game.pendingStackTargetTrackIdx]
      ? LUDO_MAIN_TRACK[game.pendingStackTargetTrackIdx]
      : null;

  const renderArenaBody = (full: boolean) => (
    <div className={full ? 'p-4 sm:p-6 space-y-3.5 max-w-lg w-full mx-auto' : 'p-3 space-y-2.5'}>
      {/* Player Legend + Eat & Gate Badges */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="px-2 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 font-bold truncate text-purple-700 dark:text-purple-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
              {game.challengerName}
            </span>
            <span className="font-mono tabular-nums font-black text-purple-600 shrink-0">
              {purpleHomeCount}/{challengerList.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-purple-600/80 dark:text-purple-300/80 font-semibold">
            <span className="inline-flex items-center gap-0.5">
              <Swords className="w-2.5 h-2.5" />
              <span>Eats: {purpleCaptures}</span>
            </span>
            {rules.mandatory_capture_to_finish && purpleCaptures === 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <Lock className="w-2.5 h-2.5" />
                <span>Need 1 Eat</span>
              </span>
            )}
          </div>
        </div>

        <div className="px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1.5 font-bold truncate text-amber-700 dark:text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              {game.opponentName || 'Opponent'}
            </span>
            <span className="font-mono tabular-nums font-black text-amber-600 shrink-0">
              {amberHomeCount}/{opponentList.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-amber-700/80 dark:text-amber-300/80 font-semibold">
            <span className="inline-flex items-center gap-0.5">
              <Swords className="w-2.5 h-2.5" />
              <span>Eats: {amberCaptures}</span>
            </span>
            {rules.mandatory_capture_to_finish && amberCaptures === 0 && (
              <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                <Lock className="w-2.5 h-2.5" />
                <span>Need 1 Eat</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 15x15 SVG Cross Board with Zero Safe Squares & Bold Center Graphic Dice */}
      <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-neutral-700 bg-white shadow-sm">
        <svg viewBox="0 0 300 300" className="w-full h-auto block select-none">
          <rect x="0" y="0" width="300" height="300" fill="#f8fafc" />

          {/* Top-Left Castle (Amber A in Two-House, neutral in 4-seed) */}
          <rect
            x="0"
            y="0"
            width="120"
            height="120"
            fill={isTwoHouse ? '#fef3c7' : '#f1f5f9'}
            stroke={isTwoHouse ? '#f59e0b' : '#cbd5e1'}
            strokeWidth="1.5"
          />
          <rect
            x="18"
            y="18"
            width="84"
            height="84"
            rx="12"
            fill="#ffffff"
            stroke={isTwoHouse ? '#f59e0b' : '#cbd5e1'}
          />
          {isTwoHouse && (
            <text x="10" y="13" fontSize="8" fontWeight="800" fill="#b45309">
              AMBER A
            </text>
          )}

          {/* Top-Right Castle (Purple B in Two-House, Amber in 4-seed) */}
          <rect
            x="180"
            y="0"
            width="120"
            height="120"
            fill={isTwoHouse ? '#ede9fe' : '#fef3c7'}
            stroke={isTwoHouse ? '#7c3aed' : '#f59e0b'}
            strokeWidth="1.5"
          />
          <rect
            x="198"
            y="18"
            width="84"
            height="84"
            rx="12"
            fill="#ffffff"
            stroke={isTwoHouse ? '#7c3aed' : '#f59e0b'}
          />
          <text
            x="248"
            y="13"
            fontSize="8"
            fontWeight="800"
            fill={isTwoHouse ? '#5b21b6' : '#b45309'}
          >
            {isTwoHouse ? 'PURPLE B' : 'AMBER'}
          </text>

          {/* Bottom-Left Castle (Purple A) */}
          <rect x="0" y="180" width="120" height="120" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
          <rect x="18" y="198" width="84" height="84" rx="12" fill="#ffffff" stroke="#7c3aed" />
          <text x="10" y="294" fontSize="8" fontWeight="800" fill="#5b21b6">
            {isTwoHouse ? 'PURPLE A' : 'PURPLE'}
          </text>

          {/* Bottom-Right Castle (Amber B in Two-House, neutral in 4-seed) */}
          <rect
            x="180"
            y="180"
            width="120"
            height="120"
            fill={isTwoHouse ? '#fef3c7' : '#f1f5f9'}
            stroke={isTwoHouse ? '#f59e0b' : '#cbd5e1'}
            strokeWidth="1.5"
          />
          <rect
            x="198"
            y="198"
            width="84"
            height="84"
            rx="12"
            fill="#ffffff"
            stroke={isTwoHouse ? '#f59e0b' : '#cbd5e1'}
          />
          {isTwoHouse && (
            <text x="250" y="294" fontSize="8" fontWeight="800" fill="#b45309">
              AMBER B
            </text>
          )}

          {/* Main 52-cell Outer Track (ZERO safe squares! Only spawn entry markers) */}
          {LUDO_MAIN_TRACK.map(([r, c], idx) => {
            const isPurpleStart = idx === 0 || (isTwoHouse && idx === 26);
            const isAmberStart = (!isTwoHouse && idx === 26) || (isTwoHouse && (idx === 13 || idx === 39));
            const fill = isPurpleStart
              ? '#ddd6fe'
              : isAmberStart
              ? '#fde68a'
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
                {(isPurpleStart || isAmberStart) && (
                  <polygon
                    points={`${c * 20 + 10},${r * 20 + 5} ${c * 20 + 15},${r * 20 + 10} ${c * 20 + 10},${r * 20 + 15} ${c * 20 + 5},${r * 20 + 10}`}
                    fill={isPurpleStart ? '#7c3aed' : '#d97706'}
                    opacity="0.35"
                  />
                )}
              </g>
            );
          })}

          {/* 4 Home Columns (Private Safe Columns) */}
          {PURPLE_HOME_COL_A.map(([r, c], i) => (
            <rect
              key={`pha_${i}`}
              x={c * 20}
              y={r * 20}
              width="20"
              height="20"
              fill="#c4b5fd"
              stroke="#7c3aed"
              strokeWidth="0.7"
            />
          ))}
          {TOP_HOME_COL.map(([r, c], i) => (
            <rect
              key={`thc_${i}`}
              x={c * 20}
              y={r * 20}
              width="20"
              height="20"
              fill={isTwoHouse ? '#c4b5fd' : '#fde68a'}
              stroke={isTwoHouse ? '#7c3aed' : '#d97706'}
              strokeWidth="0.7"
            />
          ))}
          {AMBER_HOME_COL_A.map(([r, c], i) => (
            <rect
              key={`aha_${i}`}
              x={c * 20}
              y={r * 20}
              width="20"
              height="20"
              fill={isTwoHouse ? '#fde68a' : '#e2e8f0'}
              stroke={isTwoHouse ? '#d97706' : '#cbd5e1'}
              strokeWidth="0.7"
            />
          ))}
          {AMBER_HOME_COL_B.map(([r, c], i) => (
            <rect
              key={`ahb_${i}`}
              x={c * 20}
              y={r * 20}
              width="20"
              height="20"
              fill={isTwoHouse ? '#fde68a' : '#e2e8f0'}
              stroke={isTwoHouse ? '#d97706' : '#cbd5e1'}
              strokeWidth="0.7"
            />
          ))}

          {/* Center Home Goal Triangles */}
          <rect x="120" y="120" width="60" height="60" fill="#ffffff" stroke="#94a3b8" />
          <polygon points="120,180 180,180 150,150" fill="#7c3aed" opacity="0.88" />
          <polygon
            points="120,120 180,120 150,150"
            fill={isTwoHouse ? '#7c3aed' : '#f59e0b'}
            opacity="0.88"
          />
          <polygon
            points="120,120 120,180 150,150"
            fill={isTwoHouse ? '#f59e0b' : '#cbd5e1'}
            opacity="0.88"
          />
          <polygon
            points="180,120 180,180 150,150"
            fill={isTwoHouse ? '#f59e0b' : '#cbd5e1'}
            opacity="0.88"
          />

          {/* Stack Assault Target Ring */}
          {pendingTargetCoord && (
            <rect
              x={pendingTargetCoord[1] * 20 + 1}
              y={pendingTargetCoord[0] * 20 + 1}
              width="18"
              height="18"
              rx="3"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.2"
              strokeDasharray="3 2"
            />
          )}

          {/* All Seeds */}
          {allSeedsWithCoords.map((seed) => {
            const isMine =
              (seed.side === 'purple' && isChallenger) ||
              (seed.side === 'amber' && !isChallenger && isOpponent);
            const clickable =
              isMine &&
              isMyTurn &&
              game.hasRolled &&
              remainingDice.length > 0 &&
              isTokenPlayableWithChoice(seed.idx) &&
              !busy;
            const isPurple = seed.side === 'purple';

            return (
              <g
                key={`${seed.side}_${seed.idx}`}
                onClick={() => isMine && isMyTurn && game.hasRolled && !busy && handleMoveToken(seed.idx)}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
              >
                {clickable && (
                  <circle
                    cx={seed.cx}
                    cy={seed.cy}
                    r="10"
                    fill="none"
                    stroke={isPurple ? '#7c3aed' : '#d97706'}
                    strokeWidth="2.2"
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
                  fontWeight="900"
                  fill={isPurple ? '#ffffff' : '#111827'}
                >
                  {seed.idx + 1}
                </text>
              </g>
            );
          })}

          {/* Protected Stack Badges (×2, ×3) on Outer Track */}
          {stackBadges.map((sb, i) => (
            <g key={`stk_${i}`} style={{ pointerEvents: 'none' }}>
              <rect
                x={sb.cx + 3}
                y={sb.cy - 11}
                width="12"
                height="9"
                rx="3"
                fill={sb.side === 'purple' ? '#4c1d95' : '#92400e'}
                stroke="#ffffff"
                strokeWidth="0.9"
              />
              <text
                x={sb.cx + 9}
                y={sb.cy - 4.3}
                textAnchor="middle"
                fontSize="6"
                fontWeight="900"
                fill="#ffffff"
              >
                ×{sb.count}
              </text>
            </g>
          ))}

          {/* CENTER BOARD GRAPHIC DICE DISPLAY (Bold Played Numbers & Faces right in Center) */}
          <g
            onClick={() => canRoll && handleRoll()}
            style={{ cursor: canRoll ? 'pointer' : 'default' }}
          >
            {/* Pulsing outer ring when active player can roll */}
            {canRoll && (
              <rect
                x="121.5"
                y="128.5"
                width="57"
                height="43"
                rx="9"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.2"
                strokeDasharray="4 2"
              />
            )}
            {/* High-contrast dark backdrop stage */}
            <rect
              x="123"
              y="130"
              width="54"
              height="40"
              rx="8"
              fill="#0f172a"
              fillOpacity="0.93"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            {/* Die 1 Graphic */}
            <SvgGraphicDie
              x={127}
              y={134}
              size={21}
              value={centerDicePair[0]}
              used={dieUsedFlags[0]}
              selected={game.hasRolled && dieChoice === 'die0' && !dieUsedFlags[0]}
              accentColor={activeTurnAccent}
            />
            {/* Die 2 Graphic */}
            <SvgGraphicDie
              x={152}
              y={134}
              size={21}
              value={centerDicePair[1]}
              used={dieUsedFlags[1]}
              selected={game.hasRolled && dieChoice === 'die1' && !dieUsedFlags[1]}
              accentColor={activeTurnAccent}
            />
            {/* BOLD PLAYED / ROLLED NUMBER BANNER AT CENTER BOTTOM */}
            <text
              x="150"
              y="166.5"
              textAnchor="middle"
              fontSize="10"
              fontWeight="900"
              letterSpacing="0.4"
              fill={
                canRoll
                  ? '#4ade80'
                  : centerDicePair[0] === 6 && centerDicePair[1] === 6
                  ? '#facc15'
                  : '#ffffff'
              }
            >
              {canRoll
                ? 'TAP ROLL'
                : centerDicePair[0] !== null && centerDicePair[1] !== null
                ? `${centerDicePair[0]}  •  ${centerDicePair[1]}`
                : centerDicePair[0] !== null
                ? `${centerDicePair[0]}`
                : '2 DICE'}
            </text>
          </g>
        </svg>
      </div>

      {/* 2-Dice & Mandatory Sequential Turn Controls */}
      {game.status === 'active' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/70 border border-slate-200 dark:border-neutral-700/60">
            <div className="min-w-0">
              <div className="text-[11px] font-bold truncate">
                {isMyTurn
                  ? game.hasRolled
                    ? game.pendingStackTargetTrackIdx != null
                      ? 'Stack Assault! Land 2nd seed on targeted block'
                      : legalState?.forcedHigherDie != null
                      ? `Mandatory: Play Higher Die (${legalState.forcedHigherDie})`
                      : `Rolled [${remainingDice.join(' & ')}] — tap a highlighted seed`
                    : (game.consecutiveSixes || 0) > 0
                    ? `Double-6 Bonus (${game.consecutiveSixes}/3)! Roll again`
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
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all tabular-nums ${
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

          {/* Interactive Sequential Die 1 / Die 2 / Combined Selector */}
          {isMyTurn && game.hasRolled && remainingDice.length > 0 && legalState && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={legalState.playableDie0Tokens.size === 0}
                onClick={() => setDieChoice('die0')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors tabular-nums ${
                  legalState.playableDie0Tokens.size === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-neutral-800 text-slate-400 border-slate-200 dark:border-neutral-700'
                    : dieChoice === 'die0'
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
                    disabled={legalState.playableDie1Tokens.size === 0}
                    onClick={() => setDieChoice('die1')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors tabular-nums ${
                      legalState.playableDie1Tokens.size === 0
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-neutral-800 text-slate-400 border-slate-200 dark:border-neutral-700'
                        : dieChoice === 'die1'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    Die 2 ({remainingDice[1]})
                  </button>
                  <button
                    type="button"
                    disabled={legalState.playableCombinedTokens.size === 0}
                    onClick={() => setDieChoice('combined')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors tabular-nums ${
                      legalState.playableCombinedTokens.size === 0
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-neutral-800 text-slate-400 border-slate-200 dark:border-neutral-700'
                        : dieChoice === 'combined'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    Both ({remainingDice[0] + remainingDice[1]})
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
            <div className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
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
                  ? 'Nigerian Rules · Double-6 Bonus Only'
                  : `${isTwoHouse ? '2-House' : '1-House'} · Zero Safe Tiles`}
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
                    : `Nigerian Rules · ${totalSeeds} Seeds`}
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
