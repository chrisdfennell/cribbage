import { motion } from 'framer-motion';
import type { Card } from '../engine';

interface PlayingCardProps {
  card?: Card;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  H: '♥',
  D: '♦',
  C: '♣',
  S: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  H: '#c14f4f',
  D: '#c14f4f',
  C: '#1f2528',
  S: '#1f2528',
};

export function PlayingCard({
  card,
  faceUp = true,
  selected = false,
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-12 h-16 text-xs',
    md: 'w-16 h-22 text-sm',
    lg: 'w-20 h-28 text-base',
  };

  return (
    <motion.div
      whileHover={!disabled && onClick ? { y: -6, scale: 1.02 } : {}}
      whileTap={!disabled && onClick ? { scale: 0.97 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        relative select-none rounded-xl border bg-[#f8f5eb] shadow-md
        flex flex-col items-center justify-between p-1.5
        ${sizeClasses[size]}
        ${selected ? 'ring-2 ring-[#c5a26f] ring-offset-2 ring-offset-[#0f1115]' : ''}
        ${onClick && !disabled ? 'cursor-pointer active:scale-[0.985]' : ''}
        ${disabled ? 'opacity-60' : ''}
        transition-all duration-100
        ${className}
      `}
      style={{
        borderColor: selected ? '#c5a26f' : '#2a2520',
      }}
    >
      {faceUp && card ? (
        <>
          {/* Top left rank + suit */}
          <div className="self-start flex flex-col items-center leading-none font-semibold" style={{ color: SUIT_COLORS[card.suit] }}>
            <span className="text-[13px] leading-none">{card.rank}</span>
            <span className="text-base leading-none -mt-0.5">{SUIT_SYMBOLS[card.suit]}</span>
          </div>

          {/* Center suit (large) */}
          <div 
            className="text-3xl font-bold" 
            style={{ color: SUIT_COLORS[card.suit], opacity: 0.15 }}
          >
            {SUIT_SYMBOLS[card.suit]}
          </div>

          {/* Bottom right (rotated) */}
          <div className="self-end flex flex-col items-center leading-none font-semibold rotate-180" style={{ color: SUIT_COLORS[card.suit] }}>
            <span className="text-[13px] leading-none">{card.rank}</span>
            <span className="text-base leading-none -mt-0.5">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        </>
      ) : (
        // Card back
        <div className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-[#2a2216] to-[#1f180f] flex items-center justify-center">
          <div className="w-3/4 h-3/4 border border-[#c5a26f]/30 rounded flex items-center justify-center">
            <div className="text-[#c5a26f]/40 text-xl tracking-[4px]">CRIB</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
