// NPC Reactive Dialogue Engine
// Inspects recent behavior patterns to select contextual NPC dialogue

import npcDialogueData from '@/data/npcDialogue.json';
import type { WorldTier } from './worldState';

interface SceneLogEntry {
  sceneId: string;
  choiceId: string;
  co2Delta: number;
  dayIndex: number;
}

/**
 * Get contextual NPC dialogue based on player's recent behavior.
 * Implements the rules engine from PRD §3.6.
 */
export function getNPCDialogue(
  scenesLog: SceneLogEntry[],
  worldState: WorldTier,
  cleanStreak: number,
  dirtyStreak: number,
  dayScore: number,
  dailyThreshold: number = 25
): { speaker: string; line: string } {
  const data = npcDialogueData as Record<string, unknown>;

  // Rule 1: dirtyStreak >= 5 AND last 5 choices include light_fossil
  if (dirtyStreak >= 5) {
    const recentFossil = scenesLog
      .slice(-15) // Check last 15 entries (roughly 5 days × 3 scenes)
      .filter((e) => e.choiceId === 'light_fossil');
    if (recentFossil.length >= 5) {
      const d = data['npc_smog_warning_light'] as { speaker: string; lines: string[] };
      return {
        speaker: d.speaker,
        line: d.lines[Math.floor(Math.random() * d.lines.length)],
      };
    }
  }

  // Rule 2: cleanStreak >= 5
  if (cleanStreak >= 5) {
    const d = data['npc_celebrate_streak'] as { speaker: string; lines: string[] };
    return {
      speaker: d.speaker,
      line: d.lines[Math.floor(Math.random() * d.lines.length)],
    };
  }

  // Rule 3: worldState is polluted
  if (worldState === 'polluted') {
    const d = data['npc_urgent_polluted'] as { speaker: string; lines: string[] };
    return {
      speaker: d.speaker,
      line: d.lines[Math.floor(Math.random() * d.lines.length)],
    };
  }

  // Rule 4: Clean day in pristine world
  if (dayScore < dailyThreshold && worldState === 'pristine') {
    const d = data['npc_encourage_pristine'] as { speaker: string; lines: string[] };
    return {
      speaker: d.speaker,
      line: d.lines[Math.floor(Math.random() * d.lines.length)],
    };
  }

  // Default: rotate through tips based on world state
  const tips = (data['npc_tips'] as Record<string, string[]>)[worldState];
  return {
    speaker: 'Eco Guide',
    line: tips[Math.floor(Math.random() * tips.length)],
  };
}
