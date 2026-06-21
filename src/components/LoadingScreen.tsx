'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { getAudioManager } from '@/lib/audioManager';
import { getBgMusic } from '@/lib/bgMusic';

// ─── Intro lore lines shown during loading ──────────────────────────
const LORE_LINES = [
  { text: 'The year is 2045...', icon: '🌍' },
  { text: 'Earth\'s climate hangs in the balance.', icon: '🌡️' },
  { text: 'Glaciers are retreating. Seas are rising.', icon: '🏔️' },
  { text: 'But hope isn\'t lost — not yet.', icon: '✨' },
  { text: 'Every choice you make leaves a carbon footprint.', icon: '👣' },
  { text: 'Your morning coffee. Your commute. Your dinner.', icon: '☕' },
  { text: 'Small decisions. Massive consequences.', icon: '⚡' },
  { text: 'The world around you will change with your actions.', icon: '🔄' },
  { text: 'Forests will grow — or wither.', icon: '🌲' },
  { text: 'Skies will clear — or darken.', icon: '🌤️' },
  { text: 'Animals will thrive — or disappear.', icon: '🦋' },
  { text: 'You are not alone. NPCs are watching.', icon: '🧑‍🤝‍🧑' },
  { text: 'Can you live one day without breaking the planet?', icon: '🌱' },
  { text: 'Let\'s find out...', icon: '🎮' },
  { text: 'Your world is loading...', icon: '👁️' },
];

const TOTAL_DURATION_MS = 15000; // 15 seconds total
const LINE_INTERVAL_MS = Math.floor(TOTAL_DURATION_MS / LORE_LINES.length);

// ─── Ambient intro sound (synthesized, ~15s) ────────────────────────

function playIntroAmbient(ctx: AudioContext, destination: AudioNode): void {
  const t = ctx.currentTime;
  const D = 15.5; // total sound duration

  // ── Layer 1: Deep resonant drone — low C ──────────────────────────
  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(65.41, t); // C2
  droneGain.gain.setValueAtTime(0, t);
  droneGain.gain.linearRampToValueAtTime(0.10, t + 2);
  droneGain.gain.setValueAtTime(0.10, t + 12);
  droneGain.gain.linearRampToValueAtTime(0, t + D);
  drone.connect(droneGain);
  droneGain.connect(destination);
  drone.start(t);
  drone.stop(t + D + 0.5);

  // ── Layer 2: Second drone a fifth up for depth ────────────────────
  const drone2 = ctx.createOscillator();
  const drone2Gain = ctx.createGain();
  drone2.type = 'sine';
  drone2.frequency.setValueAtTime(98, t); // G2
  drone2Gain.gain.setValueAtTime(0, t);
  drone2Gain.gain.linearRampToValueAtTime(0.05, t + 3);
  drone2Gain.gain.setValueAtTime(0.05, t + 11);
  drone2Gain.gain.linearRampToValueAtTime(0, t + D);
  drone2.connect(drone2Gain);
  drone2Gain.connect(destination);
  drone2.start(t);
  drone2.stop(t + D + 0.5);

  // ── Layer 3: Ethereal shimmer — high harmonic ─────────────────────
  const shimmerNotes = [
    { freq: 1047, start: 1, end: 6 },    // C6
    { freq: 1319, start: 4, end: 9 },    // E6
    { freq: 1568, start: 7, end: 12 },   // G6
    { freq: 1047, start: 10, end: 14.5 }, // C6 again
  ];
  shimmerNotes.forEach(({ freq, start, end }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t + start);
    filter.frequency.linearRampToValueAtTime(1800, t + start + (end - start) * 0.4);
    filter.frequency.linearRampToValueAtTime(600, t + end);
    gain.gain.setValueAtTime(0, t + start);
    gain.gain.linearRampToValueAtTime(0.03, t + start + 1);
    gain.gain.setValueAtTime(0.03, t + end - 1);
    gain.gain.linearRampToValueAtTime(0, t + end);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(t + start);
    osc.stop(t + end + 0.2);
  });

  // ── Layer 4: Evolving pad chords ──────────────────────────────────
  const padChords = [
    { notes: [130.81, 196, 261.63], start: 0, end: 5 },    // Cm
    { notes: [146.83, 220, 293.66], start: 4, end: 9 },    // Dm
    { notes: [174.61, 261.63, 349.23], start: 8, end: 13 }, // F
    { notes: [130.81, 196, 261.63], start: 11, end: 15 },   // Cm resolve
  ];
  padChords.forEach(({ notes, start, end }) => {
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + start);
      osc.detune.setValueAtTime((i - 1) * 6, t + start);
      const dur = end - start;
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(0.04, t + start + dur * 0.2);
      gain.gain.setValueAtTime(0.04, t + end - dur * 0.3);
      gain.gain.linearRampToValueAtTime(0, t + end);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(t + start);
      osc.stop(t + end + 0.2);
    });
  });

  // ── Layer 5: Heartbeat pulses (spread across timeline) ────────────
  const pulseOffsets = [0.8, 2.2, 3.8, 5.5, 7.2, 9.0, 10.5, 12.0, 13.2];
  pulseOffsets.forEach((offset) => {
    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(40, t + offset);
    pulseGain.gain.setValueAtTime(0, t + offset);
    pulseGain.gain.linearRampToValueAtTime(0.12, t + offset + 0.08);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.6);
    pulse.connect(pulseGain);
    pulseGain.connect(destination);
    pulse.start(t + offset);
    pulse.stop(t + offset + 0.8);
  });

  // ── Layer 6: Melodic pings (sparse, ethereal) ─────────────────────
  const pingNotes = [
    { freq: 523, time: 2.5 },   // C5
    { freq: 659, time: 5.0 },   // E5
    { freq: 784, time: 7.5 },   // G5
    { freq: 880, time: 9.5 },   // A5
    { freq: 1047, time: 11.5 }, // C6
    { freq: 784, time: 13.0 },  // G5
  ];
  pingNotes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, t + time);
    gain.gain.setValueAtTime(0, t + time);
    gain.gain.linearRampToValueAtTime(0.06, t + time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + time + 2.0);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(t + time);
    osc.stop(t + time + 2.2);
  });

  // ── Layer 7: Rising sweep at the end — builds anticipation ────────
  const sweep = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  const sweepFilter = ctx.createBiquadFilter();
  sweep.type = 'sawtooth';
  sweep.frequency.setValueAtTime(80, t + 11);
  sweep.frequency.exponentialRampToValueAtTime(900, t + 14.5);
  sweepFilter.type = 'lowpass';
  sweepFilter.frequency.setValueAtTime(300, t + 11);
  sweepFilter.frequency.exponentialRampToValueAtTime(3500, t + 14.5);
  sweepFilter.Q.setValueAtTime(4, t + 11);
  sweepGain.gain.setValueAtTime(0, t + 11);
  sweepGain.gain.linearRampToValueAtTime(0.05, t + 13);
  sweepGain.gain.linearRampToValueAtTime(0, t + 14.8);
  sweep.connect(sweepFilter);
  sweepFilter.connect(sweepGain);
  sweepGain.connect(destination);
  sweep.start(t + 11);
  sweep.stop(t + 15.2);
}

// ─── Component ──────────────────────────────────────────────────────

export default function LoadingScreen() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const [progress, setProgress] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const audioPlayed = useRef(false);
  const animFrame = useRef<number | null>(null);
  const startTime = useRef<number>(0);

  // Smooth progress bar using requestAnimationFrame
  const animateProgress = useCallback(() => {
    const elapsed = performance.now() - startTime.current;
    const pct = Math.min(elapsed / TOTAL_DURATION_MS, 1);
    // Ease-in-out curve for satisfying feel
    const eased = pct < 0.5
      ? 2 * pct * pct
      : 1 - Math.pow(-2 * pct + 2, 2) / 2;
    setProgress(eased);

    if (pct < 1) {
      animFrame.current = requestAnimationFrame(animateProgress);
    }
  }, []);

  useEffect(() => {
    // Start progress animation
    startTime.current = performance.now();
    animFrame.current = requestAnimationFrame(animateProgress);

    // Cycle lore lines
    const lineTimer = setInterval(() => {
      setLineIndex((prev) => {
        if (prev < LORE_LINES.length - 1) return prev + 1;
        return prev;
      });
    }, LINE_INTERVAL_MS);

    // Play ambient intro sound
    if (!audioPlayed.current) {
      audioPlayed.current = true;
      try {
        const audio = getAudioManager();
        if (!audio.isInitialized) {
          audio.init();
        }
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        playIntroAmbient(ctx, ctx.destination);

        // Start background music towards the end so it crossfades
        setTimeout(() => {
          const music = getBgMusic();
          if (!music.playing) music.start();
        }, 13000);
      } catch {
        // Audio is non-critical
      }
    }

    // Transition after loading completes
    const finishTimer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => {
        setGamePhase('onboarding');
      }, 600); // fade-out animation duration
    }, TOTAL_DURATION_MS);

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      clearInterval(lineTimer);
      clearTimeout(finishTimer);
    };
  }, [animateProgress, setGamePhase]);

  const currentLine = LORE_LINES[lineIndex];

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/assets/Home.webp), url(/assets/Home.png)',
          filter: 'brightness(0.15) saturate(0.5)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      {/* Subtle scan-line overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          opacity: 0.4,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-xl w-full">
        {/* Title */}
        <h1
          className="text-2xl md:text-4xl mb-12 animate-scale-in tracking-wider"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: '#4ade80',
            textShadow: '0 0 30px rgba(34, 197, 94, 0.5), 0 4px 0 #0d2614',
          }}
        >
          EcoPixel
        </h1>

        {/* Lore text area */}
        <div className="mb-12 h-24 flex flex-col items-center justify-center">
          <div
            key={lineIndex}
            className="animate-fade-in text-center"
          >
            <span
              className="text-3xl block mb-3"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))',
              }}
            >
              {currentLine.icon}
            </span>
            <p
              className="text-xl md:text-2xl"
              style={{
                fontFamily: "'VT323', monospace",
                color: '#c8e6c9',
                textShadow: '0 0 10px rgba(34, 197, 94, 0.2)',
                lineHeight: 1.5,
              }}
            >
              {currentLine.text}
            </p>
          </div>
        </div>

        {/* Progress bar container */}
        <div className="w-full max-w-sm">
          {/* Bar track */}
          <div
            className="w-full h-3 overflow-hidden"
            style={{
              background: 'rgba(13, 38, 20, 0.6)',
              border: '1px solid #2d4a35',
              borderRadius: '2px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {/* Bar fill */}
            <div
              className="h-full"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #166534, #22c55e, #4ade80)',
                boxShadow: '0 0 12px rgba(34, 197, 94, 0.5), 0 0 4px rgba(34, 197, 94, 0.8)',
                borderRadius: '1px',
                transition: 'width 0.05s linear',
              }}
            />
          </div>

          {/* Percentage */}
          <div
            className="mt-3 text-center"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.5rem',
              color: '#6b8f72',
              letterSpacing: '2px',
            }}
          >
            {Math.round(progress * 100)}%
          </div>
        </div>

        {/* Bottom hint */}
        <p
          className="mt-10 animate-pulse-slow"
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: '1rem',
            color: '#3d6b47',
          }}
        >
          Initializing world simulation...
        </p>
      </div>

      {/* Floating particles for atmosphere */}
      <LoadingParticles />
    </div>
  );
}

// ─── Floating particles ──────────────────────────────────────────────

function LoadingParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 4,
      color: i % 4 === 0 ? '#4ade80' : i % 4 === 1 ? '#fbbf24' : i % 4 === 2 ? '#86efac' : '#22d3ee',
    }))
  );

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            opacity: 0.25,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}
