'use client';

import { useState } from 'react';
import { useGameStore, type OnboardingChoices } from '@/lib/gameStore';
import { getAudioManager } from '@/lib/audioManager';

const STEPS = [
  {
    title: 'Transportation',
    prompt: 'How do you usually commute?',
    field: 'transport' as const,
    options: [
      { id: 'walk_cycle', label: 'Walk / Cycle', emoji: '🚲', desc: 'Zero emissions' },
      { id: 'public_transit', label: 'Public Transit', emoji: '🚌', desc: 'Low emissions' },
      { id: 'car_ev', label: 'Electric Car', emoji: '⚡', desc: 'Moderate emissions' },
      { id: 'car_petrol', label: 'Petrol Car', emoji: '⛽', desc: 'High emissions' },
    ],
  },
  {
    title: 'Diet',
    prompt: 'What best describes your diet?',
    field: 'diet' as const,
    options: [
      { id: 'vegan', label: 'Plant-based', emoji: '🌱', desc: 'Lowest footprint' },
      { id: 'vegetarian', label: 'Vegetarian', emoji: '🥗', desc: 'Low footprint' },
      { id: 'mixed', label: 'Mixed diet', emoji: '🍽️', desc: 'Moderate footprint' },
      { id: 'meat_heavy', label: 'Meat-heavy', emoji: '🥩', desc: 'Highest footprint' },
    ],
  },
  {
    title: 'Energy Source',
    prompt: 'What powers your home?',
    field: 'energy' as const,
    options: [
      { id: 'solar', label: 'Solar / Renewable', emoji: '☀️', desc: 'Clean energy' },
      { id: 'mixed_grid', label: 'Mixed grid', emoji: '🔌', desc: 'Partially clean' },
      { id: 'fossil_grid', label: 'Fossil-fuel grid', emoji: '🏭', desc: 'Carbon heavy' },
    ],
  },
];

export default function OnboardingWizard() {
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const [stepIndex, setStepIndex] = useState(0);
  const [choices, setChoices] = useState<Partial<OnboardingChoices>>({});

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const selectedValue = choices[currentStep.field];

  const handleSelect = (optionId: string) => {
    getAudioManager().play('click');
    setChoices((prev) => ({ ...prev, [currentStep.field]: optionId }));
  };

  const handleNext = () => {
    if (!selectedValue) return;
    getAudioManager().play('click');
    if (isLastStep) {
      completeOnboarding(choices as OnboardingChoices);
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((prev) => prev - 1);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/assets/Home.webp), url(/assets/Home.png)',
          filter: 'brightness(0.25) saturate(0.6)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-fade-in">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6 px-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 transition-all duration-500"
              style={{
                background: i <= stepIndex ? '#4ade80' : '#2d4a35',
                boxShadow: i <= stepIndex ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
              }}
            />
          ))}
        </div>

        <div className="dialogue-box">
          {/* Step counter */}
          <div
            className="text-xs mb-4"
            style={{ fontFamily: "'Press Start 2P', monospace", color: '#6b8f72' }}
          >
            Step {stepIndex + 1} of {STEPS.length}
          </div>

          {/* Title */}
          <h2
            className="text-sm mb-2"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              color: '#4ade80',
              textShadow: '0 0 10px rgba(34, 197, 94, 0.3)',
            }}
          >
            {currentStep.title}
          </h2>

          {/* Prompt */}
          <p
            className="text-2xl mb-6"
            style={{ fontFamily: "'VT323', monospace", color: '#a3c4ab' }}
          >
            {currentStep.prompt}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-6">
            {currentStep.options.map((opt, i) => (
              <button
                key={opt.id}
                id={`onboarding-${currentStep.field}-${opt.id}`}
                onClick={() => handleSelect(opt.id)}
                className={`onboarding-option animate-fade-in choice-delay-${i} ${
                  selectedValue === opt.id ? 'selected' : ''
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div className="flex-1">
                  <div style={{ color: '#e8f5e9' }}>{opt.label}</div>
                  <div className="text-sm" style={{ color: '#6b8f72' }}>
                    {opt.desc}
                  </div>
                </div>
                {selectedValue === opt.id && (
                  <span className="text-lg" style={{ color: '#4ade80' }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            {stepIndex > 0 ? (
              <button
                onClick={handleBack}
                className="pixel-btn"
                style={{ fontSize: '0.55rem', padding: '8px 16px' }}
              >
                ◀ Back
              </button>
            ) : (
              <div />
            )}

            <button
              id={`onboarding-next-${stepIndex}`}
              onClick={handleNext}
              disabled={!selectedValue}
              className="pixel-btn"
              style={{
                fontSize: '0.55rem',
                padding: '8px 16px',
                opacity: selectedValue ? 1 : 0.4,
                cursor: selectedValue ? 'pointer' : 'not-allowed',
              }}
            >
              {isLastStep ? '▶ Begin Day 1' : 'Next ▶'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
