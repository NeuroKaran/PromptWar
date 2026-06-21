'use client';

import { useGameStore } from '@/lib/gameStore';
import { formatCO2, getEmissionLevel } from '@/lib/carbonMath';
import { getWorldTierVisuals } from '@/lib/worldState';
import { getAudioManager } from '@/lib/audioManager';
import { useState, useEffect } from 'react';

export default function AfternoonEventView() {
  const event = useGameStore((s) => s.currentAfternoonEvent);
  const submitAfternoonChoice = useGameStore((s) => s.submitAfternoonChoice);
  const dayScore = useGameStore((s) => s.dayScore);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const username = useGameStore((s) => s.username);
  const gender = useGameStore((s) => s.gender);
  const worldState = useGameStore((s) => s.worldState);

  const [showCard, setShowCard] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [prevEventId, setPrevEventId] = useState<string | null>(null);

  if (event && event.id !== prevEventId) {
    setPrevEventId(event.id);
    setShowCard(false);
    setShowChoices(false);
    setSelectedChoice(null);
  }

  const tierVisuals = getWorldTierVisuals(worldState);

  useEffect(() => {
    // Play scene transition sound for random event
    getAudioManager().play('scene_transition');
    const t1 = setTimeout(() => setShowCard(true), 300);
    const t2 = setTimeout(() => setShowChoices(true), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [event?.id]);

  if (!event) return null;

  // Resolve background to WebP with PNG fallback
  const bgSrc = event.background.replace('.png', '.webp');

  const handleChoice = (choiceId: string) => {
    setSelectedChoice(choiceId);
    // Audio feedback
    const choice = event.choices.find((c) => c.id === choiceId);
    if (choice) {
      const level = getEmissionLevel(choice.co2);
      getAudioManager().play(level === 'red' ? 'choice_bad' : 'choice_good');
    }
    setTimeout(() => {
      submitAfternoonChoice(choiceId);
    }, 300);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* HUD */}
      <div className="hud-bar flex items-center justify-between px-4 py-3 z-20">
        <div className="flex items-center gap-4">
          <span style={{ color: '#4ade80' }}>DAY {currentDayIndex + 1}</span>
          <span style={{ color: '#fbbf24' }}>|</span>
          <span style={{ color: dayScore > 15 ? '#ef4444' : dayScore > 8 ? '#eab308' : '#4ade80' }}>
            {dayScore > 0 ? '+' : ''}{Math.round(dayScore * 10) / 10} kg CO₂
          </span>
        </div>
        <div className="flex items-center gap-2">
          {gender && (
            <img 
              src={gender === 'male' ? '/assets/Male_Character.png' : '/assets/FemaleCharacter.png'} 
              alt="Avatar" 
              className="w-5 h-5 object-contain rounded-full border border-[#4ade80] bg-[#0a1a0f]"
            />
          )}
          <span style={{ color: '#e8f5e9' }} className="mr-1">{username}</span>
          <span style={{ color: '#fbbf24' }}>|</span>
          <span>{tierVisuals.emoji}</span>
          <span style={{ color: '#a3c4ab' }}>{tierVisuals.label}</span>
        </div>
      </div>

      {/* Background - WebP with PNG fallback */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${bgSrc}), url(${event.background})`,
            filter: 'brightness(0.4) saturate(0.6)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        {/* Event Card */}
        <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
          <div className="w-full max-w-md">
            {/* Random Event Badge */}
            {showCard && (
              <div className="text-center mb-4 animate-scale-in">
                <span
                  className="inline-block px-4 py-2"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '0.55rem',
                    color: '#fbbf24',
                    background: 'rgba(146, 64, 14, 0.6)',
                    border: '2px solid #fbbf24',
                    boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)',
                  }}
                >
                  ⚡ RANDOM EVENT
                </span>
              </div>
            )}

            {/* Card */}
            {showCard && (
              <div className="dialogue-box animate-fade-in mb-4 flex gap-4 items-center" style={{ borderColor: '#fbbf24' }}>
                {gender && (
                  <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 border-2 border-[#fbbf24] bg-[#0a1a0f] overflow-hidden flex items-center justify-center p-1 rounded shadow-inner">
                    <img
                      src={gender === 'male' ? '/assets/Male_Character.png' : '/assets/FemaleCharacter.png'}
                      alt="Player portrait"
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3
                    className="text-sm mb-3"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      color: '#fbbf24',
                      textShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
                    }}
                  >
                    {event.title}
                  </h3>
                  <p
                    className="text-2xl"
                    style={{ fontFamily: "'VT323', monospace", color: '#e8f5e9' }}
                  >
                    {event.prompt}
                  </p>
                </div>
              </div>
            )}

            {/* Choices */}
            {showChoices && (
              <div className="flex flex-col gap-2">
                {event.choices.map((choice, i) => {
                  const level = getEmissionLevel(choice.co2);
                  const isSelected = selectedChoice === choice.id;
                  return (
                    <button
                      key={choice.id}
                      id={`event-choice-${choice.id}`}
                      onClick={() => handleChoice(choice.id)}
                      disabled={selectedChoice !== null}
                      className={`choice-btn emission-${level} animate-fade-in-up choice-delay-${i} ${
                        isSelected ? 'ring-2 ring-amber-400/50' : ''
                      }`}
                      style={{
                        opacity: selectedChoice && !isSelected ? 0.4 : 1,
                        borderColor: '#92400e',
                      }}
                    >
                      <span className="text-2xl">{choice.emoji}</span>
                      <span className="flex-1">{choice.label}</span>
                      <span className={`co2-badge co2-badge-${level}`}>
                        {formatCO2(choice.co2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
