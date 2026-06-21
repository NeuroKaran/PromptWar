'use client';

import { useGameStore } from '@/lib/gameStore';
import { getWorldTierVisuals, getMutationDescription } from '@/lib/worldState';
import { GLOBAL_DAILY_TARGET, DAILY_CLEAN_THRESHOLD } from '@/lib/carbonMath';
import { getAudioManager } from '@/lib/audioManager';
import { useState, useEffect } from 'react';

export default function DaySummary() {
  const dayScore = useGameStore((s) => s.dayScore);
  const cumulativeScore = useGameStore((s) => s.cumulativeScore);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const worldState = useGameStore((s) => s.worldState);
  const worldStateBefore = useGameStore((s) => s.worldStateBefore);
  const lastDayMutations = useGameStore((s) => s.lastDayMutations);
  const lastNpcDialogue = useGameStore((s) => s.lastNpcDialogue);
  const goToExplore = useGameStore((s) => s.goToExplore);

  const [showStats, setShowStats] = useState(false);
  const [showMutations, setShowMutations] = useState(false);
  const [showNpc, setShowNpc] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const tierVisuals = getWorldTierVisuals(worldState);
  const beforeVisuals = getWorldTierVisuals(worldStateBefore);
  const isCleanDay = dayScore <= DAILY_CLEAN_THRESHOLD;
  const worldChanged = worldState !== worldStateBefore;

  useEffect(() => {
    // Play day complete sound
    getAudioManager().play('day_complete');
    const t1 = setTimeout(() => setShowStats(true), 400);
    const t2 = setTimeout(() => setShowMutations(true), 1000);
    const t3 = setTimeout(() => setShowNpc(true), 1600);
    const t4 = setTimeout(() => setShowButton(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/assets/Map.webp), url(/assets/Map.png)',
          filter: 'brightness(0.2) saturate(0.5)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-6 animate-scale-in">
          <div
            className="text-xs mb-2"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              color: '#fbbf24',
              textShadow: '0 0 15px rgba(251, 191, 36, 0.4)',
            }}
          >
            ✦ DAY {currentDayIndex + 1} COMPLETE ✦
          </div>
        </div>

        <div className="dialogue-box">
          {/* Stats */}
          {showStats && (
            <div className="animate-fade-in mb-6">
              <div className="flex justify-between items-center mb-3 pb-3" style={{ borderBottom: '1px solid #2d4a35' }}>
                <span style={{ fontFamily: "'VT323', monospace", fontSize: '1.3rem', color: '#a3c4ab' }}>
                  Today&apos;s score
                </span>
                <span
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '0.7rem',
                    color: isCleanDay ? '#4ade80' : '#ef4444',
                  }}
                >
                  +{dayScore} kg CO₂e
                </span>
              </div>

              <div className="flex justify-between items-center mb-3 pb-3" style={{ borderBottom: '1px solid #2d4a35' }}>
                <span style={{ fontFamily: "'VT323', monospace", fontSize: '1.3rem', color: '#a3c4ab' }}>
                  Cumulative
                </span>
                <span
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '0.7rem',
                    color: '#fbbf24',
                  }}
                >
                  {cumulativeScore} kg CO₂e
                </span>
              </div>

              <div className="flex justify-between items-center mb-3 pb-3" style={{ borderBottom: '1px solid #2d4a35' }}>
                <span style={{ fontFamily: "'VT323', monospace", fontSize: '1.3rem', color: '#a3c4ab' }}>
                  vs. Target ({GLOBAL_DAILY_TARGET} kg/day)
                </span>
                <span
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '0.7rem',
                    color: dayScore <= GLOBAL_DAILY_TARGET ? '#4ade80' : '#ef4444',
                  }}
                >
                  {dayScore <= GLOBAL_DAILY_TARGET ? '✓ UNDER' : '✗ OVER'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span style={{ fontFamily: "'VT323', monospace", fontSize: '1.3rem', color: '#a3c4ab' }}>
                  World state
                </span>
                <div className="flex items-center gap-2">
                  {worldChanged && (
                    <>
                      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem', color: '#6b8f72' }}>
                        {beforeVisuals.emoji} {beforeVisuals.label}
                      </span>
                      <span style={{ color: '#fbbf24' }}>→</span>
                    </>
                  )}
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem', color: '#e8f5e9' }}>
                    {tierVisuals.emoji} {tierVisuals.label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mutations */}
          {showMutations && lastDayMutations.length > 0 && (
            <div className="animate-fade-in-up mb-4 p-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #2d4a35' }}>
              {lastDayMutations.map((mutation, i) => (
                <p
                  key={i}
                  style={{ fontFamily: "'VT323', monospace", fontSize: '1.3rem', color: '#86efac' }}
                >
                  {getMutationDescription(mutation)}
                </p>
              ))}
            </div>
          )}

          {/* NPC Dialogue */}
          {showNpc && lastNpcDialogue && (
            <div className="animate-fade-in-up mb-6 p-4" style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid #92400e' }}>
              <div
                className="text-xs mb-2"
                style={{ fontFamily: "'Press Start 2P', monospace", color: '#fbbf24' }}
              >
                🌿 {lastNpcDialogue.speaker}
              </div>
              <p
                style={{ fontFamily: "'VT323', monospace", fontSize: '1.4rem', color: '#fef3c7' }}
              >
                &ldquo;{lastNpcDialogue.line}&rdquo;
              </p>
            </div>
          )}

          {/* Enter World Button */}
          {showButton && (
            <div className="text-center animate-fade-in-up">
              <button
                id="enter-world-btn"
                onClick={() => { getAudioManager().play('click'); goToExplore(); }}
                className="pixel-btn pixel-btn-gold animate-glow"
                style={{ fontSize: '0.65rem', padding: '14px 28px' }}
              >
                Enter Your World ▶
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
