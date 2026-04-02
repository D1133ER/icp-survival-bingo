import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { generateToken, requireAuth, requireHost } from '../middleware/auth';
import {
  validateBody,
  createGameSchema,
  joinGameSchema,
  callNumberSchema,
  markCellsSchema,
  declareWinnerSchema,
} from '../middleware/validate';
import { createGameLimiter } from '../middleware/rate-limit';
import { checkBingo, selectItemPool, generateCard, getBingoItemText } from '../../shared/bingo-logic';
import type { GameStateResponse, PlayerSummary } from '../../shared/types';
import { getIO } from '../ws';

const router = Router();

// --- Helpers ---

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- Routes ---

// GET /api/games/:code — Public game state (no auth needed for polling)
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const game = gameResult.rows[0];

    const playersResult = await pool.query(
      'SELECT id, name, is_host, has_won, card, manually_marked FROM players WHERE game_id = $1 ORDER BY joined_at',
      [game.id]
    );
    const calledResult = await pool.query(
      'SELECT number FROM called_numbers WHERE game_id = $1 ORDER BY called_at',
      [game.id]
    );

    const calledSet = new Set<number>(calledResult.rows.map((r: { number: number }) => r.number));
    const players: PlayerSummary[] = playersResult.rows.map((p: {
      id: number; name: string; is_host: boolean; has_won: boolean;
      card: number[][]; manually_marked: number[];
    }) => {
      let matchedCount = 0;
      for (const row of p.card) {
        for (const num of row) {
          if (num === 0 || calledSet.has(num)) matchedCount++;
        }
      }
      return {
        id: p.id,
        name: p.name,
        is_host: p.is_host,
        has_won: p.has_won,
        matched_count: matchedCount,
        manually_marked: p.manually_marked ?? [],
        card: p.card,
      };
    });

    const response: GameStateResponse = {
      id: game.id,
      code: game.code,
      status: game.status,
      winner_name: game.winner_name,
      free_square: game.free_square ?? false,
      item_pool: game.item_pool ?? [],
      players,
      called_numbers: calledResult.rows.map((r: { number: number }) => r.number),
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games — Create a game (rate-limited, validated)
router.post('/', createGameLimiter, validateBody(createGameSchema), async (req: Request, res: Response) => {
  try {
    const { hostName, freeSquare } = req.body as { hostName: string; freeSquare: boolean };

    // Generate a unique code with retry
    let code = generateCode();
    for (let i = 0; i < 20; i++) {
      const existing = await pool.query('SELECT id FROM games WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      code = generateCode();
      if (i === 19) {
        res.status(503).json({ error: 'Unable to generate unique game code, try again' });
        return;
      }
    }

    const itemPool = selectItemPool();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const gameResult = await client.query(
        'INSERT INTO games (code, free_square, item_pool) VALUES ($1, $2, $3) RETURNING *',
        [code, freeSquare, JSON.stringify(itemPool)]
      );
      const game = gameResult.rows[0];

      const card = generateCard(itemPool, freeSquare);
      const token = generateToken({ playerId: 0, gameCode: code, isHost: true }); // temp id

      const playerResult = await client.query(
        'INSERT INTO players (game_id, name, is_host, card, token) VALUES ($1, $2, TRUE, $3, $4) RETURNING *',
        [game.id, hostName, JSON.stringify(card), '']
      );
      const player = playerResult.rows[0];

      // Generate real token with the actual playerId
      const realToken = generateToken({ playerId: player.id, gameCode: code, isHost: true });
      await client.query('UPDATE players SET token = $1 WHERE id = $2', [realToken, player.id]);

      await client.query('COMMIT');

      res.status(201).json({
        code: game.code,
        playerId: player.id,
        token: realToken,
        card: player.card,
        isHost: true,
        freeSquare,
        itemPool,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/join (validated)
router.post('/:code/join', validateBody(joinGameSchema), async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { playerName } = req.body as { playerName: string };

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const game = gameResult.rows[0];
    if (game.status !== 'waiting') {
      res.status(400).json({ error: 'Game has already started' });
      return;
    }

    // Prevent duplicate names
    const existingName = await pool.query(
      'SELECT id FROM players WHERE game_id = $1 AND LOWER(name) = LOWER($2)',
      [game.id, playerName]
    );
    if (existingName.rows.length > 0) {
      res.status(400).json({ error: 'A player with that name has already joined' });
      return;
    }

    const itemPool: number[] = game.item_pool && (game.item_pool as number[]).length === 25
      ? game.item_pool as number[]
      : Array.from({ length: 25 }, (_, i) => i + 1);
    const card = generateCard(itemPool, game.free_square ?? false);

    const playerResult = await pool.query(
      'INSERT INTO players (game_id, name, is_host, card, token) VALUES ($1, $2, FALSE, $3, $4) RETURNING *',
      [game.id, playerName, JSON.stringify(card), '']
    );
    const player = playerResult.rows[0];

    const token = generateToken({ playerId: player.id, gameCode: code, isHost: false });
    await pool.query('UPDATE players SET token = $1 WHERE id = $2', [token, player.id]);

    // Emit WebSocket event
    getIO()?.to(code).emit('player-joined', { id: player.id, name: playerName });

    res.status(201).json({
      playerId: player.id,
      token,
      card: player.card,
      isHost: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/start (auth required, host only)
router.post('/:code/start', requireAuth, requireHost, async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const game = gameResult.rows[0];
    if (game.status !== 'waiting') {
      res.status(400).json({ error: 'Game has already started' });
      return;
    }

    await pool.query(
      'UPDATE games SET status = $1, started_at = NOW() WHERE id = $2',
      ['playing', game.id]
    );

    getIO()?.to(code).emit('game-started', { status: 'playing' });

    res.json({ status: 'playing' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/call — Host calls the next number (auth, host, race-safe)
router.post('/:code/call', requireAuth, requireHost, validateBody(callNumberSchema), async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { specificNumber } = req.body as { specificNumber?: number };

    // Use a transaction with row-level locking to prevent race conditions
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the game row to prevent concurrent calls
      const gameResult = await client.query(
        'SELECT * FROM games WHERE code = $1 FOR UPDATE',
        [code]
      );
      if (gameResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const game = gameResult.rows[0];
      if (game.status !== 'playing') {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Game is not in progress' });
        return;
      }

      const calledResult = await client.query(
        'SELECT number FROM called_numbers WHERE game_id = $1',
        [game.id]
      );
      const calledNumbers: number[] = calledResult.rows.map((r: { number: number }) => r.number);
      const calledSet = new Set(calledNumbers);

      const available = Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !calledSet.has(n));
      if (available.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'All items have been called' });
        return;
      }

      let number: number;
      if (specificNumber != null) {
        if (!available.includes(specificNumber)) {
          await client.query('ROLLBACK');
          res.status(400).json({ error: 'Item already called or invalid' });
          return;
        }
        number = specificNumber;
      } else {
        number = available[Math.floor(Math.random() * available.length)];
      }

      await client.query('INSERT INTO called_numbers (game_id, number) VALUES ($1, $2)', [game.id, number]);

      const newCalledNumbers = [...calledNumbers, number];

      // Check ALL players for bingo
      const playersResult = await client.query(
        'SELECT id, name, card FROM players WHERE game_id = $1',
        [game.id]
      );
      const winners: { id: number; name: string }[] = [];
      for (const player of playersResult.rows) {
        if (checkBingo(player.card as number[][], newCalledNumbers)) {
          winners.push({ id: player.id, name: player.name });
        }
      }

      if (winners.length > 0) {
        for (const w of winners) {
          await client.query('UPDATE players SET has_won = TRUE WHERE id = $1', [w.id]);
        }
        const winnerNames = winners.map(w => w.name).join(', ');
        await client.query(
          'UPDATE games SET status = $1, winner_name = $2, finished_at = NOW() WHERE id = $3',
          ['finished', winnerNames, game.id]
        );

        await client.query('COMMIT');

        const itemText = getBingoItemText(number);
        getIO()?.to(code).emit('game-won', { number, itemText, winner: winnerNames });

        res.json({ number, itemText, winner: winnerNames, gameOver: true });
        return;
      }

      await client.query('COMMIT');

      const itemText = getBingoItemText(number);
      getIO()?.to(code).emit('number-called', { number, itemText });

      res.json({ number, itemText, gameOver: false });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/mark — Student saves self-marked cells (auth required)
router.post('/:code/mark', requireAuth, validateBody(markCellsSchema), async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { markedNumbers } = req.body as { markedNumbers: number[] };
    const playerId = req.auth!.playerId;

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const game = gameResult.rows[0];
    const playerResult = await pool.query(
      'SELECT * FROM players WHERE id = $1 AND game_id = $2',
      [playerId, game.id]
    );
    if (playerResult.rows.length === 0) {
      res.status(403).json({ error: 'Player not in this game' });
      return;
    }
    if (playerResult.rows[0].is_host) {
      res.status(400).json({ error: 'Host cannot mark cells' });
      return;
    }

    // Only allow marking numbers that exist on the player's card
    const playerCard: number[][] = playerResult.rows[0].card;
    const cardNumberSet = new Set(playerCard.flat());
    const validatedForCard = markedNumbers.filter(n => cardNumberSet.has(n));

    await pool.query(
      'UPDATE players SET manually_marked = $1 WHERE id = $2',
      [JSON.stringify(validatedForCard), playerId]
    );

    getIO()?.to(code).emit('player-marked', { playerId, count: validatedForCard.length });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:code/declare-winner — Host declares winner (auth, host)
router.post('/:code/declare-winner', requireAuth, requireHost, validateBody(declareWinnerSchema), async (req: Request, res: Response) => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const { winnerId } = req.body as { winnerId: number };

    const gameResult = await pool.query('SELECT * FROM games WHERE code = $1', [code]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const game = gameResult.rows[0];
    if (game.status !== 'playing') {
      res.status(400).json({ error: 'Game is not in progress' });
      return;
    }

    const winnerResult = await pool.query(
      'SELECT id, name FROM players WHERE id = $1 AND game_id = $2',
      [winnerId, game.id]
    );
    if (winnerResult.rows.length === 0) {
      res.status(404).json({ error: 'Winner player not found in this game' });
      return;
    }

    const winner = winnerResult.rows[0];
    await pool.query('UPDATE players SET has_won = TRUE WHERE id = $1', [winner.id]);
    await pool.query(
      'UPDATE games SET status = $1, winner_name = $2, finished_at = NOW() WHERE id = $3',
      ['finished', winner.name, game.id]
    );

    getIO()?.to(code).emit('game-won', { winner: winner.name, gameOver: true });

    res.json({ winner: winner.name, gameOver: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
