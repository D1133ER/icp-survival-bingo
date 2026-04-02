import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface WinnerModalProps {
  winnerName: string | null;
  myName: string | undefined;
}

export function WinnerModal({ winnerName, myName }: WinnerModalProps) {
  const navigate = useNavigate();
  const isMe = winnerName === myName;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 backdrop-blur-md">
      <div className="bg-gradient-to-br from-violet-900 to-indigo-900 border border-white/20 rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full mx-4">
        <div className="text-8xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-5xl font-black text-white mb-3 shimmer-text">BINGO!</h2>
        {isMe ? (
          <>
            <p className="text-2xl font-bold text-emerald-400 mb-1">You won! 🏆</p>
            <p className="text-white/60 text-sm">Congratulations, legend!</p>
          </>
        ) : (
          <>
            <p className="text-xl text-white/80 mb-1">
              <span className="font-black text-amber-400">{winnerName}</span> wins!
            </p>
            <p className="text-white/50 text-sm">Better luck next time 💪</p>
          </>
        )}
        <Button
          className="mt-8 w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold"
          size="lg"
          onClick={() => navigate('/')}
        >
          🏠 Play Again
        </Button>
      </div>
    </div>
  );
}
