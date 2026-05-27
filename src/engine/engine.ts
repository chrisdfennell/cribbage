/**
 * Cribbage Engine — Pure State Transitions
 *
 * This is the heart of the game.
 *
 * Every exported function is:
 *   (GameState, ...args) => GameState
 *
 * Rules:
 * - Always return the SAME reference on illegal / no-op moves (critical for UI + server)
 * - State is always fully serializable plain data
 * - RNG is always threaded via state.rngState
 * - No React, no DOM, no side effects
 *
 * This design (directly inspired by Townstone) gives us:
 * - Perfect testability
 * - Reproducible games
 * - Strong AI via simulation
 * - Authoritative multiplayer with perspective redaction
 */

import type {
  Card,
  GameState,
  NewGameOptions,
  PlayerId,
  PlayerState,
} from './types';
import { shuffle } from './rng';
import { createDeck, getCardValue } from './cards';
import { scorePlay, scoreHand, scoreCrib } from './scoring';

// ---------------------------------------------------------------------------
// Internal Helpers (pure)
// ---------------------------------------------------------------------------

function clone<T>(obj: T): T {
  return structuredClone(obj);
}

function emptyPlayer(id: PlayerId, name: string, isDealer: boolean): PlayerState {
  return {
    id,
    name,
    score: 0,
    pegs: [
      { owner: id, lane: 0, position: 0 },
      { owner: id, lane: 1, position: 0 },
    ],
    hand: [],
    isDealer,
    hasGone: false,
  };
}

// ---------------------------------------------------------------------------
// Game Creation & Setup
// ---------------------------------------------------------------------------

export function createGame(opts: NewGameOptions): GameState {
  const playerCount = opts.playerCount;
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);

  const ids: PlayerId[] = (['p1', 'p2', 'p3', 'p4'] as const).slice(0, playerCount);
  const names = opts.names ?? {};

  const players: Record<PlayerId, PlayerState> = {} as any;
  ids.forEach((id, index) => {
    players[id] = emptyPlayer(
      id,
      names[id] ?? `Player ${index + 1}`,
      index === 0 // p1 starts as dealer for simplicity
    );
  });

  const state: GameState = {
    players,
    phase: 'deal',
    currentPlayer: ids[0],
    dealer: ids[0],
    round: 1,
    deck: [],
    starter: null,
    crib: [],
    playPile: [],
    playTotal: 0,
    winner: null,
    skunked: false,
    doubleSkunked: false,
    rngState: seed,
    log: [],
    pendingDiscard: undefined,
    lastAction: undefined,
    playPasses: [],
    lastPlayerToPlay: null,
  };

  return deal(state);
}

// ---------------------------------------------------------------------------
// Deal
// ---------------------------------------------------------------------------

export function deal(state: GameState): GameState {
  if (state.phase !== 'deal') return state;

  const s = clone(state);
  const playerIds = Object.keys(s.players) as PlayerId[];
  const count = playerIds.length;

  // Create and shuffle deck
  let deck = createDeck();
  const shuffled = shuffle(deck, s.rngState);
  s.deck = shuffled.items;
  s.rngState = shuffled.state;

  // Deal cards: 6 cards per player in 2-player, 5 in 3-player, 4 in 4-player
  const cardsPerPlayer = count === 2 ? 6 : count === 3 ? 5 : 4;

  // Clear hands and crib
  playerIds.forEach(id => (s.players[id].hand = []));
  s.crib = [];
  s.playPile = [];
  s.playTotal = 0;
  s.starter = null;
  s.phase = 'discard';

  // Deal cards (round-robin)
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (const id of playerIds) {
      const card = s.deck.pop()!;
      s.players[id].hand.push(card);
    }
  }

  // Determine who discards first (player left of dealer)
  const dealerIdx = playerIds.indexOf(s.dealer);
  s.currentPlayer = playerIds[(dealerIdx + 1) % count];

  s.pendingDiscard = s.currentPlayer;
  s.log.push(`Round ${s.round} dealt. ${s.players[s.currentPlayer].name} to discard first.`);

  return s;
}

// ---------------------------------------------------------------------------
// Discard to Crib
// ---------------------------------------------------------------------------

export function canDiscard(state: GameState, player: PlayerId, cardIndices: number[]): boolean {
  if (state.phase !== 'discard') return false;
  if (state.currentPlayer !== player) return false;

  const hand = state.players[player].hand;
  if (cardIndices.length !== 2) return false; // always discard exactly 2

  // No duplicates and valid indices
  const unique = new Set(cardIndices);
  if (unique.size !== 2) return false;
  if (cardIndices.some(i => i < 0 || i >= hand.length)) return false;

  return true;
}

export function discardToCrib(
  state: GameState,
  player: PlayerId,
  cardIndices: number[]
): GameState {
  if (!canDiscard(state, player, cardIndices)) return state;

  const s = clone(state);
  const hand = s.players[player].hand;

  // Sort descending so we don't shift indices
  const sorted = [...cardIndices].sort((a, b) => b - a);

  const discarded: Card[] = [];
  for (const idx of sorted) {
    discarded.push(hand.splice(idx, 1)[0]);
  }

  s.crib.push(...discarded.reverse()); // keep some order
  s.log.push(`${s.players[player].name} discarded 2 cards to the crib.`);

  // Advance to next player who still needs to discard
  const playerIds = Object.keys(s.players) as PlayerId[];
  const currentIdx = playerIds.indexOf(player);
  let nextPlayer = playerIds[(currentIdx + 1) % playerIds.length];

  // Skip players who have already discarded 2 cards
  while (
    nextPlayer !== player &&
    s.players[nextPlayer].hand.length !== (playerIds.length === 2 ? 4 : playerIds.length === 3 ? 3 : 2)
  ) {
    nextPlayer = playerIds[(playerIds.indexOf(nextPlayer) + 1) % playerIds.length];
  }

  if (s.players[nextPlayer].hand.length === (playerIds.length === 2 ? 4 : playerIds.length === 3 ? 3 : 2)) {
    // Everyone has discarded — cut the starter and move to play
    return cutStarter(s);
  }

  s.currentPlayer = nextPlayer;
  s.pendingDiscard = nextPlayer;
  return s;
}

// ---------------------------------------------------------------------------
// Cut Starter + His Heels
// ---------------------------------------------------------------------------

function cutStarter(state: GameState): GameState {
  const s = clone(state);
  if (s.deck.length === 0) return s;

  const cut = s.deck.pop()!;
  s.starter = cut;
  s.log.push(`Starter cut: ${cut.rank}${cut.suit}`);

  // His Heels (2 points to dealer)
  if (cut.rank === 'J') {
    const dealer = s.dealer;
    s.players[dealer].score += 2;
    s.log.push(`${s.players[dealer].name} scores 2 for his heels.`);
  }

  // Move to play phase
  s.phase = 'play';
  s.playPile = [];
  s.playTotal = 0;
  s.playPasses = [];
  s.lastPlayerToPlay = null;

  // Player left of dealer starts the pegging
  const ids = Object.keys(s.players) as PlayerId[];
  const dealerIdx = ids.indexOf(s.dealer);
  s.currentPlayer = ids[(dealerIdx + 1) % ids.length];
  s.players[s.currentPlayer].hasGone = false;

  return s;
}

// ---------------------------------------------------------------------------
// Play / Pegging Phase
// ---------------------------------------------------------------------------

export function canPlayCard(state: GameState, player: PlayerId, cardIndex: number): boolean {
  if (state.phase !== 'play') return false;
  if (state.currentPlayer !== player) return false;

  const hand = state.players[player].hand;
  if (cardIndex < 0 || cardIndex >= hand.length) return false;

  const card = hand[cardIndex];
  const newTotal = state.playTotal + getCardValue(card);

  return newTotal <= 31;
}

export function playCard(state: GameState, player: PlayerId, cardIndex: number): GameState {
  if (!canPlayCard(state, player, cardIndex)) return state;

  const s = clone(state);
  const hand = s.players[player].hand;
  const card = hand.splice(cardIndex, 1)[0];

  const prevTotal = s.playTotal;
  s.playPile.push(card);
  s.playTotal = prevTotal + getCardValue(card);

  // Real scoring
  const playScore = scorePlay(s.playPile.slice(0, -1), card);
  if (playScore.points > 0) {
    s.players[player].score += playScore.points;
    s.log.push(`${s.players[player].name} scores ${playScore.points} for ${playScore.reason}`);
  }

  s.log.push(`${s.players[player].name} plays ${card.rank}${card.suit} (total ${s.playTotal})`);

  // Reset all passes because someone played
  s.playPasses = [];
  s.lastPlayerToPlay = player;

  // Advance turn
  const ids = Object.keys(s.players) as PlayerId[];
  const idx = ids.indexOf(player);
  s.currentPlayer = ids[(idx + 1) % ids.length];

  // Handle 31
  if (s.playTotal === 31) {
    awardLastCardIfNeeded(s);
    resetPlayCount(s);
    s.log.push('31 — count resets.');
  }

  // Check if we should end the entire play phase (everyone out of cards)
  if (allPlayersOutOfCards(s)) {
    return endPlayPhase(s);
  }

  return s;
}

// ---------------------------------------------------------------------------
// Go Logic (much more complete)
// ---------------------------------------------------------------------------

export function declareGo(state: GameState, player: PlayerId): GameState {
  if (state.phase !== 'play') return state;
  if (state.currentPlayer !== player) return state;

  const s = clone(state);

  if (!s.playPasses.includes(player)) {
    s.playPasses.push(player);
  }
  s.log.push(`${s.players[player].name} says "Go".`);

  const ids = Object.keys(s.players) as PlayerId[];
  const activePlayers = ids.filter(id => s.players[id].hand.length > 0);

  // Award point for the Go if the opponent(s) can still play
  const opponentCanPlay = activePlayers.some(id =>
    id !== player && getLegalPlays(s, id).length > 0
  );

  if (!opponentCanPlay && s.lastPlayerToPlay) {
    // Everyone else has passed or can't move → last player who played gets 1 for the Go
    s.players[s.lastPlayerToPlay].score += 1;
    s.log.push(`${s.players[s.lastPlayerToPlay].name} scores 1 for the Go.`);
  }

  // Advance to next player who still has cards
  let next = ids[(ids.indexOf(player) + 1) % ids.length];
  let safety = 0;
  while (s.players[next].hand.length === 0 && safety < 10) {
    next = ids[(ids.indexOf(next) + 1) % ids.length];
    safety++;
  }
  s.currentPlayer = next;

  // If every active player has passed in this count → Last Card + reset
  const activeWhoHaveNotPassed = activePlayers.filter(p => !s.playPasses.includes(p));
  if (activeWhoHaveNotPassed.length === 0 && s.lastPlayerToPlay) {
    s.players[s.lastPlayerToPlay].score += 1;
    s.log.push(`${s.players[s.lastPlayerToPlay].name} scores 1 for Last Card.`);
    resetPlayCount(s);
  }

  if (allPlayersOutOfCards(s)) {
    return endPlayPhase(s);
  }

  return s;
}

function awardLastCardIfNeeded(s: GameState) {
  if (s.lastPlayerToPlay) {
    s.players[s.lastPlayerToPlay].score += 1;
    s.log.push(`${s.players[s.lastPlayerToPlay].name} scores 1 for Last Card.`);
  }
}

function resetPlayCount(s: GameState) {
  s.playTotal = 0;
  s.playPile = [];
  s.playPasses = [];
}

function allPlayersOutOfCards(s: GameState): boolean {
  return Object.values(s.players).every(p => p.hand.length === 0);
}

// ---------------------------------------------------------------------------
// End of Play Phase → Show
// ---------------------------------------------------------------------------

function endPlayPhase(state: GameState): GameState {
  const s = clone(state);
  s.phase = 'show';
  s.log.push('All cards played. Moving to Show phase.');

  // Award final Last Card if someone played the very last card
  if (s.lastPlayerToPlay && s.playTotal > 0) {
    s.players[s.lastPlayerToPlay].score += 1;
    s.log.push(`${s.players[s.lastPlayerToPlay].name} scores 1 for Last Card.`);
  }

  return scoreShowPhase(s);
}

// ---------------------------------------------------------------------------
// Show Phase - Score Hands + Crib
// ---------------------------------------------------------------------------

function scoreShowPhase(state: GameState): GameState {
  const s = clone(state);

  const ids = Object.keys(s.players) as PlayerId[];
  const dealer = s.dealer;

  // In standard cribbage, non-dealer hands are scored first, then dealer, then crib.
  const nonDealers = ids.filter(id => id !== dealer);

  // Score non-dealer hands
  for (const id of nonDealers) {
    const hand = s.players[id].hand;
    if (hand.length > 0 && s.starter) {
      const result = scoreHand(hand, s.starter, false);
      s.players[id].score += result.total;
      s.log.push(`${s.players[id].name} scores ${result.total} in show.`);
    }
  }

  // Score dealer hand
  const dealerHand = s.players[dealer].hand;
  if (dealerHand.length > 0 && s.starter) {
    const result = scoreHand(dealerHand, s.starter, false);
    s.players[dealer].score += result.total;
    s.log.push(`${s.players[dealer].name} scores ${result.total} in show.`);
  }

  // Score crib (dealer gets it)
  if (s.crib.length > 0 && s.starter) {
    const result = scoreCrib(s.crib, s.starter);
    s.players[dealer].score += result.total;
    s.log.push(`${s.players[dealer].name} scores ${result.total} for the crib.`);
  }

  // Check for win + skunk
  const winnerId = ids.find(id => s.players[id].score >= 121);
  if (winnerId) {
    const loserScore = Math.max(...ids.filter(id => id !== winnerId).map(id => s.players[id].score));

    s.winner = winnerId;
    s.skunked = loserScore < 91;
    s.doubleSkunked = loserScore < 61;

    if (s.doubleSkunked) {
      s.log.push(`${s.players[winnerId].name} wins with a DOUBLE SKUNK!`);
    } else if (s.skunked) {
      s.log.push(`${s.players[winnerId].name} wins with a SKUNK!`);
    } else {
      s.log.push(`${s.players[winnerId].name} wins the game!`);
    }

    s.phase = 'gameOver';
  } else {
    s.phase = 'roundEnd';
  }

  return s;
}

// ---------------------------------------------------------------------------
// Round Advancement
// ---------------------------------------------------------------------------

export function advanceRound(state: GameState): GameState {
  if (state.phase !== 'roundEnd' && state.phase !== 'show') return state;

  const s = clone(state);

  const ids = Object.keys(s.players) as PlayerId[];
  const currentDealerIdx = ids.indexOf(s.dealer);
  const nextDealer = ids[(currentDealerIdx + 1) % ids.length];

  // Rotate dealer
  s.dealer = nextDealer;
  ids.forEach(id => (s.players[id].isDealer = id === nextDealer));

  // Reset per-round state
  s.round += 1;
  s.playPasses = [];
  s.lastPlayerToPlay = null;
  s.crib = [];
  s.starter = null;
  s.playPile = [];
  s.playTotal = 0;

  // Clear hands
  ids.forEach(id => (s.players[id].hand = []));

  s.phase = 'deal';
  s.log.push(`--- Starting Round ${s.round} ---`);

  return deal(s);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function getLegalPlays(state: GameState, player: PlayerId): number[] {
  if (state.phase !== 'play' || state.currentPlayer !== player) return [];
  const hand = state.players[player].hand;
  const legal: number[] = [];

  for (let i = 0; i < hand.length; i++) {
    if (canPlayCard(state, player, i)) legal.push(i);
  }
  return legal;
}
