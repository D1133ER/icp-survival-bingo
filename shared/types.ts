/** Shared types used by both server and client */

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface GameRow {
  id: number;
  code: string;
  status: GameStatus;
  winner_name: string | null;
  free_square: boolean;
  item_pool: number[];
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  expires_at: string | null;
}

export interface PlayerRow {
  id: number;
  game_id: number;
  name: string;
  is_host: boolean;
  card: number[][];
  has_won: boolean;
  manually_marked: number[];
  token: string;
  joined_at: string;
}

export interface PlayerSummary {
  id: number;
  name: string;
  is_host: boolean;
  has_won: boolean;
  matched_count: number;
  manually_marked: number[];
  card: number[][];
}

export interface GameStateResponse {
  id: number;
  code: string;
  status: GameStatus;
  winner_name: string | null;
  free_square: boolean;
  item_pool: number[];
  players: PlayerSummary[];
  called_numbers: number[];
}

export interface CreateGameResponse {
  code: string;
  playerId: number;
  token: string;
  card: number[][];
  isHost: boolean;
  freeSquare: boolean;
  itemPool: number[];
}

export interface JoinGameResponse {
  playerId: number;
  token: string;
  card: number[][];
  isHost: boolean;
}

export interface CallNumberResponse {
  number: number;
  itemText: string;
  gameOver: boolean;
  winner?: string;
}

/** WebSocket event types */
export enum WSEvent {
  PLAYER_JOINED = 'player-joined',
  GAME_STARTED = 'game-started',
  NUMBER_CALLED = 'number-called',
  GAME_WON = 'game-won',
  GAME_PAUSED = 'game-paused',
  GAME_RESUMED = 'game-resumed',
  PLAYER_MARKED = 'player-marked',
  GAME_STATE = 'game-state',
}
