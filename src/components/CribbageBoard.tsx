import { motion } from 'framer-motion';
import type { GameState, PlayerId } from '../engine';

interface CribbageBoardProps {
  game: GameState;
  className?: string;
}

const PEG_COLORS: Record<PlayerId, string> = {
  p1: '#c14f4f',   // Red
  p2: '#4a7cb8',   // Blue
  p3: '#4a8f5c',   // Green
  p4: '#c5a24f',   // Gold
};

export function CribbageBoard({ game, className = '' }: CribbageBoardProps) {
  // Horizontal cribbage board layout
  // Two tracks per player (outer + inner) for leapfrogging
  const HOLE_SPACING = 13;
  const START_X = 42;
  const ROW_Y = [38, 54, 92, 108]; // p1 outer, p1 inner | p2 outer, p2 inner

  // Generate the 120 main holes
  const holes: Array<{ x: number; y: number; id: string }> = [];
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 30; i++) {
      holes.push({
        x: START_X + i * HOLE_SPACING,
        y: ROW_Y[row],
        id: `hole-${row}-${i}`,
      });
    }
  }

  const extraHoles = [
    { x: 26, y: 72, id: 'start-1' },
    { x: 26, y: 88, id: 'start-2' },
    { x: 455, y: 48, id: 'game-1' },
    { x: 455, y: 98, id: 'game-2' },
  ];

  /**
   * Convert score 0-121 to board position.
   * Traditional layout: 0-30 on outer track going right, then 31-60 on inner track coming back,
   * then 61-90 outer again, 91-120 inner again, final stretch to 121.
   * This version is a reasonable visual approximation.
   */
  function getPegPositionForScore(score: number, playerIndex: number, pegIndex: 0 | 1) {
    const clamped = Math.max(0, Math.min(score, 121));
    const rowBase = playerIndex === 0 ? 0 : 2;

    let track = 0;
    let pos = clamped;

    if (clamped <= 30) {
      track = 0;
      pos = clamped;
    } else if (clamped <= 60) {
      track = 1;
      pos = clamped - 30;
    } else if (clamped <= 90) {
      track = 0;
      pos = clamped - 60;
    } else {
      track = 1;
      pos = clamped - 90;
    }

    const row = rowBase + track;
    const x = START_X + Math.min(pos, 29) * HOLE_SPACING;
    const y = ROW_Y[row] + (pegIndex === 0 ? -3 : 3);

    return { x, y };
  }

  const playerIds = Object.keys(game.players) as PlayerId[];

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 500 145"
        className="w-full max-w-[620px] rounded-[28px] shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #3a2f1f 0%, #2a2216 100%)' }}
      >
        {/* Board body */}
        <rect
          x="18" y="12" width="464" height="122"
          rx="22" ry="22"
          fill="#3a2f1f"
          stroke="#1f180f"
          strokeWidth="14"
        />

        {/* Inner wood detail */}
        <rect
          x="28" y="22" width="444" height="102"
          rx="14" ry="14"
          fill="none"
          stroke="#2a2216"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Track numbers */}
        {[0,5,10,15,20,25,29].map((n, i) => (
          <text
            key={i}
            x={START_X + n * HOLE_SPACING}
            y="26"
            fontSize="8"
            fill="#c5a26f"
            opacity="0.5"
            textAnchor="middle"
          >
            {n}
          </text>
        ))}

        {/* Skunk lines (visual markers at 60 and 90) */}
        {[60, 90].map((score, i) => {
          const x = START_X + ((score % 30) * HOLE_SPACING);
          return (
            <g key={i}>
              <line x1={x} y1="32" x2={x} y2="114" stroke="#c14f4f" strokeWidth="1.5" opacity="0.35" />
            </g>
          );
        })}

        {/* Peg holes */}
        {holes.map((hole) => (
          <circle
            key={hole.id}
            cx={hole.x}
            cy={hole.y}
            r="3.2"
            fill="#1f180f"
            stroke="#0f0c08"
            strokeWidth="1"
          />
        ))}

        {/* Extra holes */}
        {extraHoles.map((hole) => (
          <circle
            key={hole.id}
            cx={hole.x}
            cy={hole.y}
            r="3.2"
            fill="#1f180f"
            stroke="#0f0c08"
            strokeWidth="1"
          />
        ))}

        {/* Player labels */}
        <text x="32" y="32" fontSize="9" fill="#c5a26f" opacity="0.6">P1</text>
        <text x="32" y="118" fontSize="9" fill="#c5a26f" opacity="0.6">P2</text>

        {/* Pegs - positioned by actual score */}
        {playerIds.map((pid, playerIndex) => {
          const color = PEG_COLORS[pid] || '#888';
          const playerScore = game.players[pid]?.score ?? 0;

          return [0, 1].map((pegIdx) => {
            // Use front peg for current score, back peg slightly behind for classic look
            const displayScore = pegIdx === 0 ? playerScore : Math.max(0, playerScore - 3);
            const { x, y } = getPegPositionForScore(displayScore, playerIndex, pegIdx as 0 | 1);

            return (
              <g key={`${pid}-${pegIdx}`}>
                {/* Peg shadow */}
                <circle cx={x + 1.5} cy={y + 2} r="4.5" fill="#000000" opacity="0.25" />
                {/* Peg body */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r="4.2"
                  fill={color}
                  stroke="#111"
                  strokeWidth="1"
                  animate={{ cx: x, cy: y }}
                  transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                />
                {/* Highlight */}
                <circle cx={x - 1.2} cy={y - 1.2} r="1.6" fill="white" opacity="0.35" />
              </g>
            );
          });
        })}

        {/* Center line / bridge */}
        <rect x="35" y="70" width="430" height="5" rx="2" fill="#1f180f" opacity="0.5" />
      </svg>

      {/* Score labels below board */}
      <div className="flex justify-between mt-2 text-xs text-[#9a9585] px-2">
        {playerIds.map((pid) => (
          <div key={pid} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PEG_COLORS[pid] }} />
            <span>{game.players[pid]?.name ?? pid}: <span className="font-semibold text-[#e5e3d8]">{game.players[pid]?.score ?? 0}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
