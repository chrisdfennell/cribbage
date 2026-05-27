/**
 * Very basic AI for Cribbage (placeholder for now).
 * Good enough to make solo play possible while we build a smarter one.
 */

import type { GameState, PlayerId } from '../engine';
import { getLegalPlays } from '../engine';

export function getAIMove(state: GameState, aiPlayer: PlayerId): number | 'go' {
  const hand = state.players[aiPlayer]?.hand ?? [];
  const legal = getLegalPlays(state, aiPlayer);

  if (legal.length === 0) {
    return 'go';
  }

  // Extremely naive: just play the first legal card
  return legal[0];
}

export function getAIDiscardIndices(state: GameState, aiPlayer: PlayerId): number[] {
  const hand = state.players[aiPlayer]?.hand ?? [];
  if (hand.length < 2) return [0, 1];

  // Naive: discard the first two cards
  return [0, 1];
}
