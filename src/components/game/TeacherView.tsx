import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BingoCard } from '@/components/bingo-card';
import { AutoDrawControls } from './AutoDrawControls';
import { Leaderboard } from './Leaderboard';
import { cn } from '@/lib/utils';
import { getBingoItemText, getBingoEmoji } from '@shared/bingo-logic';
import type { GameStateResponse } from '@shared/types';

interface TeacherViewProps {
  game: GameStateResponse;
  autoDrawer: {
    autoDrawing: boolean;
    autoDrawPaused: boolean;
    autoDrawInterval: number;
    countdown: number | null;
    drawLimitEnabled: boolean;
    drawLimit: number | null;
    setDrawLimitEnabled: (v: boolean) => void;
    setDrawLimit: (v: number | null) => void;
    startAutoDrawing: () => void;
    stopAutoDrawing: () => void;
    pauseAutoDrawing: () => void;
    resumeAutoDrawing: () => void;
    manualDraw: () => void;
    changeSpeed: (speed: number) => void;
  };
  onDeclareWinner: (winnerId: number, winnerName: string) => void;
  error: string;
}

export function TeacherView({ game, autoDrawer, onDeclareWinner, error }: TeacherViewProps) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [peekPlayer, setPeekPlayer] = useState<{ id: number; name: string; card: number[][] } | null>(null);

  const lastCalledNumber = game.called_numbers.length > 0
    ? game.called_numbers[game.called_numbers.length - 1]
    : null;

  return (
    <>
      {peekPlayer && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-md" onClick={() => setPeekPlayer(null)}>
          <div className="bg-gradient-to-br from-violet-900 to-indigo-900 border border-white/20 rounded-3xl p-6 shadow-2xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">👁 {peekPlayer.name}&apos;s Card</h3>
              <button onClick={() => setPeekPlayer(null)} className="text-white/50 hover:text-white/80 text-xl font-bold">✕</button>
            </div>
            <BingoCard card={peekPlayer.card} calledNumbers={game.called_numbers} />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 text-xs">
          <span>🎓</span>
          <span className="text-white font-bold">{game.players.filter(p => !p.is_host).length}</span>
          <span className="text-white/50">students</span>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-lg px-2.5 py-1.5 text-xs">
          <span>🎱</span>
          <span className="text-white font-bold">{game.called_numbers.length}/25</span>
          <span className="text-white/50">called</span>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border',
          game.players.filter(p => p.has_won).length > 0
            ? 'bg-emerald-500/20 border-emerald-400/30'
            : 'bg-white/5 border-white/10',
        )}>
          <span>🏆</span>
          <span className="text-white font-bold">{game.players.filter(p => p.has_won).length}</span>
          <span className="text-white/50">won</span>
        </div>
      </div>

      {/* Auto-draw controls */}
      <AutoDrawControls
        autoDrawing={autoDrawer.autoDrawing}
        autoDrawPaused={autoDrawer.autoDrawPaused}
        autoDrawInterval={autoDrawer.autoDrawInterval}
        countdown={autoDrawer.countdown}
        drawLimitEnabled={autoDrawer.drawLimitEnabled}
        drawLimit={autoDrawer.drawLimit}
        ttsEnabled={ttsEnabled}
        soundEnabled={soundEnabled}
        calledCount={game.called_numbers.length}
        gameFinished={game.status === 'finished'}
        setDrawLimitEnabled={autoDrawer.setDrawLimitEnabled}
        setDrawLimit={autoDrawer.setDrawLimit}
        setTtsEnabled={setTtsEnabled}
        setSoundEnabled={setSoundEnabled}
        onStartAutoDraw={autoDrawer.startAutoDrawing}
        onPause={autoDrawer.pauseAutoDrawing}
        onResume={autoDrawer.resumeAutoDrawing}
        onStop={autoDrawer.stopAutoDrawing}
        onManualDraw={autoDrawer.manualDraw}
        onChangeSpeed={autoDrawer.changeSpeed}
      />

      {/* Last called item */}
      {lastCalledNumber !== null && (
        <div className="shrink-0 flex items-center gap-3 bg-gradient-to-r from-violet-600/25 to-indigo-600/25 border border-indigo-400/30 rounded-xl p-3">
          <span className="text-2xl shrink-0">{getBingoEmoji(lastCalledNumber)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Last Called</p>
            <p className="text-white font-bold text-sm leading-tight truncate">{getBingoItemText(lastCalledNumber)}</p>
          </div>
          <span className="text-white/30 text-xs font-mono shrink-0">#{game.called_numbers.length}</span>
        </div>
      )}

      {/* Leaderboard */}
      <Leaderboard
        game={game}
        onPeekPlayer={setPeekPlayer}
        onDeclareWinner={onDeclareWinner}
      />

      {error && <div className="shrink-0 p-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs">{error}</div>}
    </>
  );
}
