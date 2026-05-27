/**
 * Pure card utilities for the Cribbage engine.
 * All functions are deterministic and side-effect free.
 */

import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Returns the numeric value of a card for scoring (A=1, face cards = 10). */
export function getCardValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return parseInt(card.rank, 10);
}

/** Returns a human-readable string for a card (e.g. "AH", "10S", "KD"). */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/** Parse a string like "AH" or "10S" back into a Card. */
export function parseCard(str: string): Card {
  const match = str.match(/^(\d+|[AJQK])([HDCS])$/i);
  if (!match) throw new Error(`Invalid card string: ${str}`);

  let rankStr = match[1].toUpperCase();
  if (rankStr === '1') rankStr = '10';
  const rank = rankStr as Rank;
  const suit = match[2].toUpperCase() as Suit;

  return { rank, suit };
}

/** Create a standard 52-card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Check if two cards are the same. */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Return a sorted copy of cards by value (useful for run detection). */
export function sortByValue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getCardValue(a) - getCardValue(b));
}

/** Generate all combinations of a given size. Used heavily for 15s and pairs. */
export function getAllCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length === 0) return [];

  const result: T[][] = [];
  const first = arr[0];
  const rest = arr.slice(1);

  // Combinations that include the first element
  for (const combo of getAllCombinations(rest, size - 1)) {
    result.push([first, ...combo]);
  }
  // Combinations that exclude the first element
  result.push(...getAllCombinations(rest, size));

  return result;
}
