import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type EventHandler = (data: unknown) => void;

interface UseGameSocketOptions {
  code: string | undefined;
  onPlayerJoined?: EventHandler;
  onGameStarted?: EventHandler;
  onNumberCalled?: EventHandler;
  onGameWon?: EventHandler;
  onPlayerMarked?: EventHandler;
}

/**
 * Hook that manages a Socket.IO connection to a game room.
 * Falls back gracefully — game still works via polling if WS fails.
 */
export function useGameSocket({
  code,
  onPlayerJoined,
  onGameStarted,
  onNumberCalled,
  onGameWon,
  onPlayerMarked,
}: UseGameSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  // Store handlers in refs so we don't reconnect when handlers change
  const handlersRef = useRef({
    onPlayerJoined,
    onGameStarted,
    onNumberCalled,
    onGameWon,
    onPlayerMarked,
  });
  handlersRef.current = {
    onPlayerJoined,
    onGameStarted,
    onNumberCalled,
    onGameWon,
    onPlayerMarked,
  };

  useEffect(() => {
    if (!code) return;

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', code.toUpperCase());
    });

    socket.on('player-joined', (data) => handlersRef.current.onPlayerJoined?.(data));
    socket.on('game-started', (data) => handlersRef.current.onGameStarted?.(data));
    socket.on('number-called', (data) => handlersRef.current.onNumberCalled?.(data));
    socket.on('game-won', (data) => handlersRef.current.onGameWon?.(data));
    socket.on('player-marked', (data) => handlersRef.current.onPlayerMarked?.(data));

    return () => {
      socket.emit('leave-room', code.toUpperCase());
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, socket: socketRef };
}
