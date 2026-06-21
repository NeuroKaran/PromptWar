// World State Calculator
// Determines world tier and mutation flags based on score and streaks

export type WorldTier = 'pristine' | 'fair' | 'degraded' | 'polluted';

export type MutationFlag =
  | 'spawnTree'
  | 'clearWater'
  | 'reduceSmoke'
  | 'spawnSmogNPC'
  | 'increaseSmoke';

export interface WorldStateResult {
  tier: WorldTier;
  mutations: MutationFlag[];
  newCleanStreak: number;
  newDirtyStreak: number;
}

/**
 * Calculate world state tier from cumulative score.
 */
export function calculateWorldTier(cumulativeScore: number): WorldTier {
  if (cumulativeScore < 80) return 'pristine';
  if (cumulativeScore < 200) return 'fair';
  if (cumulativeScore < 400) return 'degraded';
  return 'polluted';
}

/**
 * Get visual properties for a world tier
 */
export function getWorldTierVisuals(tier: WorldTier) {
  const visuals: Record<WorldTier, {
    emoji: string;
    label: string;
    skyColor: string;
    overlayOpacity: number;
    treeHealth: number; // 0-1
    waterClarity: number; // 0-1
  }> = {
    pristine: {
      emoji: '🌿',
      label: 'Pristine',
      skyColor: '#87CEEB',
      overlayOpacity: 0,
      treeHealth: 1,
      waterClarity: 1,
    },
    fair: {
      emoji: '🌤️',
      label: 'Fair',
      skyColor: '#B0C4DE',
      overlayOpacity: 0.15,
      treeHealth: 0.7,
      waterClarity: 0.7,
    },
    degraded: {
      emoji: '🌫️',
      label: 'Degraded',
      skyColor: '#9E9E9E',
      overlayOpacity: 0.35,
      treeHealth: 0.4,
      waterClarity: 0.4,
    },
    polluted: {
      emoji: '😷',
      label: 'Polluted',
      skyColor: '#696969',
      overlayOpacity: 0.55,
      treeHealth: 0.1,
      waterClarity: 0.1,
    },
  };
  return visuals[tier];
}

const DAILY_THRESHOLD = 25; // kg CO2e

/**
 * Calculate world state, mutations, and updated streaks after a day.
 */
export function calculateWorldState(
  cumulativeScore: number,
  dayScore: number,
  cleanStreak: number,
  dirtyStreak: number
): WorldStateResult {
  const tier = calculateWorldTier(cumulativeScore);
  const mutations: MutationFlag[] = [];
  let newCleanStreak = cleanStreak;
  let newDirtyStreak = dirtyStreak;

  if (dayScore <= DAILY_THRESHOLD) {
    newCleanStreak += 1;
    newDirtyStreak = 0;
    if (newCleanStreak >= 3) {
      // Pick a healing mutation
      const healingMutations: MutationFlag[] = ['spawnTree', 'clearWater', 'reduceSmoke'];
      mutations.push(healingMutations[Math.floor(Math.random() * healingMutations.length)]);
      newCleanStreak = 0; // Reset after triggering
    }
  } else {
    newDirtyStreak += 1;
    newCleanStreak = 0;
    if (newDirtyStreak >= 3) {
      const degradeMutations: MutationFlag[] = ['spawnSmogNPC', 'increaseSmoke'];
      mutations.push(degradeMutations[Math.floor(Math.random() * degradeMutations.length)]);
      newDirtyStreak = 0; // Reset after triggering
    }
  }

  return {
    tier,
    mutations,
    newCleanStreak,
    newDirtyStreak,
  };
}

/**
 * Get mutation description for display
 */
export function getMutationDescription(mutation: MutationFlag): string {
  const descriptions: Record<MutationFlag, string> = {
    spawnTree: '🌳 A new tree has sprouted in your world!',
    clearWater: '💧 The water in the river is clearing up!',
    reduceSmoke: '💨 The smoke is fading away...',
    spawnSmogNPC: '😷 A smog warning has appeared in your world...',
    increaseSmoke: '🏭 More smoke is rising from the horizon...',
  };
  return descriptions[mutation];
}
