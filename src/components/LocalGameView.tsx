import { useEffect } from 'react';
import { useLocalGame } from '../game/useLocalGame';
import { PlayingCard } from './PlayingCard';
import { CribbageBoard } from './CribbageBoard';
import { sfx, unlockAudio } from '../audio/sfx';
import { scoreHand, scoreCrib } from '../engine/scoring';

import { getAIMove, getAIDiscardIndices } from '../game/simpleAI';

interface LocalGameViewProps {
  onExit: () => void;
}

export function LocalGameView({ onExit }: LocalGameViewProps) {
  const game = useLocalGame({ playerCount: 2, seed: 123456 });

  const { 
    state, 
    legalPlays, 
    selectedForDiscard, 
    toggleDiscardSelection, 
    canConfirmDiscard, 
    confirmDiscard 
  } = game;

  const current = state.currentPlayer;

  // Very basic AI auto-play for p2 (computer)
  useEffect(() => {
    if (current !== 'p2') return;
    if (state.phase === 'gameOver') return;

    const timeout = setTimeout(() => {
      if (state.phase === 'discard') {
        const indices = getAIDiscardIndices(state, 'p2');
        game.discard(indices);
      } else if (state.phase === 'play') {
        const move = getAIMove(state, 'p2');
        if (move === 'go') {
          game.sayGo();
        } else {
          game.playCard(move);
        }
      } else if (state.phase === 'show' || state.phase === 'roundEnd') {
        game.advanceToNextRound();
      }
    }, 650);

    return () => clearTimeout(timeout);
  }, [current, state.phase, state.round]);

  const isDiscardPhase = state.phase === 'discard';
  const isPlayPhase = state.phase === 'play';
  const isShowPhase = state.phase === 'show' || state.phase === 'roundEnd';

  const currentHand = state.players[current]?.hand ?? [];

  const handleCardClick = (index: number) => {
    unlockAudio();
    if (isDiscardPhase) {
      toggleDiscardSelection(index);
      sfx.cardPlay();
    } else if (isPlayPhase) {
      if (legalPlays.includes(index)) {
        game.playCard(index);
        sfx.cardPlay();
        sfx.pegMove();
      }
    }
  };

  const handleConfirmDiscard = () => {
    if (canConfirmDiscard) {
      unlockAudio();
      confirmDiscard();
      sfx.cardPlay();
    }
  };

  const handleGo = () => {
    if (isPlayPhase) {
      unlockAudio();
      game.sayGo();
      sfx.go();
    }
  };

  const handleNextRound = () => {
    if (state.phase === 'roundEnd' || state.phase === 'show') {
      unlockAudio();
      game.advanceToNextRound();
      sfx.cardPlay();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e5e3d8] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[#c5a26f] text-sm tracking-[2px] mb-1">LOCAL HOTSEAT</div>
            <h1 className="text-4xl font-semibold tracking-tight">Cribbage</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sfx.toggleMute?.();
              }}
              className="px-4 py-2 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
              title="Toggle sound"
            >
              🔊
            </button>
            <button
              onClick={onExit}
              className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition"
            >
              Exit to Menu
            </button>
          </div>
        </div>

        {/* Phase Banner + Play Total */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="phase-banner">
            {state.phase.toUpperCase()}
          </div>
          <div className="text-[#9a9585] text-sm">
            Round {state.round} • <span className="text-[#e5e3d8]">{state.players[current]?.name}</span>'s turn
          </div>

          {isPlayPhase && (
            <div className="ml-2 px-4 py-1 rounded-full bg-[#16191f] border border-white/10 text-sm font-mono">
              Count: <span className="text-[#c5a26f] font-semibold text-lg">{state.playTotal}</span> / 31
            </div>
          )}

          {state.starter && (
            <div className="ml-auto text-xs text-[#9a9585]">
              Starter: <span className="font-mono text-[#c5a26f]">{state.starter.rank}{state.starter.suit}</span>
            </div>
          )}
        </div>

        {/* The Board - The Star */}
        <div className="flex justify-center mb-8">
          <CribbageBoard game={state} />
        </div>

        {/* Opponent Info */}
        <div className="flex gap-4 mb-4 text-sm">
          {Object.keys(state.players)
            .filter(pid => pid !== current)
            .map(pid => {
              const playerId = pid as keyof typeof state.players;
              const p = state.players[playerId];
              return (
                <div key={pid} className="bg-[#16191f] px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[#9a9585] text-xs">
                    {p.hand.length} cards • {p.score} pts
                  </div>
                </div>
              );
            })}
        </div>

        {/* Main Play Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Current Player Hand */}
          <div className="lg:col-span-7">
            <div className="flex items-baseline justify-between mb-3 px-1">
              <div className="text-sm text-[#9a9585]">
                {state.players[current]?.name}'s Hand
                {isDiscardPhase && " — Select cards to discard to crib"}
              </div>
              <div className="text-xs text-[#9a9585]">
                Score: <span className="text-[#e5e3d8] font-medium">{state.players[current]?.score}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {currentHand.length > 0 ? (
                currentHand.map((card, index) => {
                  const isSelectedForDiscard = isDiscardPhase && selectedForDiscard.includes(index);
                  const isPlayable = isPlayPhase && legalPlays.includes(index);

                  return (
                    <PlayingCard
                      key={`${card.rank}${card.suit}-${index}`}
                      card={card}
                      selected={isSelectedForDiscard || isPlayable}
                      onClick={() => handleCardClick(index)}
                      disabled={isShowPhase}
                      size="lg"
                    />
                  );
                })
              ) : (
                <div className="text-[#9a9585] italic">No cards in hand</div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-3 flex-wrap">
              {isDiscardPhase && (
                <button
                  onClick={handleConfirmDiscard}
                  disabled={!canConfirmDiscard}
                  className="px-6 py-2.5 rounded-full bg-[#c5a26f] text-black font-medium hover:bg-[#d4b17f] disabled:opacity-40 disabled:cursor-not-allowed active:bg-[#b38c5a] transition"
                >
                  Confirm Discard {selectedForDiscard.length}/2
                </button>
              )}

              {isPlayPhase && (
                <button
                  onClick={handleGo}
                  className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 active:bg-white/15 transition text-sm"
                >
                  Say "Go"
                </button>
              )}

              {isShowPhase && !state.winner && (
                <button
                  onClick={handleNextRound}
                  className="px-6 py-2.5 rounded-full bg-[#c5a26f] text-black font-medium hover:bg-[#d4b17f] active:bg-[#b38c5a] transition"
                >
                  Next Round →
                </button>
              )}
            </div>

            {isDiscardPhase && (
              <div className="mt-2 text-xs text-[#9a9585]">
                Select exactly 2 cards to send to the crib
              </div>
            )}

            {/* Show Phase Scoring Breakdown */}
            {isShowPhase && state.starter && (
              <div className="mt-6 p-4 bg-[#16191f] rounded-2xl border border-white/10">
                <div className="text-[#c5a26f] text-sm mb-3 font-medium">SCORING THIS ROUND</div>

                {Object.keys(state.players).map(pid => {
                  const p = state.players[pid as keyof typeof state.players];
                  if (p.hand.length === 0) return null;
                  const breakdown = scoreHand(p.hand, state.starter!, false);
                  return (
                    <div key={pid} className="mb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{p.name} (hand)</span>
                        <span className="font-semibold text-[#c5a26f]">+{breakdown.total}</span>
                      </div>
                      <div className="text-xs text-[#9a9585] ml-1">
                        {breakdown.fifteens > 0 && `${breakdown.fifteens} fifteens • `}
                        {breakdown.pairs > 0 && `${breakdown.pairs} pairs • `}
                        {breakdown.runs > 0 && `${breakdown.runs} run • `}
                        {breakdown.flush > 0 && `${breakdown.flush} flush • `}
                        {breakdown.nobs > 0 && `${breakdown.nobs} nob`}
                      </div>
                    </div>
                  );
                })}

                {/* Crib */}
                {state.crib.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-white/10 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Crib ({state.players[state.dealer]?.name})</span>
                      <span className="font-semibold text-[#c5a26f]">+{scoreCrib(state.crib, state.starter).total}</span>
                    </div>
                    <div className="text-xs text-[#9a9585] ml-1">
                      {state.crib.map(c => `${c.rank}${c.suit}`).join(' ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Panel - Game Info */}
          <div className="lg:col-span-5 bg-[#16191f] rounded-2xl p-5 text-sm border border-white/5">
            <div className="font-medium mb-3 text-[#c5a26f]">Game Status</div>

            <div className="space-y-2 text-[#9a9585]">
              <div>Phase: <span className="text-[#e5e3d8]">{state.phase}</span></div>
              <div>Current Player: <span className="text-[#e5e3d8]">{state.players[current]?.name}</span></div>
              <div>Crib cards: <span className="text-[#e5e3d8]">{state.crib.length}</span></div>
              <div>Play total: <span className="text-[#e5e3d8] font-mono">{state.playTotal}</span></div>
            </div>

            {state.log.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="text-[#c5a26f] text-xs mb-2 tracking-widest">RECENT LOG</div>
                <div className="text-xs text-[#9a9585] space-y-1 max-h-28 overflow-auto">
                  {state.log.slice(-4).reverse().map((entry, i) => (
                    <div key={i}>{entry}</div>
                  ))}
                </div>
              </div>
            )}

            {state.winner && (
              <div className="mt-6 p-4 bg-[#c5a26f]/10 border border-[#c5a26f]/30 rounded-xl text-center">
                <div className="text-[#c5a26f] font-semibold tracking-wider">GAME OVER</div>
                <div className="mt-1 text-xl font-medium">{state.players[state.winner]?.name} Wins!</div>
                {state.doubleSkunked && <div className="text-[#c14f4f] text-sm mt-1 font-semibold">DOUBLE SKUNK!</div>}
                {state.skunked && !state.doubleSkunked && <div className="text-[#c14f4f] text-sm mt-1 font-semibold">SKUNK!</div>}

                <button
                  onClick={() => {
                    unlockAudio();
                    sfx.win();
                    game.startNewGame({ playerCount: 2 });
                  }}
                  className="mt-4 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-sm border border-white/20 transition"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-[10px] text-[#9a9585] opacity-50 text-center">
          Pure engine • Local hotseat • Work in progress
        </div>
      </div>
    </div>
  );
}
