const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export async function createGame(hostName: string) {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName }),
  });
  return handleResponse<{ code: string; playerId: number; card: number[][]; isHost: boolean }>(res);
}

export async function joinGame(code: string, playerName: string) {
  const res = await fetch(`${API_BASE}/games/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  return handleResponse<{ playerId: number; card: number[][]; isHost: boolean }>(res);
}

export async function getGame(code: string) {
  const res = await fetch(`${API_BASE}/games/${code}`);
  return handleResponse<{
    id: number;
    code: string;
    status: 'waiting' | 'playing' | 'finished';
    winner_name: string | null;
    players: Array<{ id: number; name: string; is_host: boolean; has_won: boolean; matched_count: number }>;
    called_numbers: number[];
  }>(res);
}

export async function startGame(code: string, playerId: number) {
  const res = await fetch(`${API_BASE}/games/${code}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  return handleResponse<{ status: string }>(res);
}

export async function callNumber(code: string, playerId: number, specificNumber?: number) {
  const res = await fetch(`${API_BASE}/games/${code}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, ...(specificNumber != null ? { specificNumber } : {}) }),
  });
  return handleResponse<{ number: number; itemText: string; gameOver: boolean; winner?: string }>(res);
}
