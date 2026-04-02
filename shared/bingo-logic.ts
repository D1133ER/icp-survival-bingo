/**
 * Pure bingo logic functions shared by server and client.
 * No side effects, no imports from server or client code.
 */

import { BINGO_ITEMS, BINGO_EMOJIS } from './bingo-data';

export { BINGO_ITEMS, BINGO_EMOJIS } from './bingo-data';

export function getBingoItemText(index: number): string {
  return BINGO_ITEMS[index - 1] ?? String(index);
}

export function getBingoEmoji(index: number): string {
  return BINGO_EMOJIS[index] ?? '📌';
}

export function checkBingo(card: number[][], calledNumbers: number[]): boolean {
  const calledSet = new Set(calledNumbers);
  calledSet.add(0); // FREE square always counts

  for (let row = 0; row < 5; row++) {
    if (card[row].every(n => calledSet.has(n))) return true;
  }
  for (let col = 0; col < 5; col++) {
    if (card.every(r => calledSet.has(r[col]))) return true;
  }
  if ([0, 1, 2, 3, 4].every(i => calledSet.has(card[i][i]))) return true;
  if ([0, 1, 2, 3, 4].every(i => calledSet.has(card[i][4 - i]))) return true;

  return false;
}

export function getWinningCells(card: number[][], calledNumbers: number[]): Set<string> {
  const calledSet = new Set(calledNumbers);
  calledSet.add(0);
  const winning = new Set<string>();

  for (let row = 0; row < 5; row++) {
    if (card[row].every(n => calledSet.has(n))) {
      for (let col = 0; col < 5; col++) winning.add(`${row}-${col}`);
    }
  }
  for (let col = 0; col < 5; col++) {
    if (card.every(r => calledSet.has(r[col]))) {
      for (let row = 0; row < 5; row++) winning.add(`${row}-${col}`);
    }
  }
  if ([0, 1, 2, 3, 4].every(i => calledSet.has(card[i][i]))) {
    for (let i = 0; i < 5; i++) winning.add(`${i}-${i}`);
  }
  if ([0, 1, 2, 3, 4].every(i => calledSet.has(card[i][4 - i]))) {
    for (let i = 0; i < 5; i++) winning.add(`${i}-${4 - i}`);
  }

  return winning;
}

export const COLUMN_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
] as const;

/** Fisher-Yates shuffle (in-place, returns same array) */
export function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick 25 random item indices (1-based) from the full pool */
export function selectItemPool(): number[] {
  const all = Array.from({ length: BINGO_ITEMS.length }, (_, i) => i + 1);
  return fisherYatesShuffle(all).slice(0, 25);
}

/**
 * Generate a shuffled 5x5 card from the given item pool.
 * If freeSquare is true, the center cell (row 2, col 2) is set to 0 (FREE).
 */
export function generateCard(itemPool: number[], freeSquare: boolean): number[][] {
  const items = fisherYatesShuffle([...itemPool]);
  const card = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => items[row * 5 + col])
  );
  if (freeSquare) {
    card[2][2] = 0; // 0 = FREE square
  }
  return card;
}
