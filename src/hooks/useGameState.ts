import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getGame } from '@/lib/api';
import type { GameStateResponse } from '@shared/types';
import { useGameSocket } from './useGameSocket';

interface PlayerData {
  playerId: number;
  isHost: boolean;
  card: number[][];
  token: string;
}

interface UseGameStateReturn {
  game: GameStateResponse | null;
  playerData: PlayerData | null;
  loading: boolean;
  error: string;
  setError: (e: string) => void;
  fetchGame: () => Promise<void>;
  newlyCalledNumber: number | null;
  ballAnimKey: number;
  showWinner: boolean;
  setShowWinner: (v: boolean) => void;
  showConfetti: boolean;
}

const POLL_INTERVAL = 3000; // slightly slower since we have WebSocket for instant updates

export function useGameState(code: string | undefined): UseGameStateReturn {
  const [game, setGame] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newlyCalledNumber, setNewlyCalledNumber] = useState<number | null>(null);
  const [ballAnimKey, setBallAnimKey] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCalledCountRef = useRef(0);
  const showWinnerRef = useRef(false);

  const playerData = useMemo<PlayerData | null>(() => {
    if (!code) return null;
    try {
      const stored = localStorage.getItem(`bingo_player_${code}`);
      return stored ? (JSON.parse(stored) as PlayerData) : null;
    } catch {
      return null;
    }
  }, [code]);

  const fetchGame = useCallback(async () => {
    if (!code) return;
    try {
      const data = await getGame(code);
      if (data.called_numbers.length > prevCalledCountRef.current) {
        const lastNum = data.called_numbers[data.called_numbers.length - 1];
        setNewlyCalledNumber(lastNum);
        setBallAnimKey(k => k + 1);
        setTimeout(() => setNewlyCalledNumber(null), 3000);
        prevCalledCountRef.current = data.called_numbers.length;
      }
      setGame(data);
      setLoading(false);
      if (data.status === 'finished' && !showWinnerRef.current) {
        showWinnerRef.current = true;
        setShowWinner(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setLoading(false);
    }
  }, [code]);

  // WebSocket for instant updates — triggers a fetch on events
  useGameSocket({
    code,
    onPlayerJoined: () => fetchGame(),
    onGameStarted: () => fetchGame(),
    onNumberCalled: () => fetchGame(),
    onGameWon: () => fetchGame(),
    onPlayerMarked: () => fetchGame(),
  });

  // Polling as fallback
  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchGame]);

  return {
    game,
    playerData,
    loading,
    error,
    setError,
    fetchGame,
    newlyCalledNumber,
    ballAnimKey,
    showWinner,
    setShowWinner,
    showConfetti,
  };
}
