import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On failure, returns 400 with structured error messages.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

// --- Request body schemas ---

export const createGameSchema = z.object({
  hostName: z.string().trim().min(1, 'Host name is required').max(50),
  freeSquare: z.boolean().optional().default(false),
});

export const joinGameSchema = z.object({
  playerName: z.string().trim().min(1, 'Player name is required').max(50),
});

export const playerIdSchema = z.object({
  playerId: z.number().int().positive(),
});

export const callNumberSchema = z.object({
  specificNumber: z.number().int().min(1).max(25).optional(),
});

export const markCellsSchema = z.object({
  markedNumbers: z.array(z.number().int().min(1).max(25)),
});

export const declareWinnerSchema = z.object({
  winnerId: z.number().int().positive(),
});
