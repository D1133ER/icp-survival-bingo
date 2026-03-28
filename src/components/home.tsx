import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createGame, joinGame } from '@/lib/api';
import { COLUMN_COLORS, BINGO_ITEMS, getBingoEmoji } from '@/lib/bingo';

// Floating bingo ball decoration
function FloatingBall({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full flex items-center justify-center pointer-events-none select-none"
      style={{
        width: 48, height: 48,
        background: 'rgba(255,255,255,0.08)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(4px)',
        fontSize: 20,
        animation: 'confettiFall 12s linear infinite',
        ...style,
      }}
    >
      {emoji}
    </div>
  );
}

const FEATURE_CARDS = [
  { icon: '🎮', title: 'Live Drawing', desc: 'Teacher draws items live for everyone' },
  { icon: '⚡', title: 'Instant Win', desc: 'Rows, columns & diagonals count' },
  { icon: '👥', title: 'Multiplayer', desc: 'Play with classmates in real-time' },
  { icon: '🏆', title: 'First to BINGO', desc: 'First complete pattern wins!' },
];

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hostName, setHostName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await createGame(hostName.trim());
      localStorage.setItem(
        `bingo_player_${data.code}`,
        JSON.stringify({ playerId: data.playerId, isHost: true, card: data.card })
      );
      navigate(`/game/${data.code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = gameCode.trim().toUpperCase();
    if (!playerName.trim() || !code) return;
    setLoading(true);
    setError('');
    try {
      const data = await joinGame(code, playerName.trim());
      localStorage.setItem(
        `bingo_player_${code}`,
        JSON.stringify({ playerId: data.playerId, isHost: false, card: data.card })
      );
      navigate(`/game/${code}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-900 to-blue-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* ── Animated background orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-[0.07] bg-white"
            style={{
              width: `${50 + (i * 31) % 100}px`,
              height: `${50 + (i * 31) % 100}px`,
              top: `${(i * 41) % 100}%`,
              left: `${(i * 67) % 100}%`,
              animation: `winPulse ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.5) % 3}s`,
            }}
          />
        ))}
        {/* Floating emoji balls */}
        {[
          { emoji: '🎲', top: '8%', left: '6%', delay: '0s' },
          { emoji: '⭐', top: '18%', right: '8%', delay: '2s' },
          { emoji: '🎉', top: '75%', left: '4%', delay: '4s' },
          { emoji: '🏆', bottom: '10%', right: '6%', delay: '1.5s' },
          { emoji: '✨', top: '45%', left: '2%', delay: '3s' },
          { emoji: '🎲', top: '60%', right: '4%', delay: '0.8s' },
        ].map(({ emoji, delay, ...pos }, i) => (
          <FloatingBall key={i} emoji={emoji} style={{ ...pos, animationDelay: delay, animationDuration: `${10 + i * 2}s` }} />
        ))}
      </div>

      <div className="w-full max-w-lg relative z-10">

        {/* ── Hero: BINGO letters ── */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-2 mb-5">
            {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
              <span
                key={letter}
                className={`${COLUMN_COLORS[i]} text-4xl sm:text-5xl font-black w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl text-white shadow-2xl ring-2 ring-white/25 animate-bounce`}
                style={{ animationDelay: `${i * 0.12}s`, animationDuration: '2s' }}
              >
                {letter}
              </span>
            ))}
          </div>
          <h1 className="text-white text-2xl font-black mb-1 tracking-tight">ICP Survival Bingo</h1>
          <p className="text-indigo-300 text-sm mb-4">Tick off your college survival moments with friends 🎓</p>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-1">
            {FEATURE_CARDS.map(f => (
              <div key={f.icon} className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-full px-3 py-1 text-xs text-white/70">
                <span>{f.icon}</span>
                <span className="font-semibold">{f.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sample items ticker ── */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {[0, 3, 7, 10, 16, 20].map(i => (
            <span key={i} className="bg-white/10 border border-white/10 text-white/60 text-[10px] px-2.5 py-1 rounded-full backdrop-blur">
              {getBingoEmoji(i + 1)} {BINGO_ITEMS[i]}
            </span>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/10 text-white border border-white/10 h-11">
            <TabsTrigger value="create" className="data-[state=active]:bg-white data-[state=active]:text-indigo-900 text-white/70 font-semibold">
              👩‍🏫 Teacher
            </TabsTrigger>
            <TabsTrigger value="join" className="data-[state=active]:bg-white data-[state=active]:text-indigo-900 text-white/70 font-semibold">
              🎓 Student
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="bg-white/10 backdrop-blur border-white/20 text-white shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Create a Class Game</CardTitle>
                <CardDescription className="text-indigo-300">Share the room code with your students once it's created</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateGame} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hostName" className="text-indigo-200">Teacher Name</Label>
                    <Input
                      id="hostName"
                      placeholder="e.g. Prof. Sharma"
                      value={hostName}
                      onChange={e => setHostName(e.target.value)}
                      disabled={loading}
                      maxLength={50}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-300 h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold shadow-lg h-12 text-base"
                    disabled={loading || !hostName.trim()}
                    size="lg"
                  >
                    {loading ? '⏳ Creating…' : '👩‍🏫 Create Class Room'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="bg-white/10 backdrop-blur border-white/20 text-white shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Join as Student</CardTitle>
                <CardDescription className="text-indigo-300">Enter the 6-character code from your teacher</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinGame} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="playerName" className="text-indigo-200">Your Name</Label>
                    <Input
                      id="playerName"
                      placeholder="e.g. Priya"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      disabled={loading}
                      maxLength={50}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-indigo-300 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gameCode" className="text-indigo-200">Game Code</Label>
                    <Input
                      id="gameCode"
                      placeholder="ABC123"
                      value={gameCode}
                      onChange={e => setGameCode(e.target.value.toUpperCase())}
                      disabled={loading}
                      className="uppercase tracking-[0.4em] font-mono text-xl text-center bg-white/10 border-white/20 text-white placeholder:text-white/25 focus:border-indigo-300 h-12"
                      maxLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg h-12 text-base"
                    disabled={loading || !playerName.trim() || gameCode.trim().length < 6}
                    size="lg"
                  >
                    {loading ? '⏳ Joining…' : '🎯 Join Room'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── How to Play ── */}
        <details className="mt-5 group">
          <summary className="cursor-pointer list-none flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-xs font-semibold transition-colors select-none">
            <span className="border border-white/15 group-open:border-white/30 px-3 py-1 rounded-full transition-colors">
              ❓ How to Play
            </span>
          </summary>
          <div className="mt-3 bg-white/8 border border-white/10 rounded-2xl p-4 text-sm space-y-4">
            <div>
              <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-2">👩‍🏫 For the Teacher</p>
              <ol className="space-y-1.5 text-white/70 text-xs list-none">
                <li className="flex gap-2"><span className="text-indigo-400 font-black shrink-0">1.</span> Open the app and go to the <span className="text-white font-semibold">Teacher</span> tab.</li>
                <li className="flex gap-2"><span className="text-indigo-400 font-black shrink-0">2.</span> Enter your name and click <span className="text-white font-semibold">Create Class Room</span>.</li>
                <li className="flex gap-2"><span className="text-indigo-400 font-black shrink-0">3.</span> Share the 6-letter game code with students.</li>
                <li className="flex gap-2"><span className="text-indigo-400 font-black shrink-0">4.</span> Once everyone joins, click <span className="text-white font-semibold">Start Class</span>.</li>
                <li className="flex gap-2"><span className="text-indigo-400 font-black shrink-0">5.</span> Watch the live leaderboard as students play — the last called item and student progress update automatically.</li>
              </ol>
            </div>
            <div className="h-px bg-white/10" />
            <div>
              <p className="text-emerald-300 font-bold text-xs uppercase tracking-widest mb-2">🎓 For Students</p>
              <ol className="space-y-1.5 text-white/70 text-xs list-none">
                <li className="flex gap-2"><span className="text-emerald-400 font-black shrink-0">1.</span> Open the app, go to the <span className="text-white font-semibold">Student</span> tab.</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-black shrink-0">2.</span> Enter your name and the code your teacher gave you, then click <span className="text-white font-semibold">Join Room</span>.</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-black shrink-0">3.</span> Wait for the teacher to start the game.</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-black shrink-0">4.</span> Your 5×5 card has 25 ICP survival moments. <span className="text-white font-semibold">Tap any cell that applies to you</span> — it gets marked on everyone's screen.</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-black shrink-0">5.</span> Complete a full <span className="text-white font-semibold">row, column, or diagonal</span> to win and shout <span className="text-white font-bold">BINGO! 🎉</span></li>
              </ol>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex flex-wrap gap-2 justify-center text-[10px] text-white/40">
              <span className="bg-white/8 rounded-full px-2.5 py-1">25 unique items per card</span>
              <span className="bg-white/8 rounded-full px-2.5 py-1">Rows · Columns · Diagonals win</span>
              <span className="bg-white/8 rounded-full px-2.5 py-1">Live sync every 2s</span>
              <span className="bg-white/8 rounded-full px-2.5 py-1">First BINGO wins 🏆</span>
            </div>
          </div>
        </details>

        <div className="flex items-center justify-center gap-4 mt-4">
          <p className="text-center text-white/25 text-xs">
            25 unique items · Rows, columns & diagonals win · Auto-synced every 2s
          </p>
          <a
            href="/print"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white/70 text-xs border border-white/15 hover:border-white/30 px-3 py-1 rounded-full transition-colors shrink-0"
          >
            🖨️ Print Card
          </a>
        </div>
      </div>
    </div>
  );
}
