'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { getAudioManager } from '@/lib/audioManager';

export default function OnboardingWizard() {
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) {
      // Auto-focus the input after mount animation
      const timer = setTimeout(() => inputRef.current?.focus(), 600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const trimmedName = name.trim();
  const canNext = trimmedName.length >= 1;
  const canSubmit = trimmedName.length >= 1 && gender !== '' && !isSubmitting;

  const handleNext = () => {
    if (!canNext) return;
    getAudioManager().play('click');
    setStep(2);
  };

  const handleBack = () => {
    getAudioManager().play('click');
    setStep(1);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    getAudioManager().play('click');
    setIsSubmitting(true);
    completeOnboarding(trimmedName, gender as 'male' | 'female');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 1) {
        handleNext();
      } else {
        handleSubmit();
      }
    }
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
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        <div className="dialogue-box" style={{ textAlign: 'center' }}>
          {/* Icon */}
          <div
            className="text-4xl mb-4 animate-float"
            style={{ filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.4))' }}
          >
            🌍
          </div>

          {step === 1 ? (
            <>
              {/* Heading */}
              <h2
                className="text-sm mb-3"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#4ade80',
                  textShadow: '0 0 10px rgba(34, 197, 94, 0.3)',
                }}
              >
                Welcome, Traveler
              </h2>

              {/* Prompt */}
              <p
                className="text-2xl mb-8"
                style={{ fontFamily: "'VT323', monospace", color: '#a3c4ab' }}
              >
                What should we call you?
              </p>

              {/* Name Input */}
              <div className="mb-8">
                <input
                  ref={inputRef}
                  id="onboarding-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your name..."
                  maxLength={20}
                  autoComplete="off"
                  className="w-full px-4 py-3 text-center text-xl outline-none"
                  style={{
                    fontFamily: "'VT323', monospace",
                    color: '#e8f5e9',
                    background: 'rgba(13, 38, 20, 0.7)',
                    border: '2px solid #2d4a35',
                    borderRadius: '4px',
                    caretColor: '#4ade80',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                    boxShadow: name.trim()
                      ? '0 0 12px rgba(34, 197, 94, 0.15)'
                      : 'none',
                    borderColor: name.trim() ? '#4ade80' : '#2d4a35',
                  }}
                />
                <div
                  className="mt-2 text-sm"
                  style={{
                    fontFamily: "'VT323', monospace",
                    color: '#6b8f72',
                    opacity: name.trim() ? 0 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  1–20 characters
                </div>
              </div>

              {/* Next Button */}
              <button
                id="onboarding-next-btn"
                onClick={handleNext}
                disabled={!canNext}
                className="pixel-btn"
                style={{
                  fontSize: '0.55rem',
                  padding: '12px 28px',
                  opacity: canNext ? 1 : 0.4,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                }}
              >
                Next Step ▶
              </button>
            </>
          ) : (
            <>
              {/* Heading */}
              <h2
                className="text-sm mb-3"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: '#4ade80',
                  textShadow: '0 0 10px rgba(34, 197, 94, 0.3)',
                }}
              >
                Choose Your Avatar
              </h2>

              {/* Prompt */}
              <p
                className="text-2xl mb-6"
                style={{ fontFamily: "'VT323', monospace", color: '#a3c4ab' }}
              >
                Select your character
              </p>

              {/* Character Choice */}
              <div className="flex gap-6 justify-center mb-8">
                {/* Female */}
                <div
                  className={`onboarding-option flex-col items-center justify-center p-4 cursor-pointer border-2 rounded transition-all duration-300 ${gender === 'female' ? 'selected' : ''}`}
                  onClick={() => {
                    getAudioManager().play('click');
                    setGender('female');
                  }}
                  style={{
                    width: '140px',
                    background: gender === 'female' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(10, 26, 15, 0.7)',
                    borderColor: gender === 'female' ? '#4ade80' : '#2d4a35',
                    boxShadow: gender === 'female' ? '0 0 15px rgba(74, 222, 128, 0.4)' : 'none',
                    transform: gender === 'female' ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <img 
                    src="/assets/FemaleCharacter.png" 
                    alt="Female Character" 
                    className="w-20 h-28 object-contain mb-3 animate-pulse-slow" 
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-lg" style={{ fontFamily: "'VT323', monospace", color: '#e8f5e9' }}>Female</span>
                </div>

                {/* Male */}
                <div
                  className={`onboarding-option flex-col items-center justify-center p-4 cursor-pointer border-2 rounded transition-all duration-300 ${gender === 'male' ? 'selected' : ''}`}
                  onClick={() => {
                    getAudioManager().play('click');
                    setGender('male');
                  }}
                  style={{
                    width: '140px',
                    background: gender === 'male' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(10, 26, 15, 0.7)',
                    borderColor: gender === 'male' ? '#4ade80' : '#2d4a35',
                    boxShadow: gender === 'male' ? '0 0 15px rgba(74, 222, 128, 0.4)' : 'none',
                    transform: gender === 'male' ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <img 
                    src="/assets/Male_Character.png" 
                    alt="Male Character" 
                    className="w-20 h-28 object-contain mb-3 animate-pulse-slow" 
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-lg" style={{ fontFamily: "'VT323', monospace", color: '#e8f5e9' }}>Male</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  id="onboarding-back-btn"
                  onClick={handleBack}
                  className="pixel-btn pixel-btn-danger"
                  style={{
                    fontSize: '0.55rem',
                    padding: '12px 20px',
                  }}
                >
                  ◀ Back
                </button>

                <button
                  id="onboarding-start-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="pixel-btn"
                  style={{
                    fontSize: '0.55rem',
                    padding: '12px 20px',
                    opacity: canSubmit ? 1 : 0.4,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                  }}
                >
                  ▶ Begin Day 1
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
