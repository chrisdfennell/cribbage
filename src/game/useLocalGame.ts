/**
 * useLocalGame - React hook for local / vs AI play
 *
 * This is the thin bridge between the pure engine and React UI.
 * It follows the exact same philosophy as Townstone's useGame hook.
 *
 * The engine does all the work. This hook just manages React state + transient UI concerns.
 */

import { useCallback, useState } from 'react';
import {
  createGame,
  discardToCrib,
  playCard,
  declareGo,
  advanceRound,
  getLegalPlays,
  type GameState,
  type NewGameOptions,
} from '../engine';

export interface UseLocalGame {
  state: GameState;
  isMyTurn: boolean;
  legalPlays: number[];

  // Discard phase helpers
  selectedForDiscard: number[];
  toggleDiscardSelection: (index: number) => void;
  canConfirmDiscard: boolean;
  confirmDiscard: () => void;

  // Actions
  startNewGame: (opts: NewGameOptions) => void;
  discard: (indices: number[]) => void; // low-level
  playCard: (index: number) => void;
  sayGo: () => void;
  advanceToNextRound: () => void;
}

export function useLocalGame(initialOptions?: NewGameOptions): UseLocalGame {
  const [state, setState] = useState<GameState>(() =>
    initialOptions ? createGame(initialOptions) : createGame({ playerCount: 2, seed: Date.now() })
  );

  // Transient UI state for discard selection
  const [selectedForDiscard, setSelectedForDiscard] = useState<number[]>([]);

  const currentPlayer = state.currentPlayer;
  const legalPlays = getLegalPlays(state, currentPlayer);

  const startNewGame = useCallback((opts: NewGameOptions) => {
    setSelectedForDiscard([]);
    setState(createGame(opts));
  }, []);

  // === Discard Selection Logic ===
  const toggleDiscardSelection = useCallback((index: number) => {
    setSelectedForDiscard(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        if (prev.length >= 2) {
          // Replace the oldest selection
          return [...prev.slice(1), index];
        }
        return [...prev, index];
      }
    });
  }, []);

  const canConfirmDiscard = selectedForDiscard.length === 2;

  const confirmDiscard = useCallback(() => {
    if (!canConfirmDiscard) return;
    const indices = [...selectedForDiscard].sort((a, b) => b - a); // descending for safe removal
    setState(prev => discardToCrib(prev, currentPlayer, indices));
    setSelectedForDiscard([]);
  }, [selectedForDiscard, canConfirmDiscard, currentPlayer]);

  // Low-level discard (still available)
  const discard = useCallback((indices: number[]) => {
    setSelectedForDiscard([]);
    setState(prev => discardToCrib(prev, currentPlayer, indices));
  }, [currentPlayer]);

  const play = useCallback((index: number) => {
    setState(prev => playCard(prev, currentPlayer, index));
  }, [currentPlayer]);

  const sayGo = useCallback(() => {
    setState(prev => declareGo(prev, currentPlayer));
  }, [currentPlayer]);

  const advanceToNextRound = useCallback(() => {
    setSelectedForDiscard([]);
    setState(prev => advanceRound(prev));
  }, []);

  const isMyTurn = true;

  return {
    state,
    isMyTurn,
    legalPlays,
    selectedForDiscard,
    toggleDiscardSelection,
    canConfirmDiscard,
    confirmDiscard,
    startNewGame,
    discard,
    playCard: play,
    sayGo,
    advanceToNextRound,
  };
}
