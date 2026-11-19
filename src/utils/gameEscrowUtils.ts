import { ChatMessage, LudoGameState, PokerGameState, TicTacToeGameState, WhotGameState } from '../types';

type AnyBetGameState = TicTacToeGameState | WhotGameState | LudoGameState | PokerGameState;

/**
 * Extract the embedded game state from a game message, if present.
 */
export function extractGameStateFromMessage(msg: ChatMessage): AnyBetGameState | null {
  if (msg.type === 'game_xo' && msg.xoGame) return msg.xoGame;
  if (msg.type === 'game_whot' && msg.whotGame) return msg.whotGame;
  if (msg.type === 'game_ludo' && msg.ludoGame) return msg.ludoGame;
  if (msg.type === 'game_poker' && msg.pokerGame) return msg.pokerGame;
  return null;
}

/**
 * Returns true if the message is a game bet challenge/match whose winner has NOT
 * been decided yet and whose wager escrow is still held (pending or active).
 * These messages must be preserved when clearing chat history.
 */
export function isUnresolvedEscrowBetGameMessage(msg: ChatMessage): boolean {
  if (!msg || msg.deleted) return false;
  const game = extractGameStateFromMessage(msg);
  if (!game) return false;

  const isBetMode = game.mode === 'bet' && Number(game.betAmount) > 0;
  if (!isBetMode) return false;

  const isOpenStatus = game.status === 'pending' || game.status === 'active';
  if (!isOpenStatus) return false;

  if (game.settledAt || game.winnerPhone) return false;
  if (game.gameType === 'xo' && (game as TicTacToeGameState).winnerSymbol) return false;

  return true;
}

/**
 * Returns true if the message is a challenge/match card for X/O, Whot!, Ludo, or Poker.
 */
export function isGameMessage(msg: ChatMessage): boolean {
  if (!msg) return false;
  return (
    (msg.type === 'game_xo' && Boolean(msg.xoGame)) ||
    (msg.type === 'game_whot' && Boolean(msg.whotGame)) ||
    (msg.type === 'game_ludo' && Boolean(msg.ludoGame)) ||
    (msg.type === 'game_poker' && Boolean(msg.pokerGame))
  );
}

/**
 * Returns true if a game state has reached any terminal state (won, draw, declined, cancelled, or settled).
 */
export function hasGameReachedTerminalState(game: AnyBetGameState | null | undefined): boolean {
  if (!game) return true;
  if (
    game.status === 'won' ||
    game.status === 'draw' ||
    game.status === 'declined' ||
    game.status === 'cancelled'
  ) {
    return true;
  }
  if (game.status !== 'active' && game.status !== 'pending') {
    return true;
  }
  if (game.settledAt || game.winnerPhone) return true;
  if (game.gameType === 'xo') {
    const xo = game as TicTacToeGameState;
    if (xo.winnerSymbol || (Array.isArray(xo.winningLine) && xo.winningLine.length > 0)) {
      return true;
    }
    if (Array.isArray(xo.board) && xo.board.length === 9 && xo.board.every((cell) => cell !== null)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns true only when a chat game message is actively pending or in-progress (live).
 * Ended, cancelled, declined, settled, and deleted games always return false.
 */
export function isLiveGameMessage(msg: ChatMessage): boolean {
  if (!msg || msg.deleted) return false;
  if (!isGameMessage(msg)) return false;
  const game = extractGameStateFromMessage(msg);
  if (!game) return false;
  return !hasGameReachedTerminalState(game);
}

/**
 * Returns true for completed/settled games (won/draw) that have ended (excludes cancelled/declined).
 */
export function isEndedGameMessage(msg: ChatMessage): boolean {
  if (!msg || msg.deleted) return false;
  if (!isGameMessage(msg)) return false;
  const game = extractGameStateFromMessage(msg);
  if (!game) return false;
  if (game.status === 'cancelled' || game.status === 'declined') return false;
  return hasGameReachedTerminalState(game);
}

/**
 * Returns all unresolved bet game messages with held escrow in a chat thread.
 */
export function getUnresolvedEscrowBetGames(messages: ChatMessage[] = []): ChatMessage[] {
  return messages.filter(isUnresolvedEscrowBetGameMessage);
}
