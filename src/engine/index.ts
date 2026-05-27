/**
 * Cribbage Engine — Public API
 *
 * Pure functions only. Import from here in game hooks, AI, and server.
 */

export * from './types';
export * from './rng';
export * from './cards';
export * from './scoring';
export * from './engine';   // Pure state transitions (createGame, playCard, advanceRound, etc.)

// Convenience re-exports for common use
export { hasHisHeels } from './scoring';
