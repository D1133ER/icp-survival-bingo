CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    code VARCHAR(6) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    winner_name VARCHAR(100),
    free_square BOOLEAN NOT NULL DEFAULT FALSE,
    item_pool JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Migrations for existing tables
ALTER TABLE games ADD COLUMN IF NOT EXISTS free_square BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS item_pool JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours');

CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    card JSONB NOT NULL,
    has_won BOOLEAN NOT NULL DEFAULT FALSE,
    manually_marked JSONB NOT NULL DEFAULT '[]'::jsonb,
    token VARCHAR(512),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migrations for existing tables
ALTER TABLE players ADD COLUMN IF NOT EXISTS manually_marked JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS token VARCHAR(512);

CREATE TABLE IF NOT EXISTS called_numbers (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    called_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_called_numbers_game_id ON called_numbers(game_id);
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at);

