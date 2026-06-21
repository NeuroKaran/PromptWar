'use client';

import { useGameStore } from '@/lib/gameStore';
import { formatCO2, getEmissionLevel } from '@/lib/carbonMath';
import { getWorldTierVisuals } from '@/lib/worldState';
import { getAudioManager } from '@/lib/audioManager';
import { getAssetLoader } from '@/lib/assetLoader';
import { useState, useEffect, useMemo } from 'react';

// Map scene backgrounds to asset IDs for WebP loading
const BG_ASSET_MAP: Record<string, string> = {
  '/assets/Home.png': 'home',
  '/assets/Map.png': 'map',
  '/assets/Cafe.png': 'cafe',
  '/assets/Office.png': 'office',
};

function resolveBackground(originalSrc: string): string {
  const assetId = BG_ASSET_MAP[originalSrc];
  if (!assetId) return originalSrc;
  const loader = getAssetLoader();
  if (loader.isLoaded(assetId)) {
    // Use WebP version
    return originalSrc.replace('.png', '.webp');
  }
  return originalSrc;
}

export default function SceneView() {
  const currentScene = useGameStore((s) => s.getCurrentScene());
  const currentStep = useGameStore((s) => s.getCurrentStep());
  const submitChoice = useGameStore((s) => s.submitChoice);
  const dayScore = useGameStore((s) => s.dayScore);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const worldState = useGameStore((s) => s.worldState);
  const isTransitioning = useGameStore((s) => s.isTransitioning);
  const getCurrentSceneId = useGameStore((s) => s.getCurrentSceneId);
  const username = useGameStore((s) => s.username);
  const gender = useGameStore((s) => s.gender);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [prevStepId, setPrevStepId] = useState<string | null>(null);

  if (currentStep && currentStep.id !== prevStepId) {
    setPrevStepId(currentStep.id);
    setSelectedChoice(null);
    setShowPrompt(false);
    setShowChoices(false);
  }

  const tierVisuals = getWorldTierVisuals(worldState);
  const sceneId = getCurrentSceneId();

  // Resolve background to WebP if available
  const bgSrc = useMemo(() => {
    if (!currentScene) return '';
    return resolveBackground(currentScene.background);
  }, [currentScene]);

  // Reset animations on step change
  useEffect(() => {
    const t1 = setTimeout(() => setShowPrompt(true), 200);
    const t2 = setTimeout(() => setShowChoices(true), 600);
    
    // Play scene transition sound
    const audio = getAudioManager();
    audio.play('scene_transition');

    // Prefetch next scene assets
    const loader = getAssetLoader();
    const nextScenes: Record<string, string> = {
      morning: 'commute',
      commute: 'lunch',
      lunch: 'afternoon_event',
      evening: 'explore',
    };
    const next = nextScenes[sceneId];
    if (next) loader.prefetchForScene(next);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentStep?.id, sceneId]);

  if (!currentScene || !currentStep) return null;

  const handleChoice = (choiceId: string) => {
    setSelectedChoice(choiceId);
    
    // Play audio feedback based on CO2 impact
    const audio = getAudioManager();
    const choice = currentStep.choices.find((c) => c.id === choiceId);
    if (choice) {
      const level = getEmissionLevel(choice.co2);
      audio.play(level === 'red' ? 'choice_bad' : 'choice_good');
    }

    setTimeout(() => {
      submitChoice(choiceId);
    }, 400);
  };

  const hasImageOptions = !!currentStep.optionAsset;

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden ${isTransitioning ? 'scene-transition' : ''}`}>
      {/* HUD Bar */}
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

      {/* Scene Background */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${bgSrc})`,
            filter: `brightness(${worldState === 'polluted' ? 0.4 : worldState === 'degraded' ? 0.5 : 0.55}) saturate(${worldState === 'polluted' ? 0.4 : 0.7})`,
          }}
        />
        
        {/* World state overlay */}
        <div className={`absolute inset-0 world-overlay-${worldState} transition-all duration-1000`} />
        
        {/* Dark gradient from bottom for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Scene title badge */}
        <div className="absolute top-4 left-4 z-10">
          <div
            className="animate-slide-left px-3 py-2"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '0.55rem',
              color: '#fbbf24',
              background: 'rgba(10, 26, 15, 0.85)',
              border: '2px solid #92400e',
            }}
          >
            {currentScene.title}
          </div>
        </div>

        {/* Prompt & Choices - Bottom area */}
        <div className={`absolute bottom-0 left-0 right-0 z-10 p-4 md:p-6 mx-auto w-full ${hasImageOptions ? 'max-w-4xl' : 'max-w-2xl'}`}>
          {/* Prompt */}
          {showPrompt && (
            <div className="dialogue-box mb-4 animate-fade-in flex gap-4 items-center">
              {gender && (
                <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 border-2 border-[#4ade80] bg-[#0a1a0f] overflow-hidden flex items-center justify-center p-1 rounded shadow-inner">
                  <img
                    src={gender === 'male' ? '/assets/Male_Character.png' : '/assets/FemaleCharacter.png'}
                    alt="Player portrait"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              )}
              <div className="flex-1">
                <p
                  className="text-xl md:text-2xl leading-relaxed"
                  style={{ fontFamily: "'VT323', monospace", color: '#e8f5e9' }}
                >
                  {currentStep.prompt}
                </p>
              </div>
            </div>
          )}

          {/* Choices — Image Cards or Text Buttons */}
          {showChoices && hasImageOptions && (
            <ImageChoices
              step={currentStep}
              selectedChoice={selectedChoice}
              onChoice={handleChoice}
            />
          )}

          {showChoices && !hasImageOptions && (
            <div className="flex flex-col gap-2">
              {currentStep.choices.map((choice, i) => {
                const level = getEmissionLevel(choice.co2);
                const isSelected = selectedChoice === choice.id;
                return (
                  <button
                    key={choice.id}
                    id={`choice-${choice.id}`}
                    onClick={() => handleChoice(choice.id)}
                    disabled={selectedChoice !== null}
                    className={`choice-btn emission-${level} animate-fade-in-up choice-delay-${i} ${
                      isSelected ? 'ring-2 ring-white/50' : ''
                    }`}
                    style={{
                      opacity: selectedChoice && !isSelected ? 0.4 : 1,
                      transform: isSelected ? 'scale(1.02)' : undefined,
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
  );
}

/* ─── Image-Based Choice Cards ──────────────────────────────────── */

interface ImageChoicesProps {
  step: {
    optionAsset?: { src: string; count: number };
    choices: { id: string; label: string; emoji: string; co2: number | null }[];
  };
  selectedChoice: string | null;
  onChoice: (id: string) => void;
}

function ImageChoices({ step, selectedChoice, onChoice }: ImageChoicesProps) {
  const { optionAsset, choices } = step;
  if (!optionAsset) return null;

  const count = optionAsset.count;

  return (
    <div
      className="image-choices-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: '8px',
      }}
    >
      {choices.map((choice, i) => {
        const level = getEmissionLevel(choice.co2);
        const isSelected = selectedChoice === choice.id;
        const isDisabled = selectedChoice !== null;
        const dimmed = isDisabled && !isSelected;

        return (
          <button
            key={choice.id}
            id={`choice-${choice.id}`}
            onClick={() => !isDisabled && onChoice(choice.id)}
            disabled={isDisabled}
            className={`image-choice-card animate-fade-in-up choice-delay-${i}`}
            style={{
              opacity: dimmed ? 0.3 : 1,
              transform: isSelected ? 'scale(1.04)' : undefined,
              cursor: isDisabled ? 'default' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '6px',
              border: isSelected
                ? '3px solid #4ade80'
                : '2px solid rgba(45, 74, 53, 0.6)',
              background: 'rgba(10, 26, 15, 0.7)',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column' as const,
              boxShadow: isSelected
                ? '0 0 20px rgba(74, 222, 128, 0.4), inset 0 0 15px rgba(74, 222, 128, 0.1)'
                : '0 4px 16px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Cropped image region from sprite sheet */}
            <div
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                backgroundImage: `url(${optionAsset.src})`,
                backgroundSize: `${count * 100}% 100%`,
                backgroundPosition: `${count <= 1 ? 0 : (i / (count - 1)) * 100}% 0%`,
                backgroundRepeat: 'no-repeat',
              }}
            />

            {/* Label bar at bottom */}
            <div
              style={{
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                background: 'rgba(8, 14, 10, 0.9)',
                borderTop: `2px solid ${
                  level === 'green' ? 'rgba(34, 197, 94, 0.4)'
                  : level === 'yellow' ? 'rgba(234, 179, 8, 0.4)'
                  : level === 'red' ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(107, 143, 114, 0.4)'
                }`,
              }}
            >
              <span
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: '1.1rem',
                  color: '#e8f5e9',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {choice.label}
              </span>
              <span className={`co2-badge co2-badge-${level}`} style={{ flexShrink: 0, fontSize: '0.45rem' }}>
                {formatCO2(choice.co2)}
              </span>
            </div>

            {/* Hover glow overlay */}
            <div
              className="image-choice-hover-glow"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                opacity: 0,
                background: 'linear-gradient(180deg, rgba(74, 222, 128, 0.05) 0%, rgba(74, 222, 128, 0.12) 100%)',
                transition: 'opacity 0.2s ease',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
