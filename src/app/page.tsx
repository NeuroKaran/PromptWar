'use client';

import { useGameStore } from '@/lib/gameStore';
import { getAssetLoader } from '@/lib/assetLoader';
import { getAudioManager } from '@/lib/audioManager';
import { getTabVisibility } from '@/lib/tabVisibility';
import { getBgMusic } from '@/lib/bgMusic';
import TitleScreen from '@/components/TitleScreen';
import LoadingScreen from '@/components/LoadingScreen';
import OnboardingWizard from '@/components/OnboardingWizard';
import SceneView from '@/components/SceneView';
import AfternoonEventView from '@/components/AfternoonEventView';
import DaySummary from '@/components/DaySummary';
import WorldExplore from '@/components/WorldExplore';
import WeeklyReport from '@/components/WeeklyReport';
import { useEffect, useState, useCallback } from 'react';

export default function Home() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const resetGame = useGameStore((s) => s.resetGame);
  const [mounted, setMounted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  // Initialize systems on mount
  useEffect(() => {
    setMounted(true);

    // Register service worker for PWA offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration is non-critical
      });
    }

    // Initialize tab visibility manager
    getTabVisibility();

    // Progressive asset loading: load startup assets first
    const loader = getAssetLoader();
    const unsubProgress = loader.onProgress((p) => setLoadProgress(p));
    
    loader.loadByPriority('startup').then(() => {
      setAssetsReady(true);
      // Background-load remaining assets
      loader.loadByPriority('gameplay');
      loader.loadByPriority('background');
    }).catch(() => {
      // Even if loading fails, show the game (PNG fallbacks work)
      setAssetsReady(true);
    });

    return () => {
      unsubProgress();
    };
  }, []);

  // Initialize audio + background music on first user interaction
  const handleFirstInteraction = useCallback(() => {
    const audio = getAudioManager();
    if (!audio.isInitialized) {
      audio.init();
    }
    const music = getBgMusic();
    if (!music.playing) {
      music.start();
    }
  }, []);

  const handleToggleMusic = useCallback(() => {
    const music = getBgMusic();
    const muted = music.toggleMute();
    setIsMusicMuted(muted);
  }, []);

  // Prefetch assets for upcoming scene
  useEffect(() => {
    if (!mounted) return;
    const loader = getAssetLoader();
    const sceneMap: Record<string, string> = {
      title: 'morning',
      loading: 'morning',
      onboarding: 'morning',
      scene: 'commute', // prefetch next scene
    };
    const nextScene = sceneMap[gamePhase];
    if (nextScene) {
      loader.prefetchForScene(nextScene);
    }
  }, [gamePhase, mounted]);

  if (!mounted) {
    return (
      <main className="h-full w-full flex items-center justify-center" style={{ background: '#080e0a' }}>
        <div
          className="animate-pulse-slow"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.8rem',
            color: '#4ade80',
            textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
          }}
        >
          Loading EcoPixel...
        </div>
      </main>
    );
  }

  // Loading screen while startup assets load
  if (!assetsReady) {
    return (
      <main className="h-full w-full flex flex-col items-center justify-center gap-6" style={{ background: '#080e0a' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '1.2rem',
            color: '#4ade80',
            textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
          }}
        >
          EcoPixel
        </div>
        
        {/* Progress bar */}
        <div className="w-64 h-2 bg-[#1a2e1f] overflow-hidden" style={{ border: '1px solid #2d4a35' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${loadProgress * 100}%`,
              background: 'linear-gradient(90deg, #22c55e, #4ade80)',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
            }}
          />
        </div>

        <div
          className="animate-pulse-slow"
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: '1.2rem',
            color: '#6b8f72',
          }}
        >
          Loading world assets...
        </div>
      </main>
    );
  }

  return (
    <main 
      className="h-full w-full relative"
      onClick={handleFirstInteraction}
      onKeyDown={handleFirstInteraction}
    >
      {/* Phase renderer */}
      <div className="h-full w-full">
        {gamePhase === 'title' && <TitleScreen />}
        {gamePhase === 'loading' && <LoadingScreen />}
        {gamePhase === 'onboarding' && <OnboardingWizard />}
        {gamePhase === 'scene' && <SceneView />}
        {gamePhase === 'afternoon_event' && <AfternoonEventView />}
        {gamePhase === 'summary' && <DaySummary />}
        {gamePhase === 'explore' && <WorldExplore />}
        {gamePhase === 'weekly_report' && <WeeklyReport />}
      </div>

      {/* Music toggle */}
      <button
        id="toggle-music-btn"
        onClick={handleToggleMusic}
        className="fixed bottom-3 left-3 z-50 px-2 py-2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '0.55rem',
          color: isMusicMuted ? '#6b8f72' : '#4ade80',
          background: 'rgba(10, 10, 10, 0.75)',
          border: `1px solid ${isMusicMuted ? '#2d4a35' : '#22c55e44'}`,
          borderRadius: '4px',
          textShadow: isMusicMuted ? 'none' : '0 0 8px rgba(34,197,94,0.4)',
          lineHeight: 1,
        }}
        title={isMusicMuted ? 'Unmute Music' : 'Mute Music'}
      >
        {isMusicMuted ? '🔇' : '🔊'}
      </button>

      {/* Reset button (dev/debug) */}
      {gamePhase !== 'title' && (
        <button
          id="reset-game-btn"
          onClick={resetGame}
          className="fixed top-2 right-2 z-50 px-2 py-1 text-xs cursor-pointer opacity-30 hover:opacity-100 transition-opacity"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '0.4rem',
            color: '#ef4444',
            background: 'rgba(10, 10, 10, 0.8)',
            border: '1px solid #7f1d1d',
          }}
          title="Reset Game"
        >
          ✕ RESET
        </button>
      )}
    </main>
  );
}
