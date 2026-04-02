import http from 'http';
import express from 'express';
import cors from 'cors';
import { config, corsOrigins } from './config';
import { apiLimiter } from './middleware/rate-limit';
import gamesRouter from './routes/games';
import { initIO } from './ws';
import { pool } from './db';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
initIO(server);

// CORS — restrict origins in production
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}));

app.use(express.json({ limit: '16kb' }));

// Global rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/games', gamesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cleanup expired games periodically (every hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(async () => {
  try {
    const result = await pool.query(
      'DELETE FROM games WHERE expires_at < NOW() AND status != $1',
      ['playing']
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[cleanup] Removed ${result.rowCount} expired game(s)`);
    }
  } catch (err) {
    console.error('[cleanup] Error:', err);
  }
}, CLEANUP_INTERVAL_MS);

server.listen(config.PORT, () => {
  console.log(`[server] Running on http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

