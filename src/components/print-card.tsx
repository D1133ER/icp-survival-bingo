import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BINGO_ITEMS, getBingoEmoji } from '@/lib/bingo';

interface PlayerData {
  playerId: number;
  isHost: boolean;
  card: number[][];
}

// Fallback: sequential layout used when no game code / card is found
const STATIC_CARD: number[][] = Array.from({ length: 5 }, (_, row) =>
  Array.from({ length: 5 }, (_, col) => row * 5 + col + 1)
);

const COL_COLORS = [
  { bg: 'bg-blue-500', border: 'border-blue-400' },
  { bg: 'bg-purple-500', border: 'border-purple-400' },
  { bg: 'bg-green-500', border: 'border-green-400' },
  { bg: 'bg-yellow-500', border: 'border-yellow-400' },
  { bg: 'bg-red-500', border: 'border-red-400' },
];

export default function PrintCard() {
  const [searchParams] = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);

  // Try to load the player's actual randomized card from localStorage
  const code = searchParams.get('code');
  let card: number[][] = STATIC_CARD;
  let playerName: string | null = null;
  if (code) {
    try {
      const stored = localStorage.getItem(`bingo_player_${code.toUpperCase()}`);
      if (stored) {
        const data: PlayerData = JSON.parse(stored);
        if (data.card && data.card.length === 5) {
          card = data.card;
        }
      }
    } catch {
      // fall back to static
    }
    // Try to get the player name from the game state if available
    try {
      const raw = localStorage.getItem(`bingo_player_${code.toUpperCase()}`);
      if (raw) playerName = null; // name isn't stored separately; playerId is enough
    } catch { /* ignore */ }
  }

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start py-8 px-4">

      {/* ── Toolbar (hidden when printing) ── */}
      <div className="no-print mb-6 flex flex-col items-center gap-3">
        <h1 className="text-2xl font-black text-gray-800">ICP Survival Bingo — Printable Card</h1>
        {code ? (
          <p className="text-sm text-indigo-600 font-semibold">
            🎲 Showing your unique card for game <span className="font-mono tracking-widest">{code.toUpperCase()}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500">This is a sample card. Join a game to print your unique card.</p>
        )}
        <button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl shadow-md text-sm transition-colors"
        >
          🖨️ Print Card
        </button>
      </div>

      {/* ── Bingo Card ── */}
      <div
        ref={cardRef}
        className="bingo-print-card bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200"
        style={{ width: 680, fontFamily: 'sans-serif' }}
      >
        {/* Title banner */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-center py-3 px-6">
          <div className="flex justify-center gap-2 mb-1">
            {['B', 'I', 'N', 'G', 'O'].map((l, i) => (
              <span
                key={l}
                className={`${COL_COLORS[i].bg} w-9 h-9 flex items-center justify-center rounded-lg text-white font-black text-lg shadow`}
              >
                {l}
              </span>
            ))}
          </div>
          <p className="text-white/80 text-xs tracking-widest uppercase">ICP Survival Bingo · Student Edition</p>
        </div>

        {/* Column header row */}
        <div className="grid grid-cols-5 gap-[2px] bg-gray-200 border-b-2 border-gray-200">
          {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
            <div key={letter} className={`${COL_COLORS[i].bg} text-white font-black text-center text-xl py-2`}>
              {letter}
            </div>
          ))}
        </div>

        {/* 5×5 Cell Grid — uses the player's actual randomized card */}
        <div className="grid grid-cols-5 gap-[2px] bg-gray-200">
          {card.map((row, rowIdx) =>
            row.map((num, colIdx) => {
              const text = BINGO_ITEMS[num - 1] ?? '';
              const emoji = getBingoEmoji(num);
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="flex flex-col items-center justify-center text-center p-2 min-h-[112px] bg-white"
                >
                  <div className={`w-20 h-20 rounded-full border-2 ${COL_COLORS[colIdx].border} bg-white flex flex-col items-center justify-center p-1 shadow-sm`}>
                    <span className="text-2xl leading-none mb-0.5">{emoji}</span>
                    <span className="text-[9px] leading-tight font-semibold text-center px-0.5 break-words text-gray-700">
                      {text}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 text-center py-2 px-4">
          <p className="text-[10px] text-gray-400 tracking-wide">
            Mark each square when it happens to you · Complete a row, column, or diagonal to win!
          </p>
        </div>
      </div>

      {/* ── Instructions (hidden when printing) ── */}
      <div className="no-print mt-6 max-w-xl text-center text-gray-500 text-sm">
        <p>Use <strong>Ctrl+P</strong> or click the Print button to print this card. Works best in landscape mode or at 80% scale.</p>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .bingo-print-card {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}
