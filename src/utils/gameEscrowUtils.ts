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
 * Returns all unresolved bet game messages with held escrow in a chat thread.
 */
export function getUnresolvedEscrowBetGames(messages: ChatMessage[] = []): ChatMessage[] {
  return messages.filter(isUnresolvedEscrowBetGameMessage);
}
