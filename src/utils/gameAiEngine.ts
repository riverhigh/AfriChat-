import {
  LudoGameState,
  PokerCard,
  PokerGameState,
  TicTacToeCell,
  WhotCard,
  WhotGameState,
  WhotShape,
} from '../types';
import {
  getLudoRulesConfig,
  getLudoSeedOffset,
  getLudoTrackIndex,
  getTokensAtTrackIndex,
  getLegalLudoPlayState,
  simulateLudoSingleDieStep,
  isStepOnOuterTrack,
  isStepFinished,
} from './ludoRules';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. X / O (TIC-TAC-TOE) HARD MINIMAX AI
// ═══════════════════════════════════════════════════════════════════════════════

const XO_WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function evaluateXoBoard(board: TicTacToeCell[], aiSymbol: 'X' | 'O'): 'ai' | 'human' | 'draw' | null {
  for (const [a, b, c] of XO_WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === aiSymbol ? 'ai' : 'human';
    }
  }
  if (!board.includes(null)) return 'draw';
  return null;
}

function minimaxXo(
  board: TicTacToeCell[],
  depth: number,
  isMaximizing: boolean,
  aiSymbol: 'X' | 'O',
  alpha: number,
  beta: number
): number {
  const result = evaluateXoBoard(board, aiSymbol);
  if (result === 'ai') return 10 - depth;
  if (result === 'human') return depth - 10;
  if (result === 'draw') return 0;

  const humanSymbol = aiSymbol === 'O' ? 'X' : 'O';

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiSymbol;
        const score = minimaxXo(board, depth + 1, false, aiSymbol, alpha, beta);
        board[i] = null;
        if (score > best) best = score;
        if (best > alpha) alpha = best;
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = humanSymbol;
        const score = minimaxXo(board, depth + 1, true, aiSymbol, alpha, beta);
        board[i] = null;
        if (score < best) best = score;
        if (best < beta) beta = best;
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function countXoSubtreeOutcomes(
  board: TicTacToeCell[],
  isAiTurn: boolean,
  aiSymbol: 'X' | 'O'
): { wins: number; draws: number; losses: number } {
  const result = evaluateXoBoard(board, aiSymbol);
  if (result === 'ai') return { wins: 1, draws: 0, losses: 0 };
  if (result === 'draw') return { wins: 0, draws: 1, losses: 0 };
  if (result === 'human') return { wins: 0, draws: 0, losses: 1 };

  const humanSymbol = aiSymbol === 'O' ? 'X' : 'O';
  const mover = isAiTurn ? aiSymbol : humanSymbol;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = mover;
      const sub = countXoSubtreeOutcomes(board, !isAiTurn, aiSymbol);
      board[i] = null;
      wins += sub.wins;
      draws += sub.draws;
      losses += sub.losses;
    }
  }
  return { wins, draws, losses };
}

function countImmediateXoThreats(board: TicTacToeCell[], symbol: 'X' | 'O'): number {
  let threats = 0;
  for (const [a, b, c] of XO_WIN_LINES) {
    const vals = [board[a], board[b], board[c]];
    const symCount = vals.filter((v) => v === symbol).length;
    const emptyCount = vals.filter((v) => v === null).length;
    if (symCount === 2 && emptyCount === 1) threats++;
  }
  return threats;
}

export function pickHardXoMove(board: TicTacToeCell[], aiSymbol: 'X' | 'O' = 'O'): number {
  const copy = [...board];
  const emptyCount = copy.filter((c) => c === null).length;

  // Empty board (AI starts first as X): corner openings create the sharpest fork traps
  if (emptyCount === 9) {
    const corners = [0, 2, 6, 8];
    return corners[Math.floor(Math.random() * corners.length)];
  }
  if (emptyCount === 8 && copy[4] === null) return 4;

  // Immediate 1-move win check first
  for (let i = 0; i < 9; i++) {
    if (copy[i] !== null) continue;
    copy[i] = aiSymbol;
    const isWin = evaluateXoBoard(copy, aiSymbol) === 'ai';
    copy[i] = null;
    if (isWin) return i;
  }

  const preferredOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  const scoredCandidates: {
    idx: number;
    score: number;
    trapScore: number;
  }[] = [];

  for (const idx of preferredOrder) {
    if (copy[idx] !== null) continue;
    copy[idx] = aiSymbol;
    const score = minimaxXo(copy, 0, false, aiSymbol, -Infinity, Infinity);
    const outcomes = countXoSubtreeOutcomes(copy, false, aiSymbol);
    const threats = countImmediateXoThreats(copy, aiSymbol);
    // Prioritize moves that never lose, create immediate double-threats/forks, and yield maximum win branches vs draws
    const totalLeaves = Math.max(1, outcomes.wins + outcomes.draws + outcomes.losses);
    const winRatio = (outcomes.wins - outcomes.losses * 4) / totalLeaves;
    const trapScore = winRatio * 100 + threats * 15 + outcomes.wins * 0.05;
    copy[idx] = null;
    scoredCandidates.push({ idx, score, trapScore });
  }

  if (scoredCandidates.length === 0) {
    return copy.findIndex((c) => c === null);
  }

  const maxScore = Math.max(...scoredCandidates.map((c) => c.score));
  const topCandidates = scoredCandidates
    .filter((c) => c.score === maxScore)
    .sort((a, b) => b.trapScore - a.trapScore);

  return topCandidates[0].idx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. WHOT! FULL RULES & HARD STRATEGY AI
//    - Stacking Pick 2 (2) and Pick 3 (5)
//    - Hold On (1), Suspension (8), General Market (14), Whot (20)
//    - Discard-pile memory (card counting) for reshuffled market probabilities
//    - Hold defense cards for Last Card threat; shed high-value Stars early
// ═══════════════════════════════════════════════════════════════════════════════

export function isWhotCardPlayable(card: WhotCard, game: WhotGameState): boolean {
  if (!card || !game) return false;
  const pending = game.pendingDrawCount || 0;
  if (pending > 0) {
    if (game.pendingDrawType === 'pick_three') return card.number === 5;
    if (game.pendingDrawType === 'pick_two') return card.number === 2;
    return false;
  }
  if (card.shape === 'whot' || card.number === 20) return true;
  if (game.requestedShape) return card.shape === game.requestedShape;
  if (!game.topCard) return true;
  return card.shape === game.topCard.shape || card.number === game.topCard.number;
}

export function pickHardWhotMove(
  game: WhotGameState,
  aiHand: WhotCard[],
  humanCardCount: number
): { action: 'play'; card: WhotCard; requestedShape?: WhotShape } | { action: 'draw' } {
  if (!game || !Array.isArray(aiHand) || aiHand.length === 0) return { action: 'draw' };
  const legal = aiHand.filter((c) => isWhotCardPlayable(c, game));
  if (legal.length === 0) return { action: 'draw' };

  // Discard-pile memory: track which suits have been heavily played vs likely in market/reshuffle
  const discardCounts: Record<Exclude<WhotShape, 'whot'>, number> = {
    circle: 0,
    triangle: 0,
    cross: 0,
    square: 0,
    star: 0,
  };
  (game.discardPile || []).forEach((c) => {
    if (c.shape !== 'whot') discardCounts[c.shape] += 1;
  });

  // Suit selection for Whot (20): pick the suit in AI hand with the most cards
  const pickBestRequestedShape = (remainingHand: WhotCard[]): WhotShape => {
    const handCounts: Record<Exclude<WhotShape, 'whot'>, number> = {
      circle: 0,
      triangle: 0,
      cross: 0,
      square: 0,
      star: 0,
    };
    const pointValue: Record<Exclude<WhotShape, 'whot'>, number> = {
      circle: 0,
      triangle: 0,
      cross: 0,
      square: 0,
      star: 0,
    };
    remainingHand.forEach((c) => {
      if (c.shape !== 'whot') {
        handCounts[c.shape] += 1;
        pointValue[c.shape] += c.shape === 'star' ? c.number * 2 : c.number;
      }
    });

    const maxSuitCount = Math.max(...Object.values(handCounts));
    let bestShape: Exclude<WhotShape, 'whot'> = 'circle';
    let bestVal = -Infinity;

    (Object.keys(handCounts) as Exclude<WhotShape, 'whot'>[]).forEach((sh) => {
      // Strictly prefer maximum count in hand; break ties with point shedding & card-counting probability
      const isMaxCountBonus = maxSuitCount > 0 && handCounts[sh] === maxSuitCount ? 100 : 0;
      const discardSupplyBonus = Math.min(discardCounts[sh], 8) * 0.15;
      const avoidSameShapePenalty = humanCardCount <= 2 && game.topCard?.shape === sh ? -0.4 : 0;
      const val =
        isMaxCountBonus +
        handCounts[sh] * 10 +
        pointValue[sh] * 0.05 +
        discardSupplyBonus +
        avoidSameShapePenalty;
      if (val > bestVal) {
        bestVal = val;
        bestShape = sh;
      }
    });
    return bestShape;
  };

  // Immediate win if 1 card left and playable
  if (aiHand.length === 1) {
    const card = legal[0];
    return {
      action: 'play',
      card,
      requestedShape: card.shape === 'whot' || card.number === 20 ? 'circle' : undefined,
    };
  }

  // If facing pending Pick 2 / Pick 3 stack, always defend/stack when legal card is available!
  if ((game.pendingDrawCount || 0) > 0) {
    const stackCard = legal[0];
    return { action: 'play', card: stackCard };
  }

  const nonDefenseOptions = legal.filter(
    (c) => c.number !== 2 && c.number !== 5 && c.number !== 8 && c.shape !== 'whot' && c.number !== 20
  );
  const humanThreatening = humanCardCount <= 2;

  let bestCard = legal[0];
  let bestScore = -Infinity;

  for (const card of legal) {
    const remaining = aiHand.filter((c) => c.id !== card.id);
    let score = 0;

    const isWhot = card.shape === 'whot' || card.number === 20;
    const isPickTwo = card.number === 2;
    const isPickThree = card.number === 5;
    const isSuspension = card.number === 8;
    const isHoldOn = card.number === 1;
    const isGeneralMarket = card.number === 14;

    if (isWhot) {
      if (remaining.length === 1) {
        score += 1100; // Sets up winning final card
      } else if (legal.every((c) => c.shape === 'whot' || c.number === 20)) {
        score += 150; // Only Whot cards are playable
      } else if (humanThreatening) {
        const nextShape = pickBestRequestedShape(remaining);
        score += nextShape !== game.topCard?.shape ? 320 : 60;
      } else {
        score -= 260; // Hold wild Whot (20) for emergencies or late game
      }
    } else {
      const followUps = remaining.filter(
        (r) =>
          r.shape === 'whot' ||
          r.number === 20 ||
          r.shape === card.shape ||
          r.number === card.number
      );

      // Defense cards: Hold Pick 2 (2), Pick 3 (5), and Suspension (8) unless human is at <= 2 cards or no safe alternative
      if (isPickThree || isPickTwo || isSuspension) {
        if (humanThreatening) {
          score += isPickThree ? 720 : isPickTwo ? 660 : 610;
        } else if (remaining.length <= 2) {
          score += 520;
        } else if (nonDefenseOptions.length > 0) {
          score -= 140; // Reserve defensive action card for Last Card block!
        } else {
          score += 110;
        }
        if ((isSuspension || isHoldOn) && followUps.length > 0) {
          score += 140 + followUps.length * 25;
        }
      } else if (isHoldOn || isGeneralMarket) {
        score += isGeneralMarket ? 330 : 240;
        if (humanThreatening && isGeneralMarket) score += 360;
        if (followUps.length > 0) score += 170 + followUps.length * 25;
        else if (isHoldOn) score -= 90;
      }

      // Connectivity in remaining hand
      const sameShapeCount = remaining.filter((r) => r.shape === card.shape).length;
      const sameNumCount = remaining.filter((r) => r.number === card.number).length;
      score += sameShapeCount * 42 + sameNumCount * 32;

      // Score Minimization: shed Stars (double penalty points!) and high numbers early
      const penaltyPoints = card.shape === 'star' ? card.number * 2 : card.number;
      score += penaltyPoints * 4.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  const remainingAfterBest = aiHand.filter((c) => c.id !== bestCard.id);
  const needsShape = bestCard.shape === 'whot' || bestCard.number === 20;

  return {
    action: 'play',
    card: bestCard,
    requestedShape: needsShape ? pickBestRequestedShape(remainingAfterBest) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. LUDO (DOUBLE-DICE NIGERIAN RULESET) & HARD AI TREE
// ═══════════════════════════════════════════════════════════════════════════════

export const LUDO_SAFE_TRACK_SET = new Set<number>();

export { getLudoSeedOffset };

export function canMoveLudoSingleDie(step: number, die: number): boolean {
  if (isStepFinished(step)) return false;
  if (step < 0) return die === 6;
  if (step === 151) return true;
  return step + die <= 56;
}

export function canMoveLudoCombinedDice(step: number, d1: number, d2: number): boolean {
  if (isStepFinished(step)) return false;
  if (step < 0) {
    if (d1 === 6) return 0 + d2 <= 56;
    if (d2 === 6) return 0 + d1 <= 56;
    return false;
  }
  if (step === 151) return true;
  return step + d1 + d2 <= 56;
}

export function hasAnyLegalLudoMove(
  tokens: number[],
  remainingDice: number[],
  game?: LudoGameState,
  isChallenger: boolean = true
): boolean {
  if (!Array.isArray(tokens) || !Array.isArray(remainingDice) || remainingDice.length === 0) {
    return false;
  }
  if (game) {
    return getLegalLudoPlayState(game, isChallenger, remainingDice).hasAnyLegalMove;
  }
  for (const die of remainingDice) {
    if (tokens.some((s) => canMoveLudoSingleDie(s, die))) return true;
  }
  if (remainingDice.length === 2) {
    const [d1, d2] = remainingDice;
    if (tokens.some((s) => canMoveLudoCombinedDice(s, d1, d2))) return true;
  }
  return false;
}

export interface LudoAiMovePlan {
  tokenIndex: number;
  dieChoice: 'die0' | 'die1' | 'combined';
}

interface LudoSimOutcome {
  aiTokens: number[];
  humanTokens: number[];
  captures: number;
  capturedValue: number;
  castleAExited: number;
  castleBExited: number;
  finishedNow: number;
  completedStackAssault: boolean;
  usedSplit: boolean;
  usedCombined: boolean;
}

function scoreLudoBoardState(
  sim: LudoSimOutcome,
  origAiTokens: number[],
  isAiChallenger: boolean,
  aiCapturesBefore: number
): number {
  let score = 0;

  // 1. Captures + Eat & Go Home (each capture removes an enemy AND finishes our seed!)
  score += sim.captures * 1650 + sim.capturedValue * 14;
  if (aiCapturesBefore === 0 && sim.captures > 0) {
    score += 750; // Unlocking Mandatory Capture Gate!
  }
  if (sim.completedStackAssault) {
    score += 450;
  }

  // 2. Finishing seeds directly into Home (56)
  score += sim.finishedNow * 1350;

  // Count stacks (2+ friendly seeds on same outer track tile = protected block!)
  const aiStackTracks = new Set<number>();
  const trackCounts = new Map<number, number>();
  for (let i = 0; i < sim.aiTokens.length; i++) {
    const t = getLudoTrackIndex(sim.aiTokens[i], i, isAiChallenger, sim.aiTokens.length);
    if (t !== null) {
      const next = (trackCounts.get(t) || 0) + 1;
      trackCounts.set(t, next);
      if (next >= 2) {
        aiStackTracks.add(t);
        score += 290; // Strong defensive stack bonus (no safe tiles exist on outer track!)
      }
    }
  }

  // Threat check for single exposed seeds
  const countThreatened = (aiToks: number[], humToks: number[]): number => {
    let threatPenalty = 0;
    const localCounts = new Map<number, number>();
    for (let i = 0; i < aiToks.length; i++) {
      const t = getLudoTrackIndex(aiToks[i], i, isAiChallenger, aiToks.length);
      if (t !== null) localCounts.set(t, (localCounts.get(t) || 0) + 1);
    }

    for (let i = 0; i < aiToks.length; i++) {
      const s = aiToks[i];
      const aiTrack = getLudoTrackIndex(s, i, isAiChallenger, aiToks.length);
      if (aiTrack === null) continue;
      // Stacked (2+) pieces cannot be captured by a single opponent token!
      if ((localCounts.get(aiTrack) || 0) >= 2) continue;

      for (let j = 0; j < humToks.length; j++) {
        const hs = humToks[j];
        const hTrack = getLudoTrackIndex(hs, j, !isAiChallenger, humToks.length);
        if (hTrack === null) continue;
        const dist = (aiTrack - hTrack + 52) % 52;
        if (dist >= 1 && dist <= 12) {
          threatPenalty += dist <= 6 ? 260 + (s === 151 ? 51 : s) * 3 : 95;
          break;
        }
      }
    }
    return threatPenalty;
  };

  const beforeThreat = countThreatened(origAiTokens, sim.humanTokens);
  const afterThreat = countThreatened(sim.aiTokens, sim.humanTokens);
  score += beforeThreat - afterThreat;

  // 3. Deployment across Castles
  const castleAActive = sim.aiTokens.slice(0, 4).filter((s) => s >= 0 && !isStepFinished(s)).length;
  const castleBActive = sim.aiTokens.slice(4, 8).filter((s) => s >= 0 && !isStepFinished(s)).length;
  const totalActiveBefore = origAiTokens.filter((s) => s >= 0 && !isStepFinished(s)).length;

  if (sim.castleAExited > 0 || sim.castleBExited > 0) {
    score += totalActiveBefore === 0 ? 920 : 540;
    if (sim.aiTokens.length > 4 && Math.abs(castleAActive - castleBActive) <= 1) {
      score += 170;
    }
  }

  // 4. Forward progress & home column safety
  for (let i = 0; i < sim.aiTokens.length; i++) {
    const s = sim.aiTokens[i];
    if (isStepFinished(s)) {
      score += 420;
    } else if (s >= 51 && s < 56) {
      score += 520 + (s - 50) * 38;
      if (s === 55) score -= 40;
    } else if (isStepOnOuterTrack(s)) {
      const progress = s === 151 ? 51 : s;
      score += progress * 4.0;
    }
  }

  if (sim.usedSplit && castleAActive > 0 && castleBActive > 0) score += 35;

  return score;
}

/**
 * Evaluates full Double-Dice Nigerian Ludo move tree strictly respecting Mandatory Play,
 * Zero Safe Tiles, Eat & Go Home, Stacking Blocks, Stack-vs-Stack Assaults, and Mandatory Capture Gate.
 */
export function pickHardLudoPlan(
  game: LudoGameState,
  remainingDice: number[],
  isAiChallenger: boolean = false
): LudoAiMovePlan | null {
  if (!game) return null;
  const aiTokens = isAiChallenger ? game.challengerTokens : game.opponentTokens;
  const humanTokens = isAiChallenger ? game.opponentTokens : game.challengerTokens;
  const aiCaptures = (isAiChallenger ? game.challengerCaptures : game.opponentCaptures) || 0;
  const rules = getLudoRulesConfig(game);

  if (
    !Array.isArray(aiTokens) ||
    !Array.isArray(humanTokens) ||
    !Array.isArray(remainingDice) ||
    remainingDice.length === 0
  ) {
    return null;
  }

  const legal = getLegalLudoPlayState(game, isAiChallenger, remainingDice);
  if (!legal.hasAnyLegalMove) return null;

  const pendingTarget = game.pendingStackTargetTrackIdx ?? null;
  const pendingAttacker = game.pendingStackAttackerIndex ?? null;

  // 1 die left
  if (remainingDice.length === 1) {
    const d = remainingDice[0];
    let bestPlan: LudoAiMovePlan | null = null;
    let bestScore = -Infinity;

    for (const i of legal.playableDie0Tokens) {
      const stepRes = simulateLudoSingleDieStep({
        myTokens: aiTokens,
        oppTokens: humanTokens,
        tokenIndex: i,
        dieVal: d,
        otherDieVal: null,
        isChallenger: isAiChallenger,
        rules,
        myCaptures: aiCaptures,
        pendingStackTargetTrackIdx: pendingTarget,
        pendingStackAttackerIndex: pendingAttacker,
      });
      if (!stepRes.valid) continue;

      const sim: LudoSimOutcome = {
        aiTokens: stepRes.nextMyTokens,
        humanTokens: stepRes.nextOppTokens,
        captures: stepRes.capturesGained,
        capturedValue: stepRes.capturesGained * 25,
        castleAExited: aiTokens[i] < 0 && stepRes.nextMyTokens[i] >= 0 && i < 4 ? 1 : 0,
        castleBExited: aiTokens[i] < 0 && stepRes.nextMyTokens[i] >= 0 && i >= 4 ? 1 : 0,
        finishedNow: stepRes.instantFinishedCount,
        completedStackAssault: stepRes.completedStackAssault,
        usedSplit: false,
        usedCombined: false,
      };
      const sc = scoreLudoBoardState(sim, aiTokens, isAiChallenger, aiCaptures);
      if (sc > bestScore) {
        bestScore = sc;
        bestPlan = { tokenIndex: i, dieChoice: 'die0' };
      }
    }
    return bestPlan;
  }

  // 2 dice available: pick the legal first move whose optimal 2nd-step continuation yields highest score
  let bestPlan: LudoAiMovePlan | null = null;
  let bestScore = -Infinity;

  const evaluateFirstDie = (firstDieIdx: 0 | 1) => {
    const firstDie = remainingDice[firstDieIdx];
    const secondDie = remainingDice[firstDieIdx === 0 ? 1 : 0];
    const dieChoice: 'die0' | 'die1' = firstDieIdx === 0 ? 'die0' : 'die1';
    const allowedFirst = firstDieIdx === 0 ? legal.playableDie0Tokens : legal.playableDie1Tokens;

    for (const i of allowedFirst) {
      const s1 = simulateLudoSingleDieStep({
        myTokens: aiTokens,
        oppTokens: humanTokens,
        tokenIndex: i,
        dieVal: firstDie,
        otherDieVal: secondDie,
        isChallenger: isAiChallenger,
        rules,
        myCaptures: aiCaptures,
        pendingStackTargetTrackIdx: pendingTarget,
        pendingStackAttackerIndex: pendingAttacker,
      });
      if (!s1.valid) continue;

      let foundSecond = false;
      for (let j = 0; j < s1.nextMyTokens.length; j++) {
        const s2 = simulateLudoSingleDieStep({
          myTokens: s1.nextMyTokens,
          oppTokens: s1.nextOppTokens,
          tokenIndex: j,
          dieVal: secondDie,
          otherDieVal: null,
          isChallenger: isAiChallenger,
          rules,
          myCaptures: aiCaptures + s1.capturesGained,
          pendingStackTargetTrackIdx: s1.nextPendingStackTarget,
          pendingStackAttackerIndex: s1.nextPendingAttacker,
        });
        if (!s2.valid) continue;
        foundSecond = true;

        const sim: LudoSimOutcome = {
          aiTokens: s2.nextMyTokens,
          humanTokens: s2.nextOppTokens,
          captures: s1.capturesGained + s2.capturesGained,
          capturedValue: (s1.capturesGained + s2.capturesGained) * 25,
          castleAExited:
            (aiTokens[i] < 0 && s1.nextMyTokens[i] >= 0 && i < 4 ? 1 : 0) +
            (s1.nextMyTokens[j] < 0 && s2.nextMyTokens[j] >= 0 && j < 4 ? 1 : 0),
          castleBExited:
            (aiTokens[i] < 0 && s1.nextMyTokens[i] >= 0 && i >= 4 ? 1 : 0) +
            (s1.nextMyTokens[j] < 0 && s2.nextMyTokens[j] >= 0 && j >= 4 ? 1 : 0),
          finishedNow: s1.instantFinishedCount + s2.instantFinishedCount,
          completedStackAssault: s2.completedStackAssault,
          usedSplit: i !== j,
          usedCombined: i === j,
        };
        const sc = scoreLudoBoardState(sim, aiTokens, isAiChallenger, aiCaptures);
        if (sc > bestScore) {
          bestScore = sc;
          bestPlan = { tokenIndex: i, dieChoice };
        }
      }

      if (!foundSecond) {
        const sim: LudoSimOutcome = {
          aiTokens: s1.nextMyTokens,
          humanTokens: s1.nextOppTokens,
          captures: s1.capturesGained,
          capturedValue: s1.capturesGained * 25,
          castleAExited: aiTokens[i] < 0 && s1.nextMyTokens[i] >= 0 && i < 4 ? 1 : 0,
          castleBExited: aiTokens[i] < 0 && s1.nextMyTokens[i] >= 0 && i >= 4 ? 1 : 0,
          finishedNow: s1.instantFinishedCount,
          completedStackAssault: s1.completedStackAssault,
          usedSplit: false,
          usedCombined: false,
        };
        const sc = scoreLudoBoardState(sim, aiTokens, isAiChallenger, aiCaptures) - 30;
        if (sc > bestScore) {
          bestScore = sc;
          bestPlan = { tokenIndex: i, dieChoice };
        }
      }
    }
  };

  evaluateFirstDie(0);
  evaluateFirstDie(1);

  return bestPlan;
}

// Unused helper export kept for lint cleanliness if referenced externally
export function getTokensAtTrackIdxForDebug(tokens: number[], trackIdx: number, isChallenger: boolean) {
  return getTokensAtTrackIndex(tokens, trackIdx, isChallenger);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TEXAS HOLD'EM POKER HAND EVALUATOR & 3-LAYER HARD AI
//    - Layer 1: Pre-Flop Starting Hand Strength
//    - Layer 2: Post-Flop 7-card -> Best 5-card Evaluator (Royal Flush..High Card)
//    - Layer 3: Pot Odds + Calibrated Bluff Frequency Behavioral Layer
// ═══════════════════════════════════════════════════════════════════════════════

export interface PokerHandEvaluation {
  category: number; // 9=Royal Flush .. 0=High Card
  tieBreakers: number[];
  label: string;
}

function rankName(r: number, plural = false): string {
  const map: Record<number, string> = {
    14: 'Ace',
    13: 'King',
    12: 'Queen',
    11: 'Jack',
    10: 'Ten',
    9: 'Nine',
    8: 'Eight',
    7: 'Seven',
    6: 'Six',
    5: 'Five',
    4: 'Four',
    3: 'Three',
    2: 'Two',
  };
  const base = map[r] || String(r);
  if (!plural) return base;
  return r === 6 ? 'Sixes' : `${base}s`;
}

function evaluate5Cards(five: PokerCard[]): PokerHandEvaluation {
  const ranks = five.map((c) => c.rank).sort((a, b) => b - a);
  const suits = five.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const uniqueRanksDesc = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniqueRanksDesc.length === 5) {
    if (uniqueRanksDesc[0] - uniqueRanksDesc[4] === 4) {
      straightHigh = uniqueRanksDesc[0];
    } else if (
      uniqueRanksDesc[0] === 14 &&
      uniqueRanksDesc[1] === 5 &&
      uniqueRanksDesc[2] === 4 &&
      uniqueRanksDesc[3] === 3 &&
      uniqueRanksDesc[4] === 2
    ) {
      straightHigh = 5; // Wheel straight A-2-3-4-5
    }
  }

  const freqMap = new Map<number, number>();
  for (const r of ranks) freqMap.set(r, (freqMap.get(r) || 0) + 1);
  const groups = Array.from(freqMap.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  if (isFlush && straightHigh === 14) {
    return { category: 9, tieBreakers: [14], label: 'Royal Flush' };
  }
  if (isFlush && straightHigh > 0) {
    return {
      category: 8,
      tieBreakers: [straightHigh],
      label: `Straight Flush (${rankName(straightHigh)} High)`,
    };
  }
  if (groups[0][1] === 4) {
    return {
      category: 7,
      tieBreakers: [groups[0][0], groups[1][0]],
      label: `Four of a Kind (${rankName(groups[0][0], true)})`,
    };
  }
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) {
    return {
      category: 6,
      tieBreakers: [groups[0][0], groups[1][0]],
      label: `Full House (${rankName(groups[0][0], true)} full of ${rankName(groups[1][0], true)})`,
    };
  }
  if (isFlush) {
    return {
      category: 5,
      tieBreakers: ranks,
      label: `Flush (${rankName(ranks[0])} High)`,
    };
  }
  if (straightHigh > 0) {
    return {
      category: 4,
      tieBreakers: [straightHigh],
      label: `Straight (${rankName(straightHigh)} High)`,
    };
  }
  if (groups[0][1] === 3) {
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: 3,
      tieBreakers: [groups[0][0], ...kickers],
      label: `Three of a Kind (${rankName(groups[0][0], true)})`,
    };
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const highPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups[2]?.[0] || 0;
    return {
      category: 2,
      tieBreakers: [highPair, lowPair, kicker],
      label: `Two Pair (${rankName(highPair, true)} & ${rankName(lowPair, true)})`,
    };
  }
  if (groups[0][1] === 2) {
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: 1,
      tieBreakers: [groups[0][0], ...kickers],
      label: `One Pair (${rankName(groups[0][0], true)})`,
    };
  }
  return {
    category: 0,
    tieBreakers: ranks,
    label: `High Card (${rankName(ranks[0])})`,
  };
}

export function comparePokerEvaluations(a: PokerHandEvaluation, b: PokerHandEvaluation): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tieBreakers.length, b.tieBreakers.length);
  for (let i = 0; i < len; i++) {
    const av = a.tieBreakers[i] || 0;
    const bv = b.tieBreakers[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function evaluateBest5PokerHand(cards: PokerCard[]): PokerHandEvaluation {
  if (cards.length <= 5) return evaluate5Cards(cards);
  let best: PokerHandEvaluation | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const ev = evaluate5Cards([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || comparePokerEvaluations(ev, best) > 0) {
              best = ev;
            }
          }
        }
      }
    }
  }
  return best!;
}

function scorePreFlopStrength(hole: PokerCard[]): number {
  if (hole.length < 2) return 0.3;
  const r1 = Math.max(hole[0].rank, hole[1].rank);
  const r2 = Math.min(hole[0].rank, hole[1].rank);
  const suited = hole[0].suit === hole[1].suit;
  const gap = r1 - r2;

  if (r1 === r2) {
    // Pocket pairs: 2-2 (~0.62) up to A-A (~0.98)
    return Math.min(0.98, 0.56 + (r1 / 14) * 0.42);
  }
  let score = (r1 * 2 + r2) / 42; // 0.14 .. 0.95
  if (suited) score += 0.08;
  if (gap <= 1) score += 0.06;
  else if (gap === 2) score += 0.03;
  else if (gap >= 5 && r1 < 12) score -= 0.08; // Weak disconnected rags (e.g., 2-7 offsuit)
  if (r1 === 14 && r2 >= 10) score += 0.1;
  return Math.max(0.05, Math.min(0.94, score));
}

function estimateDrawBonus(hole: PokerCard[], community: PokerCard[]): number {
  const combined = [...hole, ...community];
  if (combined.length >= 7) return 0;
  let bonus = 0;

  // Flush draw (4 of a suit with hole participation)
  for (const s of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
    const suitCards = combined.filter((c) => c.suit === s);
    if (suitCards.length === 4 && hole.some((h) => h.suit === s)) {
      bonus += 0.16;
    }
  }

  // Open-ended straight draw (4 consecutive unique ranks)
  const uniq = Array.from(new Set(combined.map((c) => c.rank))).sort((a, b) => a - b);
  for (let i = 0; i <= uniq.length - 4; i++) {
    if (uniq[i + 3] - uniq[i] === 3) {
      bonus += 0.12;
      break;
    }
  }
  return bonus;
}

export function pickHardPokerAction(
  game: PokerGameState,
  aiHole: PokerCard[],
  aiChips: number,
  aiCurrentBet: number,
  humanCurrentBet: number
): { action: 'fold' | 'check' | 'call' | 'raise'; raiseBy?: number } {
  const safeAiHole = Array.isArray(aiHole) ? aiHole : [];
  const safeCommunity = Array.isArray(game?.communityCards) ? game.communityCards : [];
  const toCall = Math.max(0, (humanCurrentBet || 0) - (aiCurrentBet || 0));
  const pot = Math.max(1, game?.pot || 1);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // Deterministic-feeling per-turn bluff roll mixed with true randomness
  const bluffRoll = Math.random();
  const bluffTriggered = bluffRoll < 0.17;

  // Layer 1: Pre-Flop
  if (!game || game.phase === 'preflop' || safeCommunity.length === 0) {
    const strength = scorePreFlopStrength(safeAiHole);
    if (toCall === 0) {
      if ((strength >= 0.68 || bluffTriggered) && aiChips >= 40) {
        const raiseSize = Math.min(aiChips, strength >= 0.85 ? 80 : 40);
        return { action: 'raise', raiseBy: raiseSize };
      }
      return { action: 'check' };
    }

    // Facing a bet/raise pre-flop
    const bb = game?.bigBlind || 20;
    if (strength < 0.34 && toCall > bb * 2 && !bluffTriggered) {
      return { action: 'fold' };
    }
    if (strength >= 0.78 && aiChips > toCall + 40 && Math.random() < 0.65) {
      const raiseSize = Math.min(aiChips - toCall, 60);
      return { action: 'raise', raiseBy: raiseSize };
    }
    if (strength >= potOdds + 0.15 || toCall <= bb) {
      return { action: 'call' };
    }
    return { action: 'fold' };
  }

  // Layer 2: Post-Flop 7-Card Hand Evaluation + Draw Equity
  const myEval = evaluateBest5PokerHand([...safeAiHole, ...safeCommunity]);
  const boardOnlyEval =
    safeCommunity.length >= 5
      ? evaluateBest5PokerHand(safeCommunity)
      : null;

  // Base normalized strength 0..1 from poker hand category
  const categoryStrengthMap: Record<number, number> = {
    0: 0.22,
    1: 0.46,
    2: 0.66,
    3: 0.78,
    4: 0.84,
    5: 0.88,
    6: 0.93,
    7: 0.97,
    8: 0.99,
    9: 1.0,
  };
  let handStrength = categoryStrengthMap[myEval.category] ?? 0.25;
  if (myEval.category === 1 && myEval.tieBreakers[0] >= 11) {
    handStrength += 0.09; // Top/high pair
  }
  // If AI only plays the board (hole didn't improve), discount confidence
  if (boardOnlyEval && comparePokerEvaluations(myEval, boardOnlyEval) === 0 && myEval.category > 0) {
    handStrength = Math.max(0.24, handStrength - 0.25);
  }
  handStrength = Math.min(0.99, handStrength + estimateDrawBonus(safeAiHole, safeCommunity));

  // Layer 3: Pot Odds + Behavioral Bluff Engine
  if (toCall === 0) {
    if (handStrength >= 0.68 && aiChips >= 40) {
      const raiseSize = Math.min(
        aiChips,
        Math.max(40, Math.round(pot * (handStrength >= 0.85 ? 0.75 : 0.5) / 10) * 10)
      );
      return { action: 'raise', raiseBy: raiseSize };
    }
    if (bluffTriggered && aiChips >= 40) {
      return { action: 'raise', raiseBy: Math.min(aiChips, 40) };
    }
    return { action: 'check' };
  }

  // Facing bet post-flop: compare handStrength vs potOdds!
  if (handStrength >= 0.84 && aiChips > toCall + 40 && Math.random() < 0.7) {
    const raiseSize = Math.min(aiChips - toCall, Math.max(40, Math.round((pot * 0.6) / 10) * 10));
    return { action: 'raise', raiseBy: raiseSize };
  }
  if (handStrength >= potOdds + 0.08 || (bluffTriggered && toCall <= pot * 0.5)) {
    return { action: 'call' };
  }
  return { action: 'fold' };
}
