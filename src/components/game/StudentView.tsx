import { useState, useEffect, useCallback, useRef } from 'react';
import { BingoCard } from '@/components/bingo-card';
import { markCells } from '@/lib/api';
import { getBingoItemText, getBingoEmoji } from '@shared/bingo-logic';
import type { GameStateResponse, PlayerSummary } from '@shared/types';

interface StudentViewProps {
  game: GameStateResponse;
  playerData: { playerId: number; isHost: boolean; card: number[][] };
  code: string;
  newlyCalledNumber: number | null;
  error: string;
}

export function StudentView({ game, playerData, code, newlyCalledNumber, error }: StudentViewProps) {
  const [manuallyMarked, setManuallyMarked] = useState<Set<number>>(new Set());
  const hasHydratedMarksRef = useRef(false);

  const myPlayer: PlayerSummary | undefined = game.players.find(p => p.id === playerData.playerId);
  const lastCalledNumber = game.called_numbers.length > 0
    ? game.called_numbers[game.called_numbers.length - 1]
    : null;

  // Re-hydrate manually marked cells from server once
  useEffect(() => {
    if (hasHydratedMarksRef.current) return;
    const serverPlayer = game.players.find(p => p.id === playerData.playerId);
    if (!serverPlayer) return;
    if (serverPlayer.manually_marked.length > 0) {
      setManuallyMarked(new Set(serverPlayer.manually_marked));
    }
    hasHydratedMarksRef.current = true;
  }, [game, playerData.playerId]);

  const handleStudentCellClick = useCallback((num: number) => {
    if (num === 0) return;
    if (game.called_numbers.includes(num)) return;
    setManuallyMarked(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      markCells(code, Array.from(next)).catch(() => { /* fire-and-forget */ });
      return next;
    });
  }, [code, game.called_numbers]);

  return (
    <>
      {/* Mobile-only: last called number strip */}
      <div className="md:hidden shrink-0 flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-2">
        {lastCalledNumber !== null ? (
          <>
            <span className="text-lg shrink-0">{getBingoEmoji(lastCalledNumber)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-white/40 text-[9px] uppercase tracking-widest">Last Called</p>
              <p className="text-white font-bold text-xs truncate">{getBingoItemText(lastCalledNumber)}</p>
            </div>
            <span className="text-white/30 text-[10px] font-mono shrink-0">{game.called_numbers.length}/25</span>
          </>
        ) : (
          <p className="text-white/30 text-xs flex-1 text-center">Waiting for teacher to draw…</p>
        )}
      </div>
      <div className="flex items-center justify-between shrink-0">
        <p className="text-white/60 text-xs font-bold">🃏 {myPlayer?.name ?? 'Your'}&apos;s Card</p>
        <p className="text-white/50 text-[10px]">Tap to mark 🖊️ · 🟠 pre-marked · 🟣 called</p>
      </div>
      <div className="flex-1 min-h-0">
        {playerData.card ? (
          <BingoCard
            card={playerData.card}
            calledNumbers={game.called_numbers}
            isWinner={myPlayer?.has_won}
            newlyCalledNumber={newlyCalledNumber}
            fullSize
            manuallyMarked={manuallyMarked}
            onCellClick={game.status === 'playing' && !myPlayer?.has_won ? handleStudentCellClick : undefined}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-white/40 text-sm">Card unavailable — please rejoin.</div>
        )}
      </div>
      {error && <div className="shrink-0 p-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs">{error}</div>}
    </>
  );
}
