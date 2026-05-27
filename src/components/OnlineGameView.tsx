import { useState } from 'react';
import { useSupabaseGame } from '../game/useSupabaseGame';
import { PlayingCard } from './PlayingCard';
import { CribbageBoard } from './CribbageBoard';

interface OnlineGameViewProps {
  onExit: () => void;
}

export function OnlineGameView({ onExit }: OnlineGameViewProps) {
  const game = useSupabaseGame();
  const [playerName, setPlayerName] = useState('Player');
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const { 
    state, 
    roomCode, 
    isHost, 
    playersInRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    discard,
    playCard,
    sayGo,
    advanceToNextRound,
  } = game;

  const currentPlayer = state.currentPlayer;
  const currentHand = state.players[currentPlayer]?.hand ?? [];
  const isDiscardPhase = state.phase === 'discard';
  const isPlayPhase = state.phase === 'play';
  const isShowPhase = state.phase === 'show' || state.phase === 'roundEnd';

  const [selectedDiscard, setSelectedDiscard] = useState<number[]>([]);

  const handleCreateRoom = async () => {
    await createRoom(playerName || 'Player');
  };

  const handleJoinRoom = async () => {
    if (joinCode.length < 4) return;
    await joinRoom(joinCode, playerName || 'Player');
    setJoinCode('');
    setShowJoin(false);
  };

  const toggleDiscard = (index: number) => {
    setSelectedDiscard(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : prev.length < 2
          ? [...prev, index]
          : [...prev.slice(1), index]
    );
  };

  const confirmDiscard = () => {
    if (selectedDiscard.length === 2) {
      discard(selectedDiscard);
      setSelectedDiscard([]);
    }
  };

  const handlePlayCard = (index: number) => {
    playCard(index);
  };

  if (!roomCode) {
    return (
      <div className="min-h-screen bg-[#0f1115] text-[#e5e3d8] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-[#c5a26f] text-sm tracking-[3px] mb-2">ONLINE MULTIPLAYER</div>
            <h1 className="text-5xl font-semibold tracking-tight">Cribbage</h1>
            <p className="text-[#9a9585] mt-2">Play with friends using room codes</p>
          </div>

          <div className="bg-[#16191f] p-6 rounded-2xl border border-white/10">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-[#0f1115] border border-white/20 rounded-xl px-4 py-3 mb-4 text-lg"
            />

            {!showJoin ? (
              <div className="space-y-3">
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 rounded-xl bg-[#c5a26f] text-black font-medium text-lg hover:bg-[#d4b17f] transition"
                >
                  Create New Room
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 transition"
                >
                  Join Existing Room
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  className="w-full bg-[#0f1115] border border-white/20 rounded-xl px-4 py-3 mb-4 text-center text-2xl font-mono tracking-[6px] uppercase"
                  maxLength={6}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJoin(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    disabled={joinCode.length < 4}
                    className="flex-1 py-3 rounded-xl bg-[#c5a26f] text-black font-medium disabled:opacity-50"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={onExit} className="mt-6 text-sm text-[#9a9585] hover:text-white mx-auto block">
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // In-room game view
  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e5e3d8] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-[#c5a26f] text-sm">ROOM CODE</div>
            <div className="text-4xl font-mono tracking-[6px] text-[#c5a26f]">{roomCode}</div>
          </div>
          <button onClick={leaveRoom} className="px-5 py-2 rounded-full bg-white/5 border border-white/20 text-sm">
            Leave Room
          </button>
        </div>

        <div className="text-sm text-[#9a9585] mb-6">
          Players: {playersInRoom.join(', ') || 'Waiting for players...'} 
          {isHost && ' (You are host)'}
        </div>

        <CribbageBoard game={state} className="mb-8" />

        <div className="text-sm mb-2 text-[#9a9585]">
          {state.phase.toUpperCase()} • {state.players[currentPlayer]?.name}'s turn
          {isPlayPhase && ` • Count: ${state.playTotal}`}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {currentHand.map((card, index) => {
            const isSelected = selectedDiscard.includes(index);
            return (
              <PlayingCard
                key={index}
                card={card}
                selected={isSelected}
                onClick={() => {
                  if (isDiscardPhase) toggleDiscard(index);
                  else if (isPlayPhase) handlePlayCard(index);
                }}
                size="lg"
              />
            );
          })}
        </div>

        <div className="flex gap-3 flex-wrap">
          {isDiscardPhase && (
            <button
              onClick={confirmDiscard}
              disabled={selectedDiscard.length !== 2}
              className="px-6 py-2.5 rounded-full bg-[#c5a26f] text-black font-medium disabled:opacity-40"
            >
              Confirm Discard ({selectedDiscard.length}/2)
            </button>
          )}

          {isPlayPhase && (
            <button onClick={sayGo} className="px-6 py-2.5 rounded-full bg-white/5 border border-white/20">
              Say "Go"
            </button>
          )}

          {isShowPhase && (
            <button onClick={advanceToNextRound} className="px-6 py-2.5 rounded-full bg-[#c5a26f] text-black font-medium">
              Next Round
            </button>
          )}
        </div>

        <button onClick={onExit} className="mt-8 text-sm text-[#9a9585] hover:text-white">
          ← Exit to Main Menu
        </button>
      </div>
    </div>
  );
}
