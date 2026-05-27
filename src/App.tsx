import { useState } from 'react'
import { nextRandom } from './engine/rng'
import { LocalGameView } from './components/LocalGameView'
import { OnlineGameView } from './components/OnlineGameView'

type GameMode = 'menu' | 'local' | 'ai' | 'online'

function App() {
  const [mode, setMode] = useState<GameMode>('menu')

  // Placeholder handlers — will be wired to real hooks in Phase 2+
  const startLocal = () => setMode('local')
  const startVsAI = () => setMode('ai')
  const startOnline = () => setMode('online')
  const backToMenu = () => setMode('menu')

  if (mode === 'local') {
    return <LocalGameView onExit={backToMenu} />
  }

  if (mode === 'ai') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1115] text-[#e5e3d8] p-8">
        <div className="text-center">
          <h1 className="text-5xl font-semibold tracking-tight mb-4">Play vs AI</h1>
          <p className="text-[#9a9585] mb-8">Choose difficulty • 1–3 computer opponents</p>
          <button 
            onClick={backToMenu}
            className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 transition"
          >
            ← Back to Menu
          </button>
        </div>
        <div className="mt-12 text-xs text-[#9a9585] opacity-60">
          Strong rule-based AI coming in Phase 3
        </div>
      </div>
    )
  }

  if (mode === 'online') {
    return <OnlineGameView onExit={backToMenu} />
  }

  // Main Menu
  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e5e3d8] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-xl">
        <div className="mb-6">
          <span className="inline-block px-4 py-1 text-xs tracking-[3px] uppercase bg-white/5 border border-white/10 rounded-full text-[#c5a26f]">
            Classic • Modern • Multiplayer
          </span>
        </div>

        <h1 className="text-7xl font-semibold tracking-[-2.5px] mb-3">Cribbage</h1>
        <p className="text-xl text-[#9a9585] mb-12">Premium digital pegging with friends</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto">
          <button
            onClick={startLocal}
            className="group px-8 py-6 rounded-2xl bg-[#16191f] hover:bg-[#1f242b] border border-white/10 transition flex flex-col items-center gap-2"
          >
            <div className="text-3xl">👥</div>
            <div className="font-medium">Local Hotseat</div>
            <div className="text-xs text-[#9a9585]">2 players on this device</div>
          </button>

          <button
            onClick={startVsAI}
            className="group px-8 py-6 rounded-2xl bg-[#16191f] hover:bg-[#1f242b] border border-white/10 transition flex flex-col items-center gap-2"
          >
            <div className="text-3xl">🤖</div>
            <div className="font-medium">Vs Computer</div>
            <div className="text-xs text-[#9a9585]">Play against AI (basic)</div>
          </button>

          <button
            onClick={startOnline}
            className="group px-8 py-6 rounded-2xl bg-[#16191f] hover:bg-[#1f242b] border border-white/10 transition flex flex-col items-center gap-2"
          >
            <div className="text-3xl">🌐</div>
            <div className="font-medium">Online Room</div>
            <div className="text-xs text-[#9a9585]">Supabase Realtime • Free</div>
          </button>
        </div>

        <div className="mt-16 text-[10px] tracking-widest text-[#9a9585] opacity-50">
          FOLLOWING THE TOWNSTONE ARCHITECTURE • PURE ENGINE FIRST
        </div>

        {/* Dev-only smoke test of the deterministic RNG (will be removed later) */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 text-[10px] font-mono opacity-30">
            RNG smoke: {nextRandom(12345).value.toFixed(4)} / shuffle works
          </div>
        )}
      </div>
    </div>
  )
}

export default App
