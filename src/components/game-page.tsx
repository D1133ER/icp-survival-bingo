import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BingoCard } from './bingo-card';
import { getGame, startGame, callNumber } from '@/lib/api';
import { getBingoItemText, getBingoEmoji, COLUMN_COLORS } from '@/lib/bingo';
import { cn } from '@/lib/utils';

interface PlayerData {
  playerId: number;
  isHost: boolean;
  card: number[][];
}

interface GameState {
  id: number;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  winner_name: string | null;
  players: Array<{ id: number; name: string; is_host: boolean; has_won: boolean; matched_count: number }>;
  called_numbers: number[];
}

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      color: ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444'][i % 7],
      left: `${(i * 13) % 100}%`,
      delay: `${(i * 0.04) % 2}s`,
      duration: `${2.2 + (i * 0.06) % 1.8}s`,
      size: `${6 + (i % 6) * 2}px`,
    })), []);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} className="absolute top-0" style={{
          left: p.left, width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius: p.id % 3 === 0 ? '50%' : '2px',
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          transform: `rotate(${p.id * 37}deg)`,
        }} />
      ))}
    </div>
  );
}

const BALL_GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-green-500 to-green-700',
  'from-yellow-400 to-yellow-600',
  'from-red-500 to-red-700',
];

function BallCaller({ num, animKey }: { num: number | null; animKey: number }) {
  if (num === null) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Current Call</p>
        <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
          <span className="text-white/20 text-3xl">?</span>
        </div>
        <p className="text-white/30 text-[10px]">Waiting…</p>
      </div>
    );
  }
  const colIdx = num <= 5 ? 0 : num <= 10 ? 1 : num <= 15 ? 2 : num <= 20 ? 3 : 4;
  const letter = ['B','I','N','G','O'][colIdx];
  return (
    <div key={animKey} className="flex flex-col items-center gap-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Current Call</p>
      <div className={cn(
        'w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl animate-ball-drop relative',
        'bg-gradient-to-br border-4 border-white/30', BALL_GRADIENTS[colIdx],
      )}>
        <div className="absolute top-2 left-3 w-6 h-3 bg-white/35 rounded-full blur-sm" />
        <span className="text-white font-black text-lg leading-none z-10">{letter}</span>
        <span className="text-2xl z-10 leading-none">{getBingoEmoji(num)}</span>
      </div>
      <p className="text-white font-bold text-[11px] text-center leading-tight max-w-[88px] mt-0.5">
        {getBingoItemText(num)}
      </p>
    </div>
  );
}

const COL_RANGES: readonly [number, number][] = [[1,5],[6,10],[11,15],[16,20],[21,25]];
const COL_LETTERS = ['B','I','N','G','O'] as const;

function NumberBoard({ calledNumbers }: { calledNumbers: number[] }) {
  const calledSet = new Set(calledNumbers);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 text-center">Called Items</p>
      <div className="grid grid-cols-5 gap-1">
        {COL_LETTERS.map((letter, ci) => (
          <div key={letter} className={cn('h-6 flex items-center justify-center rounded-lg font-black text-white text-xs', COLUMN_COLORS[ci])}>
            {letter}
          </div>
        ))}
        {[0,1,2,3,4].map(row =>
          COL_LETTERS.map((_, ci) => {
            const [start, end] = COL_RANGES[ci];
            const itemNum = start + row;
            if (itemNum > end) return <div key={`${ci}-${row}`} />;
            const isCalled = calledSet.has(itemNum);
            return (
              <div key={`${ci}-${row}`} title={getBingoItemText(itemNum)} className={cn(
                'h-7 flex flex-col items-center justify-center rounded-lg transition-all duration-300',
                isCalled ? cn('text-white shadow-md scale-105', COLUMN_COLORS[ci]) : 'bg-white/8 text-white/25 border border-white/10',
              )}>
                <span className="text-[10px] leading-none">{getBingoEmoji(itemNum)}</span>
              </div>
            );
          })
        )}
      </div>
      <p className="text-white/30 text-[9px] text-center">{calledNumbers.length} / 25 called</p>
    </div>
  );
}

function BingoLogo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-10 h-10 text-base' : 'w-7 h-7 text-sm';
  return (
    <div className="flex gap-0.5">
      {(['B','I','N','G','O'] as const).map((l, i) => (
        <span key={l} className={cn('rounded font-black text-white flex items-center justify-center', COLUMN_COLORS[i], cls)}>{l}</span>
      ))}
    </div>
  );
}

export default function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newlyCalledNumber, setNewlyCalledNumber] = useState<number | null>(null);
  const [ballAnimKey, setBallAnimKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const prevCalledCountRef = useRef(0);

  const playerData = useMemo<PlayerData | null>(() => {
    if (!code) return null;
    const stored = localStorage.getItem(`bingo_player_${code}`);
    return stored ? (JSON.parse(stored) as PlayerData) : null;
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
      if (data.status === 'finished' && !showWinner) {
        setShowWinner(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
      setLoading(false);
    }
  }, [code, showWinner]);

  useEffect(() => {
    fetchGame();
    const interval = setInterval(fetchGame, 2000);
    return () => clearInterval(interval);
  }, [fetchGame]);

  const handleStartGame = async () => {
    if (!code || !playerData) return;
    setActionLoading(true);
    setError('');
    try {
      await startGame(code, playerData.playerId);
      await fetchGame();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally { setActionLoading(false); }
  };

  const handleCallNumber = async (specificNumber?: number) => {
    if (!code || !playerData) return;
    if (actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      await callNumber(code, playerData.playerId, specificNumber);
      await fetchGame();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to call item');
    } finally { setActionLoading(false); }
  };

  const handleCopyCode = async () => {
    if (!game) return;
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      success = await navigator.clipboard.writeText(game.code).then(() => true).catch(() => false);
    }
    if (!success) {
      // Fallback for HTTP / non-secure contexts
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

  if (!loading && !playerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900 to-indigo-900 p-4">
        <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-white/70 mb-4">You haven't joined this game yet.</p>
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
  if (!game) return null;

  const myPlayer = game.players.find(p => p.id === playerData?.playerId);
  const lastCalledNumber = game.called_numbers.length > 0 ? game.called_numbers[game.called_numbers.length - 1] : null;
  const progressPct = Math.round((game.called_numbers.length / 25) * 100);

  if (game.status === 'waiting') {
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
            <Button onClick={handleStartGame} disabled={actionLoading || game.players.length < 1} size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base shadow-xl">
              {actionLoading ? '⏳ Starting…' : `🚀 Start Class · ${game.players.length} student${game.players.length !== 1 ? 's' : ''}`}
            </Button>
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

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950">
      {showConfetti && <Confetti />}

      {showWinner && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 backdrop-blur-md">
          <div className="bg-gradient-to-br from-violet-900 to-indigo-900 border border-white/20 rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full mx-4">
            <div className="text-8xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-5xl font-black text-white mb-3 shimmer-text">BINGO!</h2>
            {game.winner_name === myPlayer?.name ? (
              <><p className="text-2xl font-bold text-emerald-400 mb-1">You won! 🏆</p><p className="text-white/60 text-sm">Congratulations, legend!</p></>
            ) : (
              <><p className="text-xl text-white/80 mb-1"><span className="font-black text-amber-400">{game.winner_name}</span> wins!</p><p className="text-white/50 text-sm">Better luck next time 💪</p></>
            )}
            <Button className="mt-8 w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold" size="lg" onClick={() => navigate('/')}>
              🏠 Play Again
            </Button>
          </div>
        </div>
      )}

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

      <header className="shrink-0 h-12 flex items-center justify-between px-3 border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="flex items-center gap-3">
          <BingoLogo size="sm" />
          <span className="text-white/70 text-xs hidden sm:block">ICP Survival Bingo</span>
        </div>
        <div className="flex-1 max-w-xs mx-4">
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

      <div className="flex-1 min-h-0 flex gap-2 p-2">
        <div className="w-[140px] shrink-0 flex flex-col gap-3 overflow-y-auto custom-scroll py-1">
          <BallCaller num={lastCalledNumber} animKey={ballAnimKey} />
          <div className="h-px bg-white/10" />
          <NumberBoard calledNumbers={game.called_numbers} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {playerData?.isHost ? (
            <>
              {/* Stats chips */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
              {/* Last called item */}
              {lastCalledNumber !== null && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600/25 to-indigo-600/25 border border-indigo-400/30 rounded-xl p-3 shrink-0">
                  <span className="text-2xl shrink-0">{getBingoEmoji(lastCalledNumber)}</span>
                  <div className="min-w-0">
                    <p className="text-white/40 text-[10px] uppercase tracking-widest">Last Called</p>
                    <p className="text-white font-bold text-sm leading-tight truncate">{getBingoItemText(lastCalledNumber)}</p>
                  </div>
                  <span className="ml-auto text-white/30 text-xs font-mono shrink-0">#{game.called_numbers.length}</span>
                </div>
              )}
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest shrink-0">📊 Class Leaderboard</p>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1">
                {[...game.players]
                  .filter(p => !p.is_host)
                  .sort((a, b) => b.matched_count - a.matched_count)
                  .map((player, idx) => (
                    <div key={player.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl mb-2 border transition-all duration-300',
                      player.has_won
                        ? 'bg-emerald-500/20 border-emerald-400/40'
                        : 'bg-white/5 border-white/10',
                    )}>
                      <span className="text-white/40 text-sm font-black w-5 text-right shrink-0">#{idx + 1}</span>
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0', COLUMN_COLORS[idx % 5])}>
                        {player.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold text-sm truncate">{player.name}</span>
                          {player.has_won && <Badge className="bg-emerald-500 text-white text-[10px] py-0 px-1.5 border-0 shrink-0">BINGO! 🎉</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full transition-all duration-700"
                              style={{ width: `${(player.matched_count / 25) * 100}%` }}
                            />
                          </div>
                          <span className="text-white/50 text-[11px] font-bold shrink-0">{player.matched_count}/25</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
                {game.players.filter(p => !p.is_host).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <span className="text-5xl">🎓</span>
                    <p className="text-white/30 text-sm text-center">No students have joined yet</p>
                    <p className="text-white/20 text-xs text-center">Share code <span className="font-mono font-bold text-white/40">{game.code}</span> to get started</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between shrink-0">
                <p className="text-white/60 text-xs font-bold">🃏 {myPlayer?.name ?? 'Your'}'s Card</p>
                <p className="text-white/50 text-[10px]">Tap any unmarked cell to draw 🎱</p>
              </div>
              <div className="flex-1 min-h-0">
                {playerData?.card ? (
                  <BingoCard
                    card={playerData.card}
                    calledNumbers={game.called_numbers}
                    isWinner={myPlayer?.has_won}
                    newlyCalledNumber={newlyCalledNumber}
                    fullSize
                    onCellClick={game.status === 'playing' && !myPlayer?.has_won ? handleCallNumber : undefined}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm">Card unavailable — please rejoin.</div>
                )}
              </div>
            </>
          )}
          {error && <div className="shrink-0 p-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs">{error}</div>}
        </div>

        <div className="w-[150px] shrink-0 flex flex-col gap-2 overflow-hidden">
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
