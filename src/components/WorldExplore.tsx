'use client';

import { useGameStore } from '@/lib/gameStore';
import { getWorldTierVisuals } from '@/lib/worldState';
import { getTabVisibility } from '@/lib/tabVisibility';
import { getAudioManager } from '@/lib/audioManager';
import { useEffect, useRef, useState, useCallback } from 'react';

// Zone definitions for the world map
const ZONES = [
  { id: 'home', label: 'Home', x: 0.18, y: 0.22, w: 0.28, h: 0.3 },
  { id: 'office', label: 'Office', x: 0.55, y: 0.12, w: 0.32, h: 0.32 },
  { id: 'park', label: 'Park', x: 0.08, y: 0.58, w: 0.38, h: 0.35 },
  { id: 'cafe', label: 'Café', x: 0.55, y: 0.52, w: 0.32, h: 0.35 },
];

export default function WorldExplore() {
  const startNextDay = useGameStore((s) => s.startNextDay);
  const worldState = useGameStore((s) => s.worldState);
  const currentDayIndex = useGameStore((s) => s.currentDayIndex);
  const cumulativeScore = useGameStore((s) => s.cumulativeScore);
  const cleanStreak = useGameStore((s) => s.cleanStreak);
  const lastDayMutations = useGameStore((s) => s.lastDayMutations);

  const gender = useGameStore((s) => s.gender);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const posRef = useRef({ x: 0.3, y: 0.5 });
  const keysRef = useRef<Set<string>>(new Set());
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const isPausedRef = useRef(false);

  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [showUI, setShowUI] = useState(false);

  const tierVisuals = getWorldTierVisuals(worldState);

  useEffect(() => {
    const t = setTimeout(() => setShowUI(true), 500);
    // Play ambient sound
    const audio = getAudioManager();
    audio.play('ambient');
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!gender) return;
    const pImg = new Image();
    pImg.src = gender === 'male' ? '/assets/Male_Character.png' : '/assets/FemaleCharacter.png';
    pImg.onload = () => {
      playerImgRef.current = pImg;
    };
  }, [gender]);

  const draw = useCallback(() => {
    // Tab visibility check - skip rendering when tab is hidden
    if (isPausedRef.current) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    // Movement
    const speed = 0.004;
    const keys = keysRef.current;
    if (keys.has('arrowup') || keys.has('w')) posRef.current.y = Math.max(0.05, posRef.current.y - speed);
    if (keys.has('arrowdown') || keys.has('s')) posRef.current.y = Math.min(0.95, posRef.current.y + speed);
    if (keys.has('arrowleft') || keys.has('a')) posRef.current.x = Math.max(0.05, posRef.current.x - speed);
    if (keys.has('arrowright') || keys.has('d')) posRef.current.x = Math.min(0.95, posRef.current.x + speed);

    // Clear
    ctx.clearRect(0, 0, cw, ch);

    // Draw map
    ctx.drawImage(img, 0, 0, cw, ch);

    // World state overlay
    if (worldState !== 'pristine') {
      ctx.fillStyle = worldState === 'polluted'
        ? 'rgba(80, 80, 80, 0.45)'
        : worldState === 'degraded'
          ? 'rgba(120, 120, 80, 0.25)'
          : 'rgba(180, 200, 220, 0.12)';
      ctx.fillRect(0, 0, cw, ch);
    }

    // Draw zone labels
    let inZone: string | null = null;
    for (const zone of ZONES) {
      const zx = zone.x * cw;
      const zy = zone.y * ch;
      const zw = zone.w * cw;
      const zh = zone.h * ch;

      const px = posRef.current.x * cw;
      const py = posRef.current.y * ch;
      if (px >= zx && px <= zx + zw && py >= zy && py <= zy + zh) {
        inZone = zone.label;
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(zx, zy, zw, zh);
        ctx.setLineDash([]);
      }
    }
    setCurrentZone(inZone);

    // Draw trees based on world state
    if (worldState === 'pristine' || worldState === 'fair') {
      const treeSym = '🌳';
      ctx.font = `${Math.floor(cw * 0.03)}px serif`;
      const treePositions = [
        [0.05, 0.15], [0.92, 0.08], [0.03, 0.85], [0.93, 0.88],
        [0.48, 0.05], [0.48, 0.95],
      ];
      treePositions.forEach(([tx, ty]) => {
        ctx.globalAlpha = worldState === 'pristine' ? 0.9 : 0.5;
        ctx.fillText(treeSym, tx * cw, ty * ch);
      });
      ctx.globalAlpha = 1;
    }

    // Draw smoke particles for degraded/polluted
    if (worldState === 'degraded' || worldState === 'polluted') {
      const smokeCount = worldState === 'polluted' ? 8 : 4;
      ctx.globalAlpha = worldState === 'polluted' ? 0.4 : 0.2;
      ctx.fillStyle = '#888';
      for (let i = 0; i < smokeCount; i++) {
        const sx = ((frameRef.current * 0.3 + i * 200) % cw);
        const sy = Math.sin(frameRef.current * 0.01 + i) * 20 + ch * 0.2;
        const sr = 8 + Math.sin(frameRef.current * 0.02 + i * 3) * 4;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Draw player avatar
    const px = posRef.current.x * cw;
    const py = posRef.current.y * ch;
    frameRef.current += 1;

    // Walking animation - bob
    let bob = 0;
    if (keys.size > 0) {
      bob = Math.sin(frameRef.current * 0.25) * 3;
    }

    if (playerImgRef.current && playerImgRef.current.complete) {
      const img = playerImgRef.current;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const avatarHeight = Math.floor(cw * 0.055);
      const avatarWidth = avatarHeight * aspectRatio;
      
      // Shadow centered at feet (feet are at py + 8)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(px, py + 8, avatarWidth * 0.45, avatarWidth * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.drawImage(
        img,
        px - avatarWidth / 2,
        py - avatarHeight + 8 + bob,
        avatarWidth,
        avatarHeight
      );
    } else {
      const avatarSize = Math.floor(cw * 0.025);
      // Fallback: Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(px, py + avatarSize + 2, avatarSize * 0.8, avatarSize * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fallback: Body
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(px - avatarSize / 2, py - avatarSize / 2 + bob, avatarSize, avatarSize);

      // Fallback: Head
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(px - avatarSize * 0.4, py - avatarSize * 1.1 + bob, avatarSize * 0.8, avatarSize * 0.7);
    }

    // Draw minimap
    const mmSize = Math.floor(cw * 0.15);
    const mmX = cw - mmSize - 8;
    const mmY = 8;
    ctx.fillStyle = 'rgba(10, 26, 15, 0.8)';
    ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);
    ctx.drawImage(img, mmX, mmY, mmSize, mmSize);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(
      mmX + posRef.current.x * mmSize - 2,
      mmY + posRef.current.y * mmSize - 2,
      4, 4
    );
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmSize, mmSize);

    animRef.current = requestAnimationFrame(draw);
  }, [worldState]);

  useEffect(() => {
    // Load map image - prefer WebP
    const img = new Image();
    img.src = '/assets/Map.webp';
    img.onerror = () => {
      img.src = '/assets/Map.png';
    };
    img.onload = () => {
      imgRef.current = img;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    // Tab visibility: pause/resume rendering
    const tabVis = getTabVisibility();
    const unsubVis = tabVis.subscribe((isVisible) => {
      isPausedRef.current = !isVisible;
    });

    const handleKey = (e: KeyboardEvent) => {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.type === 'keydown') {
        keysRef.current.add(e.key.toLowerCase());
      } else {
        keysRef.current.delete(e.key.toLowerCase());
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
      window.removeEventListener('resize', handleResize);
      unsubVis();
    };
  }, [draw]);

  const handleStartNextDay = () => {
    const audio = getAudioManager();
    audio.play('click');
    startNextDay();
  };

  return (
    <div className="relative w-full h-full flex flex-col" ref={containerRef}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
        tabIndex={0}
      />

      {/* HUD Overlay */}
      {showUI && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 hud-bar flex items-center justify-between px-4 py-3 z-10">
            <div className="flex items-center gap-4">
              <span style={{ color: '#4ade80' }}>DAY {currentDayIndex + 1}</span>
              <span style={{ color: '#fbbf24' }}>|</span>
              <span style={{ color: '#a3c4ab' }}>{cumulativeScore} kg CO₂ total</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{tierVisuals.emoji}</span>
              <span style={{ color: '#a3c4ab' }}>{tierVisuals.label}</span>
              {cleanStreak > 0 && (
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.45rem', color: '#4ade80' }}>
                  🔥{cleanStreak}
                </span>
              )}
            </div>
          </div>

          {/* Zone label */}
          {currentZone && (
            <div
              className="absolute top-14 left-1/2 -translate-x-1/2 z-10 animate-fade-in px-4 py-2"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.6rem',
                color: '#fbbf24',
                background: 'rgba(10, 26, 15, 0.9)',
                border: '2px solid #92400e',
              }}
            >
              📍 {currentZone}
            </div>
          )}

          {/* Controls hint */}
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-2 animate-fade-in"
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: '1.1rem',
              color: '#6b8f72',
              background: 'rgba(10, 26, 15, 0.7)',
            }}
          >
            Use WASD or Arrow Keys to explore
          </div>

          {/* Next Day Button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in-up">
            <button
              id="start-next-day-btn"
              onClick={handleStartNextDay}
              className="pixel-btn animate-glow"
              style={{ fontSize: '0.6rem', padding: '12px 24px' }}
            >
              Start Day {currentDayIndex + 2} ▶
            </button>
          </div>

          {/* Mutation notifications */}
          {lastDayMutations.length > 0 && (
            <div className="absolute top-14 right-4 z-10 flex flex-col gap-2">
              {lastDayMutations.map((m, i) => (
                <div
                  key={i}
                  className="animate-slide-right px-3 py-2"
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '1rem',
                    color: '#86efac',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #2d4a35',
                    animationDelay: `${i * 0.3}s`,
                  }}
                >
                  {m === 'spawnTree' && '🌳 New tree!'}
                  {m === 'clearWater' && '💧 Water cleared!'}
                  {m === 'reduceSmoke' && '💨 Smoke fading!'}
                  {m === 'spawnSmogNPC' && '😷 Smog warning!'}
                  {m === 'increaseSmoke' && '🏭 More smoke!'}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
