import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { COLUMN_COLORS, getBingoItemText, getBingoEmoji } from '@shared/bingo-logic';

const BALL_GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-green-500 to-green-700',
  'from-yellow-400 to-yellow-600',
  'from-red-500 to-red-700',
];

export function Confetti() {
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

export function BingoLogo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-10 h-10 text-base' : 'w-7 h-7 text-sm';
  return (
    <div className="flex gap-0.5">
      {(['B','I','N','G','O'] as const).map((l, i) => (
        <span key={l} className={cn('rounded font-black text-white flex items-center justify-center', COLUMN_COLORS[i], cls)}>{l}</span>
      ))}
    </div>
  );
}

export function BallCaller({ num, animKey }: { num: number | null; animKey: number }) {
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

export function NumberBoard({ calledNumbers }: { calledNumbers: number[] }) {
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
