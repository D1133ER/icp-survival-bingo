import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AutoDrawControlsProps {
  autoDrawing: boolean;
  autoDrawPaused: boolean;
  autoDrawInterval: number;
  countdown: number | null;
  drawLimitEnabled: boolean;
  drawLimit: number | null;
  ttsEnabled: boolean;
  soundEnabled: boolean;
  calledCount: number;
  gameFinished: boolean;
  setDrawLimitEnabled: (v: boolean) => void;
  setDrawLimit: (v: number | null) => void;
  setTtsEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  onStartAutoDraw: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onManualDraw: () => void;
  onChangeSpeed: (speed: number) => void;
}

export function AutoDrawControls({
  autoDrawing,
  autoDrawPaused,
  autoDrawInterval,
  countdown,
  drawLimitEnabled,
  drawLimit,
  ttsEnabled,
  soundEnabled,
  calledCount,
  gameFinished,
  setDrawLimitEnabled,
  setDrawLimit,
  setTtsEnabled,
  setSoundEnabled,
  onStartAutoDraw,
  onPause,
  onResume,
  onStop,
  onManualDraw,
  onChangeSpeed,
}: AutoDrawControlsProps) {
  const allCalled = calledCount >= 25;

  return (
    <div className="shrink-0 flex flex-col gap-1.5 bg-white/5 border border-white/10 rounded-xl p-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wide shrink-0">Speed:</span>
          {[3, 5, 8, 12].map(s => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={cn(
                'px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all',
                autoDrawInterval === s
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white',
              )}
            >
              {s}s
            </button>
          ))}
        </div>
        {!autoDrawing ? (
          <Button
            onClick={onStartAutoDraw}
            disabled={allCalled || gameFinished}
            size="sm"
            className="shrink-0 font-bold shadow-lg px-4 transition-all bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            {allCalled ? '✅ All Called' : '▶ Auto Draw'}
          </Button>
        ) : (
          <>
            <Button
              onClick={autoDrawPaused ? onResume : onPause}
              size="sm"
              className={cn(
                'shrink-0 font-bold px-3 transition-all',
                autoDrawPaused
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white',
              )}
            >
              {autoDrawPaused ? '▶ Resume' : `⏸ ${countdown !== null ? `${countdown}s` : 'Pause'}`}
            </Button>
            <Button
              onClick={onStop}
              size="sm"
              className="shrink-0 font-bold px-3 transition-all bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
            >
              ■ Stop
            </Button>
          </>
        )}
        <Button
          onClick={onManualDraw}
          disabled={allCalled || gameFinished}
          size="sm"
          variant="outline"
          className="shrink-0 border-white/20 text-white hover:bg-white/10 px-3 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Draw one number manually (works during auto-draw)"
        >
          🎱
        </Button>
      </div>
      {autoDrawing && !autoDrawPaused && (
        <div className="flex items-center gap-2 px-0.5">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: countdown !== null ? `${(countdown / autoDrawInterval) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-white/40 text-[9px] font-mono w-6 text-right shrink-0">
            {countdown !== null ? `${countdown}s` : '…'}
          </span>
        </div>
      )}
      {autoDrawing && autoDrawPaused && (
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-amber-400 text-[10px] font-bold animate-pulse">⏸ Paused</span>
          <span className="text-white/30 text-[10px]">— Manual draw still available</span>
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-[10px] text-white/50 cursor-pointer">
          <input
            type="checkbox"
            checked={drawLimitEnabled}
            onChange={(e) => setDrawLimitEnabled(e.target.checked)}
            className="w-3 h-3 rounded accent-indigo-500"
          />
          Limit:
          <input
            type="number"
            min={1}
            max={25}
            value={drawLimit ?? 20}
            onChange={(e) => setDrawLimit(Math.min(25, Math.max(1, parseInt(e.target.value) || 1)))}
            disabled={!drawLimitEnabled}
            className="w-10 bg-white/10 text-white text-[10px] rounded px-1 py-0.5 border border-white/10 disabled:opacity-30"
          />
          draws
        </label>
        <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer">
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
            className="w-3 h-3 rounded accent-indigo-500"
          />
          🔊 TTS
        </label>
        <label className="flex items-center gap-1 text-[10px] text-white/50 cursor-pointer">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="w-3 h-3 rounded accent-indigo-500"
          />
          🔔 Sound
        </label>
      </div>
    </div>
  );
}
