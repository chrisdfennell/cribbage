/**
 * Cribbage Engine — Core Types
 *
 * All state is plain serializable data. No classes, no functions inside state.
 * This enables:
 * - Perfect determinism (with seeded RNG)
 * - Authoritative server with perspective redaction
 * - AI simulation via pure engine functions
 * - Exhaustive unit testing
 */

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4';

export type Suit = 'H' | 'D' | 'C' | 'S';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Phase =
  | 'deal'
  | 'discard'
  | 'play'
  | 'show'
  | 'roundEnd'
  | 'gameOver';

export interface PegPosition {
  owner: PlayerId;
  lane: 0 | 1;        // two tracks per player for leapfrogging
  position: number;   // 0-120 (121 is the game hole)
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  score: number;
  pegs: [PegPosition, PegPosition]; // front + back peg
  hand: Card[];
  isDealer: boolean;
  hasGone: boolean; // in the play phase
}

export interface GameState {
  // Core
  players: Record<PlayerId, PlayerState>;
  phase: Phase;
  currentPlayer: PlayerId;
  dealer: PlayerId;
  round: number;

  // Cards
  deck: Card[];
  starter: Card | null;        // the "cut" card
  crib: Card[];
  playPile: Card[];            // current pegging sequence
  playTotal: number;           // running count (0-31)

  // State
  winner: PlayerId | null;
  skunked: boolean;            // winner reached 121 while opponent < 91
  doubleSkunked: boolean;

  // RNG (never call Math.random() inside engine)
  rngState: number;

  // For replay / debugging
  log: string[];

  // Transient UI / server hints (still serializable)
  pendingDiscard?: PlayerId;   // who still needs to discard to crib
  lastAction?: string;

  // Pegging / Play phase tracking (pure state)
  playPasses: PlayerId[];      // Players who have said "Go" in the current count
  lastPlayerToPlay: PlayerId | null;
}

export interface NewGameOptions {
  seed?: number;
  playerCount: 2 | 3 | 4;
  names?: Partial<Record<PlayerId, string>>;
}

/** Reference to a card in a specific location (used for client actions + perspective) */
export type CardRef =
  | { type: 'hand'; player: PlayerId; index: number }
  | { type: 'crib'; index: number }
  | { type: 'play'; index: number }
  | { type: 'starter' };
