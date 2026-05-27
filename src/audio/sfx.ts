/**
 * Simple procedural sound effects for Cribbage.
 * Zero asset files — everything is synthesized.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

export function setMuted(value: boolean) {
  muted = value;
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.6;
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = getContext();
  if (!ctx || !masterGain || muted) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.value = freq;

  filter.type = 'lowpass';
  filter.frequency.value = 2200;

  gain.gain.value = volume;

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function playNoise(duration: number, volume = 0.2, filterFreq = 800) {
  const ctx = getContext();
  if (!ctx || !masterGain || muted) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  noise.start();
}

export const sfx = {
  toggleMute,
  cardPlay() {
    playTone(620, 0.08, 'triangle', 0.22);
    playTone(880, 0.06, 'sine', 0.15);
  },

  pegMove() {
    playTone(480, 0.09, 'sine', 0.18);
    setTimeout(() => playTone(720, 0.06, 'sine', 0.12), 40);
  },

  fifteen() {
    playTone(880, 0.12, 'triangle', 0.25);
    playTone(1320, 0.18, 'sine', 0.18);
  },

  thirtyOne() {
    playTone(660, 0.1, 'triangle', 0.3);
    playTone(990, 0.1, 'triangle', 0.22);
    playTone(1320, 0.22, 'sine', 0.2);
  },

  go() {
    playTone(420, 0.15, 'sawtooth', 0.18);
  },

  lastCard() {
    playTone(780, 0.08, 'sine', 0.2);
    playTone(1040, 0.12, 'sine', 0.16);
  },

  win() {
    [660, 880, 1100, 1320].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.22, 'triangle', 0.22), i * 90);
    });
  },

  skunk() {
    playNoise(0.4, 0.15, 420);
    playTone(380, 0.35, 'sawtooth', 0.18);
  },
};
