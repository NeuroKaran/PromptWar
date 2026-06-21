'use client';

import { useGameStore } from '@/lib/gameStore';
import { getAudioManager } from '@/lib/audioManager';
import { useEffect, useState } from 'react';

export default function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; speed: number; delay: number }>>([]);

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);

    // Staggered reveal
    const t1 = setTimeout(() => setShowTitle(true), 300);
    const t2 = setTimeout(() => setShowSubtitle(true), 1200);
    const t3 = setTimeout(() => setShowButton(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/assets/Map.webp), url(/assets/Map.png)',
          filter: 'brightness(0.35) saturate(0.8)',
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: i % 3 === 0 ? '#4ade80' : i % 3 === 1 ? '#fbbf24' : '#86efac',
            opacity: 0.4,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Logo / Title */}
        {showTitle && (
          <div className="animate-scale-in">
            <h1
              className="text-3xl md:text-5xl mb-2 tracking-wider"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: '#4ade80',
                textShadow: '0 0 30px rgba(34, 197, 94, 0.5), 0 4px 0 #0d2614',
              }}
            >
              EcoPixel
            </h1>
            <div
              className="text-xs md:text-sm mt-4 tracking-widest"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: '#86efac',
                textShadow: '0 0 10px rgba(134, 239, 172, 0.3)',
              }}
            >
              v2.0
            </div>
          </div>
        )}

        {/* Subtitle */}
        {showSubtitle && (
          <p
            className="animate-fade-in mt-8 text-2xl md:text-3xl max-w-lg mx-auto"
            style={{
              fontFamily: "'VT323', monospace",
              color: '#a3c4ab',
              lineHeight: '1.4',
            }}
          >
            Live a day. Make choices. Shape your world.
            <br />
            <span style={{ color: '#fbbf24', fontSize: '0.85em' }}>
              Every decision leaves a carbon footprint.
            </span>
          </p>
        )}

        {/* Start Button */}
        {showButton && (
          <div className="animate-fade-in-up mt-12">
            <button
              id="start-game-btn"
              onClick={() => { getAudioManager().play('click'); startGame(); }}
              className="pixel-btn animate-glow"
              style={{ fontSize: '0.75rem', padding: '16px 32px' }}
            >
              ▶ Start Game
            </button>

            <p
              className="mt-6 text-sm animate-pulse-slow"
              style={{ fontFamily: "'VT323', monospace", color: '#6b8f72' }}
            >
              Press START to begin your journey
            </p>
          </div>
        )}
      </div>

      {/* Version info */}
      <div
        className="absolute bottom-4 right-4 text-xs"
        style={{ fontFamily: "'Press Start 2P', monospace", color: '#2d4a35' }}
      >
        Narrative Day Simulator
      </div>
    </div>
  );
}
