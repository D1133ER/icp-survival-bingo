import { useState, useRef, useCallback, useEffect } from 'react';
import { callNumber } from '@/lib/api';
import type { GameStateResponse } from '@shared/types';
import { getBingoItemText } from '@shared/bingo-logic';

interface UseAutoDrawerOptions {
  code: string | undefined;
  game: GameStateResponse | null;
  fetchGame: () => Promise<void>;
  setError: (e: string) => void;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  newlyCalledNumber: number | null;
}

export function useAutoDrawer({
  code,
  game,
  fetchGame,
  setError,
  soundEnabled,
  ttsEnabled,
  newlyCalledNumber,
}: UseAutoDrawerOptions) {
  const [autoDrawing, setAutoDrawing] = useState(false);
  const [autoDrawPaused, setAutoDrawPaused] = useState(false);
  const [autoDrawInterval, setAutoDrawInterval] = useState(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [drawLimit, setDrawLimit] = useState<number | null>(null);
  const [drawLimitEnabled, setDrawLimitEnabled] = useState(false);

  const autoDrawActiveRef = useRef(false);
  const autoDrawPausedRef = useRef(false);
  const autoDrawIntervalRef = useRef(5);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCallingRef = useRef(false);
  const drawLimitRef = useRef<number | null>(null);
  const runAutoDrawCycleRef = useRef<(() => void) | null>(null);

  // Keep refs in sync
  autoDrawIntervalRef.current = autoDrawInterval;
  drawLimitRef.current = drawLimitEnabled ? drawLimit : null;

  const stopAutoDrawing = useCallback(() => {
    autoDrawActiveRef.current = false;
    autoDrawPausedRef.current = false;
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (countdownTickRef.current) { clearInterval(countdownTickRef.current); countdownTickRef.current = null; }
    setCountdown(null);
    setAutoDrawing(false);
    setAutoDrawPaused(false);
  }, []);

  const pauseAutoDrawing = useCallback(() => {
    autoDrawPausedRef.current = true;
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (countdownTickRef.current) { clearInterval(countdownTickRef.current); countdownTickRef.current = null; }
    setAutoDrawPaused(true);
  }, []);

  const handleCallNumber = useCallback(async (specificNumber?: number) => {
    if (!code) return;
    if (isCallingRef.current) return;
    isCallingRef.current = true;
    setError('');
    try {
      const result = await callNumber(code, specificNumber);
      await fetchGame();
      if (result.gameOver) stopAutoDrawing();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to call item');
      stopAutoDrawing();
    } finally {
      isCallingRef.current = false;
    }
  }, [code, fetchGame, stopAutoDrawing, setError]);

  const runAutoDrawCycle = useCallback(() => {
    if (!autoDrawActiveRef.current || autoDrawPausedRef.current) return;
    const secs = autoDrawIntervalRef.current;
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (countdownTickRef.current) { clearInterval(countdownTickRef.current); countdownTickRef.current = null; }

    setCountdown(secs);
    let remaining = secs;
    countdownTickRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        setCountdown(null);
        if (countdownTickRef.current) { clearInterval(countdownTickRef.current); countdownTickRef.current = null; }
      }
    }, 1000);

    autoTimerRef.current = setTimeout(async () => {
      if (!autoDrawActiveRef.current || autoDrawPausedRef.current) return;
      await handleCallNumber();
      if (autoDrawActiveRef.current && !autoDrawPausedRef.current) runAutoDrawCycleRef.current?.();
    }, secs * 1000);
  }, [handleCallNumber]);

  runAutoDrawCycleRef.current = runAutoDrawCycle;

  const resumeAutoDrawing = useCallback(() => {
    autoDrawPausedRef.current = false;
    setAutoDrawPaused(false);
    runAutoDrawCycleRef.current?.();
  }, []);

  const startAutoDrawing = useCallback(() => {
    autoDrawActiveRef.current = true;
    autoDrawPausedRef.current = false;
    setAutoDrawing(true);
    setAutoDrawPaused(false);
    runAutoDrawCycle();
  }, [runAutoDrawCycle]);

  const manualDraw = useCallback(() => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (countdownTickRef.current) { clearInterval(countdownTickRef.current); countdownTickRef.current = null; }
    setCountdown(null);
    handleCallNumber().then(() => {
      if (autoDrawActiveRef.current && !autoDrawPausedRef.current) {
        runAutoDrawCycleRef.current?.();
      }
    });
  }, [handleCallNumber]);

  const changeSpeed = useCallback((speed: number) => {
    setAutoDrawInterval(speed);
    if (autoDrawActiveRef.current && !autoDrawPausedRef.current) {
      if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
      if (countdownTickRef.current) { clearInterval(countdownTickRef.current); countdownTickRef.current = null; }
      autoDrawIntervalRef.current = speed;
      runAutoDrawCycleRef.current?.();
    }
  }, []);

  // Stop auto-draw when game ends or all numbers called
  useEffect(() => {
    if (game?.called_numbers.length === 25 || game?.status === 'finished') {
      stopAutoDrawing();
    }
    if (drawLimitEnabled && drawLimit !== null && game && game.called_numbers.length >= drawLimit) {
      stopAutoDrawing();
    }
  }, [game?.called_numbers.length, game?.status, stopAutoDrawing, drawLimitEnabled, drawLimit]);

  // TTS + sound on new called number
  useEffect(() => {
    if (newlyCalledNumber === null) return;
    if (soundEnabled) {
      try {
        const audio = new Audio('/ding.wav');
        audio.volume = 0.5;
        audio.play().catch(() => { /* ignore */ });
      } catch { /* ignore */ }
    }
    if (ttsEnabled && window.speechSynthesis) {
      const text = getBingoItemText(newlyCalledNumber);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [newlyCalledNumber, soundEnabled, ttsEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoDrawActiveRef.current = false;
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      if (countdownTickRef.current) clearInterval(countdownTickRef.current);
    };
  }, []);

  return {
    autoDrawing,
    autoDrawPaused,
    autoDrawInterval,
    countdown,
    drawLimit,
    drawLimitEnabled,
    setDrawLimit,
    setDrawLimitEnabled,
    startAutoDrawing,
    stopAutoDrawing,
    pauseAutoDrawing,
    resumeAutoDrawing,
    handleCallNumber,
    manualDraw,
    changeSpeed,
  };
}
