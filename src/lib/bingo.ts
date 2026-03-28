export const BINGO_ITEMS = [
  'All-nighter before submission',
  'Debugged code for 2+ hours',
  'Used ChatGPT for assignment',
  '"I\'ll start early next time"',
  'Python vs Java confusion',
  'Attended class for attendance',
  'Googled error & copied fix',
  'Did all the group work 💀',
  'Forgot deadline, panicked',
  'Learned from YouTube not class',
  'AI tools saved the day 🤖',
  'Code finally ran! 🎉',
  'Survived a surprise quiz',
  'WiFi issues on submission day',
  'Thought of a startup idea 💡',
  'Skipped breakfast for class ☕',
  'Submitted 1 min before deadline',
  'Copy-pasted code from GitHub',
  "Teacher said 'revise basics'",
  'Presentation stage fright 😨',
  'Begged for deadline extension',
  'Zoom / online class glitch 💻',
  'Stack Overflow to the rescue 📚',
  'Pulled exam-night all-nighter',
  'Celebrated when code compiled',
] as const;

export const BINGO_EMOJIS: Record<number, string> = {
  1: '😴', 2: '🐛', 3: '🤖', 4: '😅', 5: '🐍',
  6: '💺', 7: '🔍', 8: '💪', 9: '😱', 10: '📺',
  11: '🛠️', 12: '🎉', 13: '😬', 14: '📶', 15: '💡',
  16: '☕', 17: '⏰', 18: '😅', 19: '👨‍🏫', 20: '😨',
  21: '🙏', 22: '💻', 23: '📚', 24: '😰', 25: '🎊',
};

export function getBingoItemText(index: number): string {
  return BINGO_ITEMS[index - 1] ?? String(index);
}

export function getBingoEmoji(index: number): string {
  return BINGO_EMOJIS[index] ?? '📌';
}

export function checkBingo(card: number[][], calledNumbers: number[]): boolean {
  const calledSet = new Set(calledNumbers);

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
