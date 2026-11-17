import { LudoGameState, LudoRulesConfig } from '../types';

export const DEFAULT_LUDO_RULES_CONFIG: LudoRulesConfig = {
  dice_count: 2,
  safe_tiles: [],
  spawn_requires: 6,
  spawn_captures_occupant: true,
  instant_finish_on_capture: true,
  stack_protects_from_single: true,
  stack_blocks_passing: true,
  mandatory_capture_to_finish: true,
  two_house_mode: true,
};

export function getLudoRulesConfig(game?: Partial<LudoGameState> | null): LudoRulesConfig {
  const cfg = game?.rulesConfig;
  if (!cfg) {
    const isFourSeed = Array.isArray(game?.challengerTokens) && game.challengerTokens.length <= 4;
    return {
      ...DEFAULT_LUDO_RULES_CONFIG,
      two_house_mode: !isFourSeed,
    };
  }
  return {
    dice_count: 2,
    safe_tiles: Array.isArray(cfg.safe_tiles) ? cfg.safe_tiles : [],
    spawn_requires: cfg.spawn_requires || 6,
    spawn_captures_occupant: cfg.spawn_captures_occupant ?? true,
    instant_finish_on_capture: cfg.instant_finish_on_capture ?? true,
    stack_protects_from_single: cfg.stack_protects_from_single ?? true,
    stack_blocks_passing: cfg.stack_blocks_passing ?? true,
    mandatory_capture_to_finish: cfg.mandatory_capture_to_finish ?? true,
    two_house_mode: cfg.two_house_mode ?? true,
  };
}

/**
 * Castle layout on the 52-cell outer loop:
 * - Two-House Mode (8 seeds):
 *   - Challenger (Purple): Castle A (0..3) at 0, Castle B (4..7) at 26
 *   - Opponent (Amber): Castle A (0..3) at 13, Castle B (4..7) at 39
 * - Single-House Mode (4 seeds):
 *   - Challenger (Purple): 0
 *   - Opponent (Amber): 26 (diagonally opposite)
 */
export function getLudoSeedOffset(
  seedIndex: number,
  isChallenger: boolean,
  totalSeeds: number = 8
): number {
  if (totalSeeds <= 4) {
    return isChallenger ? 0 : 26;
  }
  const isCastleB = seedIndex >= 4;
  if (isChallenger) {
    return isCastleB ? 26 : 0;
  }
  return isCastleB ? 39 : 13;
}

/**
 * Outer-track position encoding:
 * -1 = Yard
 * 0..50 = Outer loop offsets 0..50 relative to token's own start square
 * 151 = Outer loop offset 51 (reached when looping outer track due to Mandatory Capture Gate)
 * 51..55 = Private 5-tile Home Column (100% safe)
 * 56 = Finished (Center Home Triangle)
 */
export function isStepOnOuterTrack(step: number): boolean {
  return (step >= 0 && step <= 50) || step === 151;
}

export function isStepFinished(step: number): boolean {
  return step >= 56 && step < 100;
}

export function stepToOuterOffset(step: number): number | null {
  if (step === 151) return 51;
  if (step >= 0 && step <= 50) return step;
  return null;
}

export function outerOffsetToStep(offset: number): number {
  const norm = ((offset % 52) + 52) % 52;
  return norm === 51 ? 151 : norm;
}

export function getLudoTrackIndex(
  step: number,
  tokenIndex: number,
  isChallenger: boolean,
  totalSeeds: number
): number | null {
  const outerOffset = stepToOuterOffset(step);
  if (outerOffset === null) return null;
  const seedOffset = getLudoSeedOffset(tokenIndex, isChallenger, totalSeeds);
  return (outerOffset + seedOffset) % 52;
}

export function getTokensAtTrackIndex(
  tokens: number[],
  trackIdx: number,
  isChallenger: boolean
): number[] {
  const indices: number[] = [];
  const totalSeeds = tokens.length || 8;
  for (let i = 0; i < tokens.length; i++) {
    const t = getLudoTrackIndex(tokens[i], i, isChallenger, totalSeeds);
    if (t === trackIdx) {
      indices.push(i);
    }
  }
  return indices;
}

export interface LudoStepResult {
  valid: boolean;
  reason?: string;
  nextMyTokens: number[];
  nextOppTokens: number[];
  nextStep: number;
  destTrackIdx: number | null;
  capturesGained: number;
  capturedOppIndices: number[];
  instantFinishedCount: number;
  nextPendingStackTarget: number | null;
  nextPendingAttacker: number | null;
  completedStackAssault: boolean;
}

function canSecondTokenReachTarget(
  myTokens: number[],
  oppTokens: number[],
  attackerAIdx: number,
  targetTrackIdx: number,
  dieVal: number,
  isChallenger: boolean,
  rules: LudoRulesConfig,
  myCaptures: number
): boolean {
  const totalSeeds = myTokens.length || 8;
  const safeSet = new Set(rules.safe_tiles || []);
  const captureGateBlocked = rules.mandatory_capture_to_finish && myCaptures < 1;

  for (let b = 0; b < myTokens.length; b++) {
    if (b === attackerAIdx) continue;
    const s = myTokens[b];
    if (isStepFinished(s)) continue;

    if (s < 0) {
      if (dieVal !== rules.spawn_requires) continue;
      const startTrack = getLudoTrackIndex(0, b, isChallenger, totalSeeds);
      if (startTrack === targetTrackIdx) return true;
      continue;
    }

    const outer = stepToOuterOffset(s);
    if (outer === null) continue; // Home column tokens cannot hit outer track

    let destOuter: number | null = null;
    const passedTracks: number[] = [];
    const seedOffset = getLudoSeedOffset(b, isChallenger, totalSeeds);

    if (captureGateBlocked || outer === 51) {
      for (let k = 1; k < dieVal; k++) {
        passedTracks.push((outer + k + seedOffset) % 52);
      }
      destOuter = (outer + dieVal) % 52;
    } else {
      if (outer + dieVal > 50) continue; // enters home column, doesn't land on outer track
      for (let k = 1; k < dieVal; k++) {
        passedTracks.push((outer + k + seedOffset) % 52);
      }
      destOuter = outer + dieVal;
    }

    const destTrack = (destOuter + seedOffset) % 52;
    if (destTrack !== targetTrackIdx) continue;

    // Must not be blocked on intermediate squares by an opponent stack
    let blocked = false;
    if (rules.stack_blocks_passing) {
      for (const pTrack of passedTracks) {
        if (!safeSet.has(pTrack)) {
          const oppOnPass = getTokensAtTrackIndex(oppTokens, pTrack, !isChallenger);
          if (oppOnPass.length >= 2) {
            blocked = true;
            break;
          }
        }
      }
    }
    if (!blocked) return true;
  }

  return false;
}

export function simulateLudoSingleDieStep(params: {
  myTokens: number[];
  oppTokens: number[];
  tokenIndex: number;
  dieVal: number;
  otherDieVal: number | null;
  isChallenger: boolean;
  rules: LudoRulesConfig;
  myCaptures: number;
  pendingStackTargetTrackIdx?: number | null;
  pendingStackAttackerIndex?: number | null;
}): LudoStepResult {
  const {
    myTokens,
    oppTokens,
    tokenIndex,
    dieVal,
    otherDieVal,
    isChallenger,
    rules,
    myCaptures,
    pendingStackTargetTrackIdx = null,
    pendingStackAttackerIndex = null,
  } = params;

  const invalid = (reason: string): LudoStepResult => ({
    valid: false,
    reason,
    nextMyTokens: myTokens,
    nextOppTokens: oppTokens,
    nextStep: myTokens[tokenIndex] ?? -1,
    destTrackIdx: null,
    capturesGained: 0,
    capturedOppIndices: [],
    instantFinishedCount: 0,
    nextPendingStackTarget: pendingStackTargetTrackIdx ?? null,
    nextPendingAttacker: pendingStackAttackerIndex ?? null,
    completedStackAssault: false,
  });

  const curStep = myTokens[tokenIndex];
  if (curStep === undefined || isStepFinished(curStep)) {
    return invalid('Seed already finished.');
  }

  // If a Stack-vs-Stack assault is mid-way (Die 1 stepped onto opponent 2-stack),
  // Die 2 MUST be a different token landing on that exact square!
  if (pendingStackTargetTrackIdx !== null && pendingStackTargetTrackIdx !== undefined) {
    if (tokenIndex === pendingStackAttackerIndex) {
      return invalid('Use a second seed to complete the stack capture.');
    }
  }

  const totalSeeds = myTokens.length || 8;
  const seedOffset = getLudoSeedOffset(tokenIndex, isChallenger, totalSeeds);
  const safeSet = new Set(rules.safe_tiles || []);
  const captureGateBlocked = rules.mandatory_capture_to_finish && myCaptures < 1;

  let nextStep = curStep;
  const passedTrackIndices: number[] = [];
  let destTrackIdx: number | null = null;

  if (curStep < 0) {
    // Yard spawn requires exact spawn die (6)
    if (dieVal !== rules.spawn_requires) {
      return invalid(`Need a ${rules.spawn_requires} to spawn from yard.`);
    }
    nextStep = 0;
    destTrackIdx = seedOffset % 52;
  } else if (curStep >= 51 && curStep < 56) {
    // Already inside private 5-tile Home Column — exact count required
    if (curStep + dieVal > 56) {
      return invalid('Exact die needed to enter Home.');
    }
    nextStep = curStep + dieVal;
    destTrackIdx = null;
  } else {
    const curOuter = stepToOuterOffset(curStep);
    if (curOuter === null) {
      return invalid('Invalid seed position.');
    }

    if (captureGateBlocked || curOuter === 51) {
      // Loop around the 52-tile outer track until player has >= 1 capture (or finishes loop from 151 -> 0..50)
      for (let k = 1; k < dieVal; k++) {
        passedTrackIndices.push((curOuter + k + seedOffset) % 52);
      }
      const nextOuter = (curOuter + dieVal) % 52;
      nextStep = outerOffsetToStep(nextOuter);
      destTrackIdx = (nextOuter + seedOffset) % 52;
    } else {
      const targetLinear = curOuter + dieVal;
      if (targetLinear > 56) {
        return invalid('Exact die needed to enter Home.');
      }
      if (targetLinear <= 50) {
        for (let k = 1; k < dieVal; k++) {
          passedTrackIndices.push((curOuter + k + seedOffset) % 52);
        }
        nextStep = targetLinear;
        destTrackIdx = (targetLinear + seedOffset) % 52;
      } else {
        // Enters Home Column (51..55) or reaches Home (56)
        // Only squares up to outer offset 50 are on the shared track!
        for (let k = 1; curOuter + k <= 50; k++) {
          passedTrackIndices.push((curOuter + k + seedOffset) % 52);
        }
        nextStep = targetLinear;
        destTrackIdx = null;
      }
    }
  }

  // Enforce pending stack assault destination requirement
  if (pendingStackTargetTrackIdx !== null && pendingStackTargetTrackIdx !== undefined) {
    if (destTrackIdx !== pendingStackTargetTrackIdx) {
      return invalid('Complete the stack capture by landing on the targeted block.');
    }
  }

  // Check stack_blocks_passing on all traversed outer-track squares
  if (rules.stack_blocks_passing && passedTrackIndices.length > 0) {
    for (const passIdx of passedTrackIndices) {
      if (safeSet.has(passIdx)) continue;
      const oppAtPass = getTokensAtTrackIndex(oppTokens, passIdx, !isChallenger);
      if (oppAtPass.length >= 2) {
        return invalid('Blocked by an opponent stack (cannot pass over 2+ stacked pieces).');
      }
    }
  }

  const nextMy = [...myTokens];
  const nextOpp = [...oppTokens];

  // Home Column / Finish square check
  if (destTrackIdx === null || safeSet.has(destTrackIdx)) {
    nextMy[tokenIndex] = nextStep;
    return {
      valid: true,
      nextMyTokens: nextMy,
      nextOppTokens: nextOpp,
      nextStep,
      destTrackIdx,
      capturesGained: 0,
      capturedOppIndices: [],
      instantFinishedCount: isStepFinished(nextStep) ? 1 : 0,
      nextPendingStackTarget: null,
      nextPendingAttacker: null,
      completedStackAssault: false,
    };
  }

  // Destination is on shared outer track & not safe
  const oppAtDest = getTokensAtTrackIndex(nextOpp, destTrackIdx, !isChallenger);

  if (oppAtDest.length === 0) {
    nextMy[tokenIndex] = nextStep;
    return {
      valid: true,
      nextMyTokens: nextMy,
      nextOppTokens: nextOpp,
      nextStep,
      destTrackIdx,
      capturesGained: 0,
      capturedOppIndices: [],
      instantFinishedCount: 0,
      nextPendingStackTarget: null,
      nextPendingAttacker: null,
      completedStackAssault: false,
    };
  }

  if (oppAtDest.length === 1) {
    const isSpawn = curStep < 0;
    if (isSpawn && !rules.spawn_captures_occupant) {
      return invalid('Spawn square occupied.');
    }
    // Standard / Spawn capture!
    const victimIdx = oppAtDest[0];
    nextOpp[victimIdx] = -1;
    if (rules.instant_finish_on_capture) {
      nextMy[tokenIndex] = 56;
    } else {
      nextMy[tokenIndex] = nextStep;
    }
    return {
      valid: true,
      nextMyTokens: nextMy,
      nextOppTokens: nextOpp,
      nextStep: nextMy[tokenIndex],
      destTrackIdx,
      capturesGained: 1,
      capturedOppIndices: [victimIdx],
      instantFinishedCount: rules.instant_finish_on_capture ? 1 : 0,
      nextPendingStackTarget: null,
      nextPendingAttacker: null,
      completedStackAssault: false,
    };
  }

  // Opponent Stack of 2+ at destination!
  if (
    pendingStackTargetTrackIdx !== null &&
    pendingStackTargetTrackIdx !== undefined &&
    destTrackIdx === pendingStackTargetTrackIdx &&
    oppAtDest.length === 2
  ) {
    // Completing Stack-vs-Stack capture (2 friendly tokens vs 2 opponent tokens)!
    for (const vIdx of oppAtDest) {
      nextOpp[vIdx] = -1;
    }
    const attackerA = pendingStackAttackerIndex;
    if (rules.instant_finish_on_capture) {
      if (attackerA !== null && attackerA !== undefined && attackerA >= 0) {
        nextMy[attackerA] = 56;
      }
      nextMy[tokenIndex] = 56;
    } else {
      nextMy[tokenIndex] = nextStep;
    }
    return {
      valid: true,
      nextMyTokens: nextMy,
      nextOppTokens: nextOpp,
      nextStep: nextMy[tokenIndex],
      destTrackIdx,
      capturesGained: oppAtDest.length,
      capturedOppIndices: [...oppAtDest],
      instantFinishedCount: rules.instant_finish_on_capture ? 2 : 0,
      nextPendingStackTarget: null,
      nextPendingAttacker: null,
      completedStackAssault: true,
    };
  }

  // Initiating Stack-vs-Stack capture on a 2-token stack if player has the 2nd die & another token that can reach destTrackIdx
  if (
    rules.stack_protects_from_single &&
    oppAtDest.length === 2 &&
    otherDieVal !== null &&
    pendingStackTargetTrackIdx == null
  ) {
    const tempMy = [...nextMy];
    tempMy[tokenIndex] = nextStep;
    const hasPartner = canSecondTokenReachTarget(
      tempMy,
      nextOpp,
      tokenIndex,
      destTrackIdx,
      otherDieVal,
      isChallenger,
      rules,
      myCaptures
    );
    if (hasPartner) {
      return {
        valid: true,
        nextMyTokens: tempMy,
        nextOppTokens: nextOpp,
        nextStep,
        destTrackIdx,
        capturesGained: 0,
        capturedOppIndices: [],
        instantFinishedCount: 0,
        nextPendingStackTarget: destTrackIdx,
        nextPendingAttacker: tokenIndex,
        completedStackAssault: false,
      };
    }
  }

  return invalid(
    oppAtDest.length >= 2
      ? 'Cannot land on an opponent stack unless landing an equal-sized stack.'
      : 'Move blocked.'
  );
}

export interface LegalLudoPlayState {
  playableDie0Tokens: Set<number>;
  playableDie1Tokens: Set<number>;
  playableCombinedTokens: Set<number>;
  mustPlayBoth: boolean;
  forcedHigherDie: number | null;
  hasAnyLegalMove: boolean;
  reasonForBlockedToken: (tokenIndex: number, dieChoice: 'die0' | 'die1' | 'combined') => string | null;
}

export function getLegalLudoPlayState(
  game: LudoGameState,
  isChallenger: boolean,
  remainingDice: number[]
): LegalLudoPlayState {
  const emptySet = new Set<number>();
  if (!remainingDice || remainingDice.length === 0) {
    return {
      playableDie0Tokens: emptySet,
      playableDie1Tokens: emptySet,
      playableCombinedTokens: emptySet,
      mustPlayBoth: false,
      forcedHigherDie: null,
      hasAnyLegalMove: false,
      reasonForBlockedToken: () => 'No remaining dice.',
    };
  }

  const rules = getLudoRulesConfig(game);
  const myTokens = [...((isChallenger ? game.challengerTokens : game.opponentTokens) || [])];
  const oppTokens = [...((isChallenger ? game.opponentTokens : game.challengerTokens) || [])];
  const myCaptures = (isChallenger ? game.challengerCaptures : game.opponentCaptures) || 0;
  const pendingTarget = game.pendingStackTargetTrackIdx ?? null;
  const pendingAttacker = game.pendingStackAttackerIndex ?? null;

  if (remainingDice.length === 1) {
    const d0 = remainingDice[0];
    const p0 = new Set<number>();
    for (let i = 0; i < myTokens.length; i++) {
      const res = simulateLudoSingleDieStep({
        myTokens,
        oppTokens,
        tokenIndex: i,
        dieVal: d0,
        otherDieVal: null,
        isChallenger,
        rules,
        myCaptures,
        pendingStackTargetTrackIdx: pendingTarget,
        pendingStackAttackerIndex: pendingAttacker,
      });
      if (res.valid) p0.add(i);
    }
    return {
      playableDie0Tokens: p0,
      playableDie1Tokens: emptySet,
      playableCombinedTokens: emptySet,
      mustPlayBoth: false,
      forcedHigherDie: null,
      hasAnyLegalMove: p0.size > 0,
      reasonForBlockedToken: (idx) => {
        const res = simulateLudoSingleDieStep({
          myTokens,
          oppTokens,
          tokenIndex: idx,
          dieVal: d0,
          otherDieVal: null,
          isChallenger,
          rules,
          myCaptures,
          pendingStackTargetTrackIdx: pendingTarget,
          pendingStackAttackerIndex: pendingAttacker,
        });
        return res.valid ? null : res.reason || 'Illegal move.';
      },
    };
  }

  // 2 remaining dice: [d0, d1]
  const [d0, d1] = remainingDice;

  const singleRes0: LudoStepResult[] = [];
  const singleRes1: LudoStepResult[] = [];
  const canFollowWith1After0: boolean[] = [];
  const canFollowWith0After1: boolean[] = [];

  for (let i = 0; i < myTokens.length; i++) {
    const r0 = simulateLudoSingleDieStep({
      myTokens,
      oppTokens,
      tokenIndex: i,
      dieVal: d0,
      otherDieVal: d1,
      isChallenger,
      rules,
      myCaptures,
      pendingStackTargetTrackIdx: pendingTarget,
      pendingStackAttackerIndex: pendingAttacker,
    });
    singleRes0.push(r0);

    let follow1 = false;
    if (r0.valid && !r0.nextMyTokens.every(isStepFinished)) {
      const nextCaps = myCaptures + r0.capturesGained;
      for (let j = 0; j < r0.nextMyTokens.length; j++) {
        const r2 = simulateLudoSingleDieStep({
          myTokens: r0.nextMyTokens,
          oppTokens: r0.nextOppTokens,
          tokenIndex: j,
          dieVal: d1,
          otherDieVal: null,
          isChallenger,
          rules,
          myCaptures: nextCaps,
          pendingStackTargetTrackIdx: r0.nextPendingStackTarget,
          pendingStackAttackerIndex: r0.nextPendingAttacker,
        });
        if (r2.valid) {
          follow1 = true;
          break;
        }
      }
    } else if (r0.valid && r0.nextMyTokens.every(isStepFinished)) {
      follow1 = true; // winning immediately satisfies completion!
    }
    canFollowWith1After0.push(follow1);

    const r1 = simulateLudoSingleDieStep({
      myTokens,
      oppTokens,
      tokenIndex: i,
      dieVal: d1,
      otherDieVal: d0,
      isChallenger,
      rules,
      myCaptures,
      pendingStackTargetTrackIdx: pendingTarget,
      pendingStackAttackerIndex: pendingAttacker,
    });
    singleRes1.push(r1);

    let follow0 = false;
    if (r1.valid && !r1.nextMyTokens.every(isStepFinished)) {
      const nextCaps = myCaptures + r1.capturesGained;
      for (let j = 0; j < r1.nextMyTokens.length; j++) {
        const r2 = simulateLudoSingleDieStep({
          myTokens: r1.nextMyTokens,
          oppTokens: r1.nextOppTokens,
          tokenIndex: j,
          dieVal: d0,
          otherDieVal: null,
          isChallenger,
          rules,
          myCaptures: nextCaps,
          pendingStackTargetTrackIdx: r1.nextPendingStackTarget,
          pendingStackAttackerIndex: r1.nextPendingAttacker,
        });
        if (r2.valid) {
          follow0 = true;
          break;
        }
      }
    } else if (r1.valid && r1.nextMyTokens.every(isStepFinished)) {
      follow0 = true;
    }
    canFollowWith0After1.push(follow0);
  }

  const anyTwoStepExists =
    canFollowWith1After0.some(Boolean) || canFollowWith0After1.some(Boolean);

  const playableDie0Tokens = new Set<number>();
  const playableDie1Tokens = new Set<number>();
  let forcedHigherDie: number | null = null;

  if (anyTwoStepExists) {
    // Mandatory Play Rule #1: If both dice can be legally played, player MUST pick a move that allows playing both!
    for (let i = 0; i < myTokens.length; i++) {
      if (canFollowWith1After0[i]) playableDie0Tokens.add(i);
      if (canFollowWith0After1[i]) playableDie1Tokens.add(i);
    }
  } else {
    // Only 1 die can be played!
    const anyD0 = singleRes0.some((r) => r.valid);
    const anyD1 = singleRes1.some((r) => r.valid);

    if (anyD0 && anyD1 && d0 !== d1) {
      // Mandatory Play Rule #3: If either die can be played individually (but not both), MUST play higher die!
      const high = Math.max(d0, d1);
      forcedHigherDie = high;
      for (let i = 0; i < myTokens.length; i++) {
        if (d0 === high && singleRes0[i].valid) playableDie0Tokens.add(i);
        if (d1 === high && singleRes1[i].valid) playableDie1Tokens.add(i);
      }
    } else {
      for (let i = 0; i < myTokens.length; i++) {
        if (singleRes0[i].valid) playableDie0Tokens.add(i);
        if (singleRes1[i].valid) playableDie1Tokens.add(i);
      }
    }
  }

  // Combined shortcut: valid on token i ONLY when moving token i by first die then second die sequentially
  // works cleanly WITHOUT step 1 ending via instant-finish or initiating a 2-token stack assault.
  const playableCombinedTokens = new Set<number>();
  for (let i = 0; i < myTokens.length; i++) {
    const cur = myTokens[i];
    const tryOrder = (first: number, second: number): boolean => {
      const s1 = simulateLudoSingleDieStep({
        myTokens,
        oppTokens,
        tokenIndex: i,
        dieVal: first,
        otherDieVal: second,
        isChallenger,
        rules,
        myCaptures,
        pendingStackTargetTrackIdx: null,
        pendingStackAttackerIndex: null,
      });
      if (!s1.valid || s1.nextPendingStackTarget !== null || isStepFinished(s1.nextStep)) {
        return false;
      }
      const s2 = simulateLudoSingleDieStep({
        myTokens: s1.nextMyTokens,
        oppTokens: s1.nextOppTokens,
        tokenIndex: i,
        dieVal: second,
        otherDieVal: null,
        isChallenger,
        rules,
        myCaptures: myCaptures + s1.capturesGained,
        pendingStackTargetTrackIdx: null,
        pendingStackAttackerIndex: null,
      });
      return s2.valid;
    };

    const preferredFirstFirst = cur < 0 && d1 === rules.spawn_requires && d0 !== rules.spawn_requires
      ? tryOrder(d1, d0)
      : tryOrder(d0, d1) || tryOrder(d1, d0);
    if (preferredFirstFirst) {
      playableCombinedTokens.add(i);
    }
  }

  return {
    playableDie0Tokens,
    playableDie1Tokens,
    playableCombinedTokens,
    mustPlayBoth: anyTwoStepExists,
    forcedHigherDie,
    hasAnyLegalMove: playableDie0Tokens.size > 0 || playableDie1Tokens.size > 0,
    reasonForBlockedToken: (idx, choice) => {
      if (choice === 'combined') {
        if (playableCombinedTokens.has(idx)) return null;
        return 'Play dice sequentially one by one (capture/stack check or exact finish applies).';
      }
      const isD1 = choice === 'die1';
      const allowedSet = isD1 ? playableDie1Tokens : playableDie0Tokens;
      if (allowedSet.has(idx)) return null;

      const raw = isD1 ? singleRes1[idx] : singleRes0[idx];
      if (!raw?.valid) return raw?.reason || 'Illegal move.';
      if (anyTwoStepExists) {
        return 'Mandatory rule: both dice can be played — pick a move that leaves a legal 2nd move.';
      }
      if (forcedHigherDie !== null) {
        return `Mandatory rule: since only one die can be played, you must play the higher die (${forcedHigherDie}).`;
      }
      return 'Move not available.';
    },
  };
}

export function canMoveLudoSingleDieBasic(step: number, die: number): boolean {
  if (isStepFinished(step)) return false;
  if (step < 0) return die === 6;
  if (step === 151) return true; // looping outer track can always step forward
  return step + die <= 56;
}
