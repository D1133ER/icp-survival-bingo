import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { declareWinner } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getBingoItemText, getBingoEmoji, COLUMN_COLORS } from '@shared/bingo-logic';
import { useGameState } from '@/hooks/useGameState';
import { useAutoDrawer } from '@/hooks/useAutoDrawer';
import { Confetti, BingoLogo, BallCaller, NumberBoard } from './game/GameWidgets';
import { WinnerModal } from './game/WinnerModal';
import { WaitingRoom } from './game/WaitingRoom';
import { TeacherView } from './game/TeacherView';
import { StudentView } from './game/StudentView';

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const {
    game, playerData, loading, error, setError,
    fetchGame, newlyCalledNumber, ballAnimKey,
    showWinner, showConfetti,
  } = useGameState(code);

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  const autoDrawer = useAutoDrawer({
    code,
    game,
    fetchGame,
    setError,
    soundEnabled,
    ttsEnabled,
    newlyCalledNumber,
  });

  const handleDeclareWinner = useCallback(async (winnerId: number, winnerName: string) => {
    if (!code) return;
    if (!window.confirm(`Declare "${winnerName}" as the winner and end the game?`)) return;
    setError('');
    try {
      await declareWinner(code, winnerId);
      autoDrawer.stopAutoDrawing();
      await fetchGame();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to declare winner');
    }
  }, [code, fetchGame, autoDrawer, setError]);

  const handleCopyCode = async () => {
    if (!game) return;
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
  };

  // ── Loading / error / not-joined states ──
  if (!loading && !playerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 to-indigo-900 p-4">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-white/70 mb-4">You haven&apos;t joined this game yet.</p>
          <Button onClick={() => navigate('/')} variant="outline" className="border-white/30 text-white hover:bg-white/10">Go Home</Button>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-900 to-indigo-900 gap-4">
        <BingoLogo size="md" />
        <p className="text-white/60 text-sm animate-pulse">Loading game…</p>
      </div>
    );
  }
  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 to-indigo-900 p-4">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-red-300 mb-4">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline" className="border-white/30 text-white hover:bg-white/10">Go Home</Button>
        </div>
      </div>
    );
  }
  if (!game || !code) return null;

  // ── Waiting room ──
  if (game.status === 'waiting') {
    return (
      <WaitingRoom
        game={game}
        playerData={playerData}
        code={code}
        fetchGame={fetchGame}
        setError={setError}
        onStartAutoGame={autoDrawer.startAutoDrawing}
        error={error}
      />
    );
  }

  // ── Playing / finished ──
  const myPlayer = game.players.find(p => p.id === playerData?.playerId);
  const lastCalledNumber = game.called_numbers.length > 0 ? game.called_numbers[game.called_numbers.length - 1] : null;
  const progressPct = Math.round((game.called_numbers.length / 25) * 100);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950">
      {showConfetti && <Confetti />}
      {showWinner && <WinnerModal winnerName={game.winner_name} myName={myPlayer?.name} />}

      {newlyCalledNumber !== null && (
        <div className="fixed top-0 left-0 right-0 z-30 flex justify-center pt-3 pointer-events-none">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-ball-drop border border-indigo-400/50">
            <span className="text-2xl">{getBingoEmoji(newlyCalledNumber)}</span>
            <div>
              <span className="text-white/70 text-xs uppercase tracking-wide">Now called:</span>
              <p className="font-black text-base leading-tight">{getBingoItemText(newlyCalledNumber)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 h-12 flex items-center justify-between px-3 border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="flex items-center gap-3">
          <BingoLogo size="sm" />
          <span className="text-white/70 text-xs hidden sm:block">ICP Survival Bingo</span>
        </div>
        <div className="flex-1 max-w-[130px] sm:max-w-xs mx-2 sm:mx-4">
          <div className="flex justify-between text-[10px] text-white/40 mb-0.5">
            <span>{game.called_numbers.length} / 25 items</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {myPlayer?.has_won && <Badge className="bg-emerald-500 text-white animate-pulse border-0 text-xs">BINGO! 🎉</Badge>}
          {!playerData?.isHost && (
            <a
              href={`/print?code=${game.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20 transition-all"
              title="Print your card"
            >
              🖨️
            </a>
          )}
          <button onClick={handleCopyCode} className={cn('px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all', copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20')}>
            {copied ? '✓ Copied' : `📋 ${game.code}`}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex gap-2 p-2">
        {/* Left sidebar: ball caller + number board (desktop only) */}
        <div className="hidden md:flex w-[140px] shrink-0 flex-col gap-3 overflow-y-auto custom-scroll py-1">
          <BallCaller num={lastCalledNumber} animKey={ballAnimKey} />
          <div className="h-px bg-white/10" />
          <NumberBoard calledNumbers={game.called_numbers} />
        </div>

        {/* Center: teacher/student view */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
          {playerData?.isHost ? (
            <TeacherView
              game={game}
              autoDrawer={autoDrawer}
              onDeclareWinner={handleDeclareWinner}
              error={error}
            />
          ) : playerData ? (
            <StudentView
              game={game}
              playerData={playerData}
              code={code}
              newlyCalledNumber={newlyCalledNumber}
              error={error}
            />
          ) : null}
        </div>

        {/* Right sidebar: players + history (desktop only) */}
        <div className="hidden lg:flex w-[150px] shrink-0 flex-col gap-2 overflow-hidden">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 shrink-0">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mb-2">👥 Players ({game.players.length})</p>
            <div className="space-y-1">
              {game.players.map((player, idx) => (
                <div key={player.id} className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs',
                  player.id === playerData?.playerId ? 'bg-indigo-500/25 border border-indigo-400/30' : 'bg-white/5',
                )}>
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0', COLUMN_COLORS[idx % 5])}>
                    {player.name[0].toUpperCase()}
                  </div>
                  <span className={cn('flex-1 truncate', player.id === playerData?.playerId ? 'text-white font-bold' : 'text-white/70')}>
                    {player.name}
                  </span>
                  {player.has_won && <span className="text-emerald-400 text-[9px] font-black">✓</span>}
                  {player.is_host && !player.has_won && <span className="text-amber-400/60 text-[9px]">★</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col min-h-0 flex-1">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mb-2 shrink-0">📋 History</p>
            {game.called_numbers.length === 0 ? (
              <p className="text-white/25 text-[10px] text-center py-2">No items yet</p>
            ) : (
              <div className="flex flex-col gap-1 overflow-y-auto custom-scroll flex-1 min-h-0">
                {[...game.called_numbers].reverse().map((n, i) => (
                  <div key={n} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] transition-all',
                    i === 0 ? 'bg-indigo-500 text-white font-bold' : 'bg-white/5 text-white/50',
                  )}>
                    <span>{getBingoEmoji(n)}</span>
                    <span className="truncate">{getBingoItemText(n)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
