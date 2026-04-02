import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { COLUMN_COLORS } from '@shared/bingo-logic';
import type { PlayerSummary, GameStateResponse } from '@shared/types';

interface LeaderboardProps {
  game: GameStateResponse;
  onPeekPlayer: (player: { id: number; name: string; card: number[][] }) => void;
  onDeclareWinner: (winnerId: number, winnerName: string) => void;
}

export function Leaderboard({ game, onPeekPlayer, onDeclareWinner }: LeaderboardProps) {
  const students = [...game.players]
    .filter(p => !p.is_host)
    .sort((a, b) => {
      const aTotal = a.manually_marked?.length ?? 0;
      const bTotal = b.manually_marked?.length ?? 0;
      return bTotal !== aTotal ? bTotal - aTotal : b.matched_count - a.matched_count;
    });

  return (
    <>
      <div className="shrink-0 flex items-center justify-between">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">📊 Class Leaderboard</p>
        <div className="flex items-center gap-2 text-[9px] text-white/30">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />self-marked</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />called</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll">
        {students.map((player, idx) => (
          <LeaderboardRow
            key={player.id}
            player={player}
            rank={idx}
            gameStatus={game.status}
            gameCode={game.code}
            onPeek={() => onPeekPlayer({ id: player.id, name: player.name, card: player.card })}
            onDeclareWinner={() => onDeclareWinner(player.id, player.name)}
          />
        ))}
        {students.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">🎓</span>
            <p className="text-white/30 text-sm text-center">No students have joined yet</p>
            <p className="text-white/20 text-xs text-center">Share code <span className="font-mono font-bold text-white/40">{game.code}</span> to get started</p>
          </div>
        )}
      </div>
    </>
  );
}

function LeaderboardRow({
  player,
  rank,
  gameStatus,
  onPeek,
  onDeclareWinner,
}: {
  player: PlayerSummary;
  rank: number;
  gameStatus: string;
  gameCode: string;
  onPeek: () => void;
  onDeclareWinner: () => void;
}) {
  const markedCount = player.manually_marked?.length ?? 0;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl mb-2 border transition-all duration-300',
      player.has_won
        ? 'bg-emerald-500/20 border-emerald-400/40'
        : rank === 0 ? 'bg-white/8 border-white/15' : 'bg-white/5 border-white/10',
    )}>
      <span className={cn(
        'text-xs font-black w-5 text-right shrink-0',
        rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-700' : 'text-white/30',
      )}>
        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
      </span>
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0', COLUMN_COLORS[rank % 5])}>
        {player.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-white font-bold text-sm truncate">{player.name}</span>
          {player.has_won && <Badge className="bg-emerald-500 text-white text-[10px] py-0 px-1.5 border-0 shrink-0">BINGO! 🎉</Badge>}
        </div>
        {/* Self-marked progress bar */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
              style={{ width: `${(markedCount / 25) * 100}%` }} />
          </div>
          <span className="text-amber-400/80 text-[10px] font-bold shrink-0 w-8 text-right">{markedCount}/25</span>
        </div>
        {/* Called numbers matched bar */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full transition-all duration-700"
              style={{ width: `${(player.matched_count / 25) * 100}%` }} />
          </div>
          <span className="text-white/40 text-[10px] font-bold shrink-0 w-8 text-right">{player.matched_count}/25</span>
        </div>
      </div>
      {player.card && (
        <button onClick={onPeek}
          className="shrink-0 ml-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white/10 border border-white/10 text-white/50 hover:bg-white/20 hover:text-white/80 transition-all"
          title={`View ${player.name}'s card`}>
          👁
        </button>
      )}
      {gameStatus === 'playing' && !player.has_won && (
        <button onClick={onDeclareWinner}
          className="shrink-0 ml-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/40 hover:text-amber-200 transition-all"
          title={`Declare ${player.name} as winner`}>
          👑
        </button>
      )}
    </div>
  );
}
