import {
  LudoGameState,
  TicTacToeCell,
  WhotCard,
  WhotGameState,
  WhotShape,
} from '../types';

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
  const humanSymbol = aiSymbol === 'O' ? 'X' : 'O';
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

/**
 * Hard-level X/O AI using full alpha-beta Minimax + positional tie-breakers (center > corners > edges).
 */
export function pickHardXoMove(board: TicTacToeCell[], aiSymbol: 'X' | 'O' = 'O'): number {
  const copy = [...board];
  // Quick optimal opening if board is empty or only 1 move played
  const emptyCount = copy.filter((c) => c === null).length;
  if (emptyCount === 9) return 4; // Center
  if (emptyCount === 8 && copy[4] === null) return 4;

  // Positional preference order when scores tie: center, corners, edges
  const preferredOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  let bestMove = -1;
  let bestScore = -Infinity;

  for (const idx of preferredOrder) {
    if (copy[idx] !== null) continue;
    copy[idx] = aiSymbol;
    const score = minimaxXo(copy, 0, false, aiSymbol, -Infinity, Infinity);
    copy[idx] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }

  return bestMove >= 0 ? bestMove : copy.findIndex((c) => c === null);
}

/**
 * Hard-level Whot! AI:
 * - Wins immediately if 1 card left and playable
 * - Chains action cards (Pick 2, General Market 14, Hold On 1) when AI holds follow-ups or human is low on cards
 * - Preserves Whot 20 wildcards unless winning, blocking Last Card threat, or no non-Whot move exists
 * - Picks the dominant remaining shape when playing Whot 20
 */
export function pickHardWhotMove(
  game: WhotGameState,
  aiHand: WhotCard[],
  humanCardCount: number
): { action: 'play'; card: WhotCard; requestedShape?: WhotShape } | { action: 'draw' } {
  const isPlayable = (card: WhotCard): boolean => {
    if (card.shape === 'whot' || card.number === 20) return true;
    if (game.requestedShape) return card.shape === game.requestedShape;
    return card.shape === game.topCard.shape || card.number === game.topCard.number;
  };

  const legal = aiHand.filter(isPlayable);
  if (legal.length === 0) return { action: 'draw' };

  const pickBestRequestedShape = (remainingHand: WhotCard[]): WhotShape => {
    const counts: Record<Exclude<WhotShape, 'whot'>, number> = {
      circle: 0,
      triangle: 0,
      cross: 0,
      square: 0,
      star: 0,
    };
    const actionBonus: Record<Exclude<WhotShape, 'whot'>, number> = {
      circle: 0,
      triangle: 0,
      cross: 0,
      square: 0,
      star: 0,
    };
    remainingHand.forEach((c) => {
      if (c.shape !== 'whot') {
        counts[c.shape] += 1;
        if (c.number === 1 || c.number === 2 || c.number === 14) {
          actionBonus[c.shape] += 0.6;
        }
      }
    });
    let bestShape: Exclude<WhotShape, 'whot'> = 'circle';
    let bestVal = -1;
    (Object.keys(counts) as Exclude<WhotShape, 'whot'>[]).forEach((sh) => {
      // Slightly avoid requesting the exact same shape if human is on 1-2 cards
      const sameShapePenalty =
        humanCardCount <= 2 && game.topCard.shape === sh ? -0.35 : 0;
      const val = counts[sh] + actionBonus[sh] + sameShapePenalty;
      if (val > bestVal) {
        bestVal = val;
        bestShape = sh;
      }
    });
    return bestShape;
  };

  // 1. If AI has 1 card left, play it immediately to win!
  if (aiHand.length === 1) {
    const card = legal[0];
    return {
      action: 'play',
      card,
      requestedShape:
        card.shape === 'whot' || card.number === 20 ? 'circle' : undefined,
    };
  }

  // Score each legal card
  let bestCard = legal[0];
  let bestScore = -Infinity;

  for (const card of legal) {
    const remaining = aiHand.filter((c) => c.id !== card.id);
    let score = 0;

    const isWhot = card.shape === 'whot' || card.number === 20;
    const isPickTwo = card.number === 2;
    const isGeneralMarket = card.number === 14;
    const isHoldOn = card.number === 1;

    if (isWhot) {
      // Save Whot 20 as trump unless we have <= 2 cards, no non-Whot options, or human is threatening win
      const hasNonWhot = legal.some((c) => c.shape !== 'whot' && c.number !== 20);
      if (remaining.length === 1) {
        score += 900; // Setup immediate next-turn finish
      } else if (!hasNonWhot) {
        score += 120;
      } else if (humanCardCount <= 2) {
        // Check if changing shape shuts down the current shape while helping AI
        const targetShape = pickBestRequestedShape(remaining);
        score += targetShape !== game.topCard.shape ? 310 : 80;
      } else {
        score -= 220; // Hold Whot 20 for later
      }
    } else {
      // Action cards grant AI an immediate extra turn!
      const followUps = remaining.filter(
        (r) =>
          r.shape === 'whot' ||
          r.number === 20 ||
          r.shape === card.shape ||
          r.number === card.number
      );

      if (isPickTwo) {
        score += 420;
        if (humanCardCount <= 2) score += 500; // Punish Last Card threat!
        if (followUps.length > 0) score += 180 + followUps.length * 30;
        else score -= 40; // Still makes opponent draw 2, just less combo value
      } else if (isGeneralMarket) {
        score += 340;
        if (humanCardCount <= 2) score += 420;
        if (followUps.length > 0) score += 160 + followUps.length * 25;
      } else if (isHoldOn) {
        score += 240;
        if (followUps.length > 0) score += 190 + followUps.length * 25;
        else score -= 70; // Don't waste Hold On without a follow-up if alternatives exist
      }

      // Shape & number connectivity in remaining hand: keep AI flexible
      const sameShapeCount = remaining.filter((r) => r.shape === card.shape).length;
      const sameNumCount = remaining.filter((r) => r.number === card.number).length;
      score += sameShapeCount * 45 + sameNumCount * 35;

      // Shed higher point cards first when scores are close
      score += card.number * 2;
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

const LUDO_SAFE_TRACK = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/**
 * Hard-level Ludo AI:
 * Evaluates every legal token move based on exact finishes, captures, escaping capture range,
 * entering safe squares / home column, exiting yard on 6, and avoiding danger.
 */
export function pickHardLudoToken(
  game: LudoGameState,
  dice: number,
  isAiChallenger: boolean = false
): number | null {
  const aiTokens = isAiChallenger ? game.challengerTokens : game.opponentTokens;
  const humanTokens = isAiChallenger ? game.opponentTokens : game.challengerTokens;
  const aiOffset = isAiChallenger ? 0 : 26;
  const humanOffset = isAiChallenger ? 26 : 0;

  const legalIndices: number[] = [];
  for (let i = 0; i < aiTokens.length; i++) {
    const s = aiTokens[i];
    if (s >= 56) continue;
    if (s < 0 && dice === 6) legalIndices.push(i);
    else if (s >= 0 && s + dice <= 56) legalIndices.push(i);
  }

  if (legalIndices.length === 0) return null;

  // Helper: check if an AI track step [0..50] is threatened (within 1..6 steps ahead of a human token)
  const isTrackThreatened = (aiStep: number): boolean => {
    if (aiStep < 0 || aiStep > 50) return false;
    const aiTrackIdx = (aiStep + aiOffset) % 52;
    if (LUDO_SAFE_TRACK.has(aiTrackIdx)) return false;

    for (const hs of humanTokens) {
      if (hs < 0 || hs > 50) continue;
      const hTrackIdx = (hs + humanOffset) % 52;
      const dist = (aiTrackIdx - hTrackIdx + 52) % 52;
      if (dist >= 1 && dist <= 6 && hs + dist <= 50) {
        return true;
      }
    }
    return false;
  };

  let bestIdx = legalIndices[0];
  let bestScore = -Infinity;

  for (const idx of legalIndices) {
    const curStep = aiTokens[idx];
    const nextStep = curStep < 0 ? 0 : curStep + dice;
    let score = 0;

    // 1. Exact Home Finish
    if (nextStep === 56) {
      score += 1200;
    }

    // 2. Capture opponent token on unsafe main track square
    if (nextStep >= 0 && nextStep <= 50) {
      const nextTrackIdx = (nextStep + aiOffset) % 52;
      if (!LUDO_SAFE_TRACK.has(nextTrackIdx)) {
        for (const hs of humanTokens) {
          if (hs >= 0 && hs <= 50 && (hs + humanOffset) % 52 === nextTrackIdx) {
            score += 950 + hs * 6; // Capturing advanced opponent tokens is even stronger!
          }
        }
      }
    }

    // 3. Exit Yard on 6
    if (curStep < 0 && dice === 6) {
      const activeCount = aiTokens.filter((s) => s >= 0 && s < 56).length;
      score += activeCount === 0 ? 900 : 540;
    }

    // 4. Enter safe Home Column (steps 51..55)
    if (curStep <= 50 && nextStep >= 51 && nextStep < 56) {
      score += 520;
    }

    // 5. Land on safe star square
    const nextIsSafe =
      nextStep >= 51 ||
      (nextStep >= 0 && nextStep <= 50 && LUDO_SAFE_TRACK.has((nextStep + aiOffset) % 52));
    if (nextIsSafe && nextStep < 56) {
      score += 310;
    }

    // 6. Escape active threat
    const threatenedNow = isTrackThreatened(curStep);
    const threatenedAfter = isTrackThreatened(nextStep);
    if (threatenedNow && !threatenedAfter) {
      score += 380 + curStep * 3;
    } else if (!threatenedNow && threatenedAfter) {
      score -= 280 + nextStep * 2.5;
    }

    // 7. Avoid leaving a safe square into an unsafe/threatened square unless capturing
    const curIsSafe =
      curStep >= 0 && curStep <= 50 && LUDO_SAFE_TRACK.has((curStep + aiOffset) % 52);
    if (curIsSafe && threatenedAfter) {
      score -= 160;
    }

    // 8. Slight preference to advance leading active token closer to Home
    if (curStep >= 0) {
      score += nextStep * 2;
    }

    // 9. Avoid stacking two AI tokens on the same unsafe square unnecessarily
    if (nextStep >= 0 && nextStep <= 50 && !nextIsSafe) {
      const hasAllySameSquare = aiTokens.some((s, j) => j !== idx && s === nextStep);
      if (hasAllySameSquare) score -= 45;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  return bestIdx;
}
