import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getWinningCells, getBingoItemText, getBingoEmoji, COLUMN_COLORS } from '@/lib/bingo';

interface BingoCardProps {
  card: number[][];
  calledNumbers: number[];
  isWinner?: boolean;
  newlyCalledNumber?: number | null;
  /** When true the card expands to fill its container height */
  fullSize?: boolean;
  /** Called when a student clicks any cell */
  onCellClick?: (num: number) => void;
}

/** Sparkle overlay shown briefly when a cell is newly daubed */
function DaubSpark() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {['✦', '✧', '✦', '✧'].map((s, i) => (
        <span
          key={i}
          className="absolute text-yellow-300 animate-float-up font-black"
          style={{
            fontSize: '10px',
            top: `${20 + (i % 2) * 40}%`,
            left: `${15 + i * 18}%`,
            animationDelay: `${i * 0.06}s`,
            animationDuration: '0.7s',
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function BingoCell({
  num,
  isMarked,
  isWinCell,
  isNew,
  fullSize,
  onClick,
}: {
  num: number;
  isMarked: boolean;
  isWinCell: boolean;
  isNew: boolean;
  fullSize: boolean;
  onClick?: (num: number) => void;
}) {
  const prevMarkedRef = useRef(isMarked);
  const justDaubedRef = useRef(false);

  // Detect transition from unmarked → marked
  if (!prevMarkedRef.current && isMarked) {
    justDaubedRef.current = true;
  }
  prevMarkedRef.current = isMarked;

  const daubKey = useRef(0);
  if (justDaubedRef.current) {
    daubKey.current += 1;
    justDaubedRef.current = false;
  }

  return (
    <div
      key={`${num}-${daubKey.current}`}
      onClick={!isMarked && onClick ? () => onClick(num) : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 overflow-hidden',
        'transition-colors duration-200 select-none',
        !isMarked && onClick && 'cursor-pointer active:scale-95',
        !isMarked && [
          'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 text-slate-200',
          'hover:border-indigo-400 hover:from-slate-700 hover:to-slate-600 cursor-default',
        ],
        isMarked && !isWinCell && 'bg-gradient-to-br from-violet-600 to-indigo-600 border-violet-400 text-white shadow-inner',
        isWinCell && 'bg-gradient-to-br from-emerald-400 via-green-400 to-teal-400 border-emerald-300 text-white animate-win-pulse',
        isNew && 'ring-2 ring-yellow-400 ring-offset-1 animate-daub',
        isMarked && !isNew && daubKey.current > 0 && 'animate-daub',
      )}
    >
      {/* Daubed overlay */}
      {isMarked && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center pointer-events-none',
          isWinCell ? 'opacity-30' : 'opacity-20',
        )}>
          <div className={cn(
            'w-4/5 h-4/5 rounded-full border-4',
            isWinCell ? 'border-white' : 'border-violet-300',
          )} />
        </div>
      )}

      {isNew && <DaubSpark />}

      {/* Emoji */}
      <span className={cn('leading-none mb-0.5', fullSize ? 'text-lg' : 'text-base', !isMarked && 'opacity-75')}>
        {getBingoEmoji(num)}
      </span>

      {/* Label */}
      <span className={cn(
        'leading-tight text-center break-words w-full px-0.5 block font-semibold',
        fullSize ? 'text-[11px]' : 'text-[9px]',
        !isMarked && 'opacity-90 text-slate-100',
      )}>
        {getBingoItemText(num)}
      </span>

      {/* Win star */}
      {isWinCell && (
        <span className="absolute top-0.5 right-0.5 text-[8px] animate-sparkle-in">⭐</span>
      )}
    </div>
  );
}

export function BingoCard({
  card,
  calledNumbers,
  isWinner = false,
  newlyCalledNumber = null,
  fullSize = false,
  onCellClick,
}: BingoCardProps) {
  const calledSet = new Set(calledNumbers);
  const winningCells = getWinningCells(card, calledNumbers);

  const wrapperCls = cn(
    'select-none transition-all duration-500 flex flex-col gap-1',
    fullSize ? 'h-full w-full' : '',
    isWinner && 'drop-shadow-[0_0_24px_rgba(52,211,153,0.8)]',
  );

  return (
    <div className={wrapperCls}>
      {/* Column header row */}
      <div className="grid grid-cols-5 gap-1 shrink-0">
        {(['B', 'I', 'N', 'G', 'O'] as const).map((letter, col) => (
          <div
            key={letter}
            className={cn(
              'flex items-center justify-center rounded-xl font-black text-white shadow-lg',
              fullSize ? 'h-10 text-xl' : 'h-8 text-base',
              COLUMN_COLORS[col],
            )}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 5×5 cell grid */}
      <div className={cn(
        'grid grid-cols-5 grid-rows-5 gap-1',
        fullSize ? 'flex-1 min-h-0' : '',
      )}>
        {card.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const isMarked = calledSet.has(num);
            const isWinCell = winningCells.has(`${rowIdx}-${colIdx}`);
            const isNew = num === newlyCalledNumber;
            return (
              <BingoCell
                key={`${rowIdx}-${colIdx}`}
                num={num}
                isMarked={isMarked}
                isWinCell={isWinCell}
                isNew={isNew}
                fullSize={fullSize}
                onClick={onCellClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
