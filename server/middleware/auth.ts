import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from '../db';

export interface AuthPayload {
  playerId: number;
  gameCode: string;
  isHost: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Middleware: requires a valid Bearer token for routes that need authentication.
 * Populates req.auth with { playerId, gameCode, isHost }.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify the player still exists in DB
  const result = await pool.query(
    'SELECT id, is_host FROM players WHERE id = $1',
    [payload.playerId]
  );
  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Player not found' });
    return;
  }

  req.auth = payload;
  next();
}

/**
 * Middleware: requires that the authenticated user is the host of the game.
 * Must be used after requireAuth.
 */
export function requireHost(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth?.isHost) {
    res.status(403).json({ error: 'Only the teacher can perform this action' });
    return;
  }
  next();
}
