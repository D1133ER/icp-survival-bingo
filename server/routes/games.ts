import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// ICP Survival Bingo items (indices 1-25; no FREE square)
const BINGO_ITEMS = [
  'All-nighter before submission',
  'Debugged code for 2+ hours',
  'Used ChatGPT for assignment',
  '"I\'ll start early next time"',
  'Python vs Java confusion',
  'Attended class for attendance',
  'Googled error & copied fix',
  'Did all the group work',
  'Forgot deadline, panicked',
  'Learned from YouTube not class',
  'AI tools saved the day',
  'Code finally ran!',
  'Survived a surprise quiz',
  'WiFi issues on submission day',
  'Thought of a startup idea',
  'Skipped breakfast for class',
  'Submitted 1 min before deadline',
  'Copy-pasted code from GitHub',
  "Teacher said 'revise basics'",
  'Presentation stage fright',
  'Begged for deadline extension',
  'Zoom / online class glitch',
  'Stack Overflow to the rescue',
  'Pulled exam-night all-nighter',
  'Celebrated when code compiled',
];

// --- Helpers ---

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateCard(): number[][] {
  // Shuffle item indices 1-25 into a 5×5 grid (no FREE square)
  const items = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => items[row * 5 + col])
  );
}

function checkBingo(card: number[][], calledNumbers: number[]): boolean {
  const calledSet = new Set(calledNumbers);

  // Rows
  for (let row = 0; row < 5; row++) {
    if (card[row].every(n => calledSet.has(n))) return true;
  }
  // Columns
  for (let col = 0; col < 5; col++) {
    if (card.every(r => calledSet.has(r[col]))) return true;
  }
  // Main diagonal
  if ([0, 1, 2, 3, 4].every(i => calledSet.has(card[i][i]))) return true;
  // Anti-diagonal
  if ([0, 1, 2, 3, 4].every(i => calledSet.has(card[i][4 - i]))) return true;

  return false;
}

// --- Routes ---

// GET /api/games/:code
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });

    const game = gameResult.rows[0];

    const playersResult = await pool.query(
      'SELECT id, name, is_host, has_won, card FROM players WHERE game_id = $1 ORDER BY joined_at',
      [game.id]
    );
    const calledResult = await pool.query(
      'SELECT number FROM called_numbers WHERE game_id = $1 ORDER BY called_at',
      [game.id]
    );

    const calledSet = new Set<number>(calledResult.rows.map((r: { number: number }) => r.number));
    const players = playersResult.rows.map((p: { id: number; name: string; is_host: boolean; has_won: boolean; card: number[][] }) => {
      let matchedCount = 0;
      for (const row of (p.card as number[][])) {
        for (const num of row) {
          if (calledSet.has(num)) matchedCount++;
        }
      }
      return { id: p.id, name: p.name, is_host: p.is_host, has_won: p.has_won, matched_count: matchedCount };
    });

    return res.json({
      id: game.id,
      code: game.code,
      status: game.status,
      winner_name: game.winner_name,
      players,
      called_numbers: calledResult.rows.map((r: { number: number }) => r.number),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games — Create a game
router.post('/', async (req: Request, res: Response) => {
  try {
    const { hostName } = req.body;
    if (!hostName || !String(hostName).trim()) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    // Generate a unique code
    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const existing = await pool.query('SELECT id FROM games WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      code = generateCode();
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const gameResult = await client.query(
        'INSERT INTO games (code) VALUES ($1) RETURNING *',
        [code]
      );
      const game = gameResult.rows[0];

      const card = generateCard();
      const playerResult = await client.query(
        'INSERT INTO players (game_id, name, is_host, card) VALUES ($1, $2, TRUE, $3) RETURNING *',
        [game.id, String(hostName).trim(), JSON.stringify(card)]
      );
      const player = playerResult.rows[0];

      await client.query('COMMIT');

      return res.status(201).json({
        code: game.code,
        playerId: player.id,
        card: player.card,
        isHost: true,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/join
router.post('/:code/join', async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { playerName } = req.body;
    if (!playerName || !String(playerName).trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });

    const game = gameResult.rows[0];
    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game has already started' });
    }

    const card = generateCard();
    const playerResult = await pool.query(
      'INSERT INTO players (game_id, name, is_host, card) VALUES ($1, $2, FALSE, $3) RETURNING *',
      [game.id, String(playerName).trim(), JSON.stringify(card)]
    );
    const player = playerResult.rows[0];

    return res.status(201).json({
      playerId: player.id,
      card: player.card,
      isHost: false,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/start
router.post('/:code/start', async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { playerId } = req.body;

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });

    const game = gameResult.rows[0];
    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game has already started' });
    }

    const hostResult = await pool.query(
      'SELECT * FROM players WHERE id = $1 AND game_id = $2 AND is_host = TRUE',
      [playerId, game.id]
    );
    if (hostResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only the teacher can start the game' });
    }

    await pool.query(
      'UPDATE games SET status = $1, started_at = NOW() WHERE id = $2',
      ['playing', game.id]
    );

    return res.json({ status: 'playing' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/call — Host calls the next number
router.post('/:code/call', async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { playerId, specificNumber } = req.body;

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });

    const game = gameResult.rows[0];
    if (game.status !== 'playing') {
      return res.status(400).json({ error: 'Game is not in progress' });
    }

    const playerResult = await pool.query(
      'SELECT * FROM players WHERE id = $1 AND game_id = $2',
      [playerId, game.id]
    );
    if (playerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Player not in this game' });
    }

    const calledResult = await pool.query(
      'SELECT number FROM called_numbers WHERE game_id = $1',
      [game.id]
    );
    const calledNumbers: number[] = calledResult.rows.map((r: { number: number }) => r.number);
    const calledSet = new Set(calledNumbers);

    const available = Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !calledSet.has(n));
    if (available.length === 0) {
      return res.status(400).json({ error: 'All items have been called' });
    }

    let number: number;
    if (specificNumber != null) {
      const n = Number(specificNumber);
      if (!available.includes(n)) {
        return res.status(400).json({ error: 'Item already called or invalid' });
      }
      number = n;
    } else {
      number = available[Math.floor(Math.random() * available.length)];
    }

    await pool.query('INSERT INTO called_numbers (game_id, number) VALUES ($1, $2)', [game.id, number]);

    const newCalledNumbers = [...calledNumbers, number];

    // Check all players for bingo
    const playersResult = await pool.query(
      'SELECT id, name, card FROM players WHERE game_id = $1',
      [game.id]
    );
    for (const player of playersResult.rows) {
      if (checkBingo(player.card as number[][], newCalledNumbers)) {
        await pool.query('UPDATE players SET has_won = TRUE WHERE id = $1', [player.id]);
        await pool.query(
          'UPDATE games SET status = $1, winner_name = $2, finished_at = NOW() WHERE id = $3',
          ['finished', player.name, game.id]
        );
        return res.json({ number, itemText: BINGO_ITEMS[number - 1], winner: player.name, gameOver: true });
      }
    }

    return res.json({ number, itemText: BINGO_ITEMS[number - 1], gameOver: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
