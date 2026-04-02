import type {
  GameStateResponse,
  CreateGameResponse,
  JoinGameResponse,
  CallNumberResponse,
} from '@shared/types';

const API_BASE = '/api';

/** Retrieve the stored auth token for a game */
function getToken(code: string): string | null {
  try {
    const stored = localStorage.getItem(`bingo_player_${code}`);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return data.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(code: string): Record<string, string> {
  const token = getToken(code);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export async function createGame(hostName: string, freeSquare: boolean = false): Promise<CreateGameResponse> {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, freeSquare }),
  });
  return handleResponse<CreateGameResponse>(res);
}

export async function joinGame(code: string, playerName: string): Promise<JoinGameResponse> {
  const res = await fetch(`${API_BASE}/games/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  return handleResponse<JoinGameResponse>(res);
}

export async function getGame(code: string): Promise<GameStateResponse> {
  const res = await fetch(`${API_BASE}/games/${code}`);
  return handleResponse<GameStateResponse>(res);
}

export async function startGame(code: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/games/${code}/start`, {
    method: 'POST',
    headers: authHeaders(code),
    body: JSON.stringify({}),
  });
  return handleResponse<{ status: string }>(res);
}

export async function callNumber(code: string, specificNumber?: number): Promise<CallNumberResponse> {
  const res = await fetch(`${API_BASE}/games/${code}/call`, {
    method: 'POST',
    headers: authHeaders(code),
    body: JSON.stringify(specificNumber != null ? { specificNumber } : {}),
  });
  return handleResponse<CallNumberResponse>(res);
}

export async function markCells(code: string, markedNumbers: number[]): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/games/${code}/mark`, {
    method: 'POST',
    headers: authHeaders(code),
    body: JSON.stringify({ markedNumbers }),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function declareWinner(code: string, winnerId: number): Promise<{ winner: string; gameOver: boolean }> {
  const res = await fetch(`${API_BASE}/games/${code}/declare-winner`, {
    method: 'POST',
    headers: authHeaders(code),
    body: JSON.stringify({ winnerId }),
  });
  return handleResponse<{ winner: string; gameOver: boolean }>(res);
}

