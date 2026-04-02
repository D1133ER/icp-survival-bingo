import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BingoLogo } from './GameWidgets';
import { startGame } from '@/lib/api';
import { cn } from '@/lib/utils';
import { COLUMN_COLORS } from '@shared/bingo-logic';
import type { GameStateResponse } from '@shared/types';

interface WaitingRoomProps {
  game: GameStateResponse;
  playerData: { playerId: number; isHost: boolean } | null;
  code: string;
  fetchGame: () => Promise<void>;
  setError: (e: string) => void;
  onStartAutoGame: () => void;
  error: string;
}

export function WaitingRoom({
  game,
  playerData,
  code,
  fetchGame,
  setError,
  onStartAutoGame,
  error,
}: WaitingRoomProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      success = await navigator.clipboard.writeText(game.code).then(() => true).catch(() => false);
    }
    if (!success) {
      const el = document.createElement('textarea');
      el.value = game.code;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      success = document.execCommand('copy');
      document.body.removeChild(el);
    }
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [game.code]);

  const handleStartGame = async () => {
    if (!code) return;
    setActionLoading(true);
    setError('');
    try {
      await startGame(code);
      await fetchGame();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartAutoGame = async () => {
    if (!code) return;
    setActionLoading(true);
    setError('');
    try {
      await startGame(code);
      await fetchGame();
      onStartAutoGame();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <BingoLogo size="md" />
          <h2 className="text-white font-bold text-xl mt-3">ICP Survival Bingo</h2>
          <p className="text-indigo-300 text-sm">Waiting for players…</p>
        </div>
        <div className="bg-white/10 border border-white/20 backdrop-blur rounded-2xl p-5">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest text-center mb-2">Game Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-black tracking-[0.3em] font-mono text-white">{game.code}</span>
            <button onClick={handleCopyCode} className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all', copied ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white hover:bg-white/30')}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <p className="text-center text-white/40 text-xs mt-2">Share this code with your friends</p>
        </div>
        <div className="bg-white/10 border border-white/20 backdrop-blur rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-bold text-sm">Players</p>
            <Badge className="bg-white/20 text-white border-0">{game.players.length}</Badge>
          </div>
          <div className="space-y-2">
            {game.players.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0', COLUMN_COLORS[idx % 5])}>
                  {player.name[0].toUpperCase()}
                </div>
                <span className="flex-1 text-white font-medium text-sm">{player.name}</span>
                <div className="flex gap-1">
                  {player.is_host && <Badge className="bg-amber-500/80 text-white text-[10px] py-0 px-1.5 border-0">Teacher</Badge>}
                  {player.id === playerData?.playerId && <Badge className="bg-indigo-500/80 text-white text-[10px] py-0 px-1.5 border-0">You</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
        {playerData?.isHost ? (
          <div className="flex flex-col gap-2">
            <Button onClick={handleStartGame} disabled={actionLoading || game.players.length < 1} size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base shadow-xl">
              {actionLoading ? '⏳ Starting…' : `🚀 Start Class · ${game.players.length} student${game.players.length !== 1 ? 's' : ''}`}
            </Button>
            <Button onClick={handleStartAutoGame} disabled={actionLoading || game.players.length < 1} size="lg"
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-base shadow-xl">
              {actionLoading ? '⏳ Starting…' : `▶ Start Auto Game · ${game.players.length} student${game.players.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <p className="text-indigo-300 text-sm">Waiting for the teacher to start…</p>
          </div>
        )}
        {error && <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">{error}</div>}
      </div>
    </div>
  );
}
