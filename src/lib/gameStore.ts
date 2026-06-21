'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import scenesData from '@/data/scenes.json';
import afternoonEventsData from '@/data/afternoonEvents.json';
import { resolveCO2, type Locale } from '@/lib/carbonMath';
import { calculateWorldState, calculateWorldTier, type WorldTier, type MutationFlag } from '@/lib/worldState';
import { getNPCDialogue } from '@/lib/npcEngine';
import { generateWeeklyReport, type WeeklyReportData } from '@/lib/weeklyReport';

// ─── Types ───────────────────────────────────────────────────────────

export type GamePhase =
  | 'title'
  | 'onboarding'
  | 'scene'
  | 'afternoon_event'
  | 'summary'
  | 'explore'
  | 'weekly_report';

export interface SceneChoice {
  id: string;
  label: string;
  emoji: string;
  co2: number | null;
  next: string;
}

export interface SceneStep {
  id: string;
  prompt: string;
  choices: SceneChoice[];
}

export interface SceneConfig {
  environment: string;
  background: string;
  title: string;
  steps: SceneStep[];
}

export interface AfternoonEvent {
  id: string;
  title: string;
  prompt: string;
  background: string;
  choices: { id: string; label: string; emoji: string; co2: number }[];
}

export interface SceneLogEntry {
  sceneId: string;
  choiceId: string;
  co2Delta: number;
  dayIndex: number;
}

export interface DailySummaryEntry {
  dayIndex: number;
  dayScore: number;
  worldStateBefore: string;
  worldStateAfter: string;
  mutationsApplied: MutationFlag[];
}



// ─── Scene Order ─────────────────────────────────────────────────────

const SCENE_ORDER = ['morning', 'commute', 'lunch', 'afternoon_event', 'evening'] as const;

type SceneId = (typeof SCENE_ORDER)[number];

// ─── Store State ─────────────────────────────────────────────────────

interface GameState {
  // Game phase
  gamePhase: GamePhase;
  
  // Player profile
  username: string;
  locale: Locale;

  
  // Scene state machine
  currentSceneIndex: number; // Index in SCENE_ORDER
  currentStepId: string | null; // Current step within a scene
  currentAfternoonEvent: AfternoonEvent | null;
  
  // Score tracking
  dayScore: number;
  cumulativeScore: number;
  currentDayIndex: number;
  
  // World state
  worldState: WorldTier;
  cleanStreak: number;
  dirtyStreak: number;
  
  // Logs
  scenesLog: SceneLogEntry[];
  dailySummaries: DailySummaryEntry[];
  
  // Day summary data
  lastDayMutations: MutationFlag[];
  lastNpcDialogue: { speaker: string; line: string } | null;
  worldStateBefore: WorldTier;
  
  // Weekly report
  lastWeeklyReport: WeeklyReportData | null;
  
  // Transition animation
  isTransitioning: boolean;

  // ─── Actions ─────────────────────────────────────────────────────
  startGame: () => void;
  completeOnboarding: (playerName: string) => void;
  submitChoice: (choiceId: string) => void;
  submitAfternoonChoice: (choiceId: string) => void;
  goToExplore: () => void;
  startNextDay: () => void;
  dismissWeeklyReport: () => void;
  resetGame: () => void;
  setTransitioning: (v: boolean) => void;
  
  // ─── Computed getters ────────────────────────────────────────────
  getCurrentScene: () => SceneConfig | null;
  getCurrentStep: () => SceneStep | null;
  getCurrentSceneId: () => string;
}

// ─── Store ───────────────────────────────────────────────────────────

const scenes = scenesData as Record<string, SceneConfig>;
const afternoonEvents = afternoonEventsData as AfternoonEvent[];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ─── Initial State ──────────────────────────────────────────
      gamePhase: 'title',
      username: '',
      locale: 'IN',

      currentSceneIndex: 0,
      currentStepId: null,
      currentAfternoonEvent: null,
      dayScore: 0,
      cumulativeScore: 0,
      currentDayIndex: 0,
      worldState: 'pristine',
      cleanStreak: 0,
      dirtyStreak: 0,
      scenesLog: [],
      dailySummaries: [],
      lastDayMutations: [],
      lastNpcDialogue: null,
      worldStateBefore: 'pristine',
      lastWeeklyReport: null,
      isTransitioning: false,

      // ─── Actions ────────────────────────────────────────────────

      startGame: () => {
        set({ gamePhase: 'onboarding' });
      },

      completeOnboarding: (playerName: string) => {
        const firstScene = SCENE_ORDER[0];
        const sceneConfig = scenes[firstScene];
        const firstStepId = sceneConfig?.steps[0]?.id ?? null;
        
        set({
          gamePhase: 'scene',
          username: playerName,
          currentSceneIndex: 0,
          currentStepId: firstStepId,
          dayScore: 0,
          worldStateBefore: get().worldState,
        });
      },

      submitChoice: (choiceId: string) => {
        const state = get();
        const sceneId = SCENE_ORDER[state.currentSceneIndex];
        const sceneConfig = scenes[sceneId];
        if (!sceneConfig || !state.currentStepId) return;

        // Find current step
        const currentStep = sceneConfig.steps.find((s) => s.id === state.currentStepId);
        if (!currentStep) return;

        // Find chosen choice
        const choice = currentStep.choices.find((c) => c.id === choiceId);
        if (!choice) return;

        // Resolve CO2
        const co2Delta = resolveCO2(choice.co2, state.locale);

        // Log the choice (only if it has a real CO2 value)
        const newLog: SceneLogEntry = {
          sceneId,
          choiceId,
          co2Delta,
          dayIndex: state.currentDayIndex,
        };

        const updatedLog = choice.co2 !== null
          ? [...state.scenesLog, newLog]
          : state.scenesLog;
        
        const newDayScore = state.dayScore + co2Delta;

        if (choice.next === 'END') {
          // Scene is complete, advance to next scene
          const nextSceneIndex = state.currentSceneIndex + 1;
          
          if (nextSceneIndex >= SCENE_ORDER.length) {
            // All scenes done — end day
            const newCumulativeScore = state.cumulativeScore + newDayScore;
            const wsResult = calculateWorldState(
              newCumulativeScore,
              newDayScore,
              state.cleanStreak,
              state.dirtyStreak
            );
            
            const npcLine = getNPCDialogue(
              updatedLog,
              wsResult.tier,
              wsResult.newCleanStreak,
              wsResult.newDirtyStreak,
              newDayScore
            );

            const summary: DailySummaryEntry = {
              dayIndex: state.currentDayIndex,
              dayScore: Math.round(newDayScore * 10) / 10,
              worldStateBefore: state.worldStateBefore,
              worldStateAfter: wsResult.tier,
              mutationsApplied: wsResult.mutations,
            };

            set({
              gamePhase: 'summary',
              dayScore: Math.round(newDayScore * 10) / 10,
              cumulativeScore: Math.round(newCumulativeScore * 10) / 10,
              worldState: wsResult.tier,
              cleanStreak: wsResult.newCleanStreak,
              dirtyStreak: wsResult.newDirtyStreak,
              scenesLog: updatedLog,
              dailySummaries: [...state.dailySummaries, summary],
              lastDayMutations: wsResult.mutations,
              lastNpcDialogue: npcLine,
            });
          } else {
            // Move to next scene
            const nextSceneId = SCENE_ORDER[nextSceneIndex];
            
            if (nextSceneId === 'afternoon_event') {
              // Pick a random afternoon event
              const event = afternoonEvents[Math.floor(Math.random() * afternoonEvents.length)];
              set({
                gamePhase: 'afternoon_event',
                currentSceneIndex: nextSceneIndex,
                currentStepId: null,
                currentAfternoonEvent: event,
                dayScore: newDayScore,
                scenesLog: updatedLog,
                isTransitioning: true,
              });
            } else {
              const nextConfig = scenes[nextSceneId];
              const nextStepId = nextConfig?.steps[0]?.id ?? null;
              set({
                currentSceneIndex: nextSceneIndex,
                currentStepId: nextStepId,
                dayScore: newDayScore,
                scenesLog: updatedLog,
                isTransitioning: true,
              });
            }
            // Clear transition flag after delay
            setTimeout(() => set({ isTransitioning: false }), 50);
          }
        } else {
          // Navigate to next step within the same scene
          set({
            currentStepId: choice.next,
            dayScore: newDayScore,
            scenesLog: updatedLog,
          });
        }
      },

      submitAfternoonChoice: (choiceId: string) => {
        const state = get();
        const event = state.currentAfternoonEvent;
        if (!event) return;

        const choice = event.choices.find((c) => c.id === choiceId);
        if (!choice) return;

        const co2Delta = resolveCO2(choice.co2, state.locale);
        const newDayScore = state.dayScore + co2Delta;

        const newLog: SceneLogEntry = {
          sceneId: 'afternoon_event',
          choiceId,
          co2Delta,
          dayIndex: state.currentDayIndex,
        };

        // Move to evening scene
        const eveningIndex = SCENE_ORDER.indexOf('evening');
        const eveningConfig = scenes['evening'];
        const eveningStepId = eveningConfig?.steps[0]?.id ?? null;

        set({
          gamePhase: 'scene',
          currentSceneIndex: eveningIndex,
          currentStepId: eveningStepId,
          currentAfternoonEvent: null,
          dayScore: newDayScore,
          scenesLog: [...state.scenesLog, newLog],
          isTransitioning: true,
        });
        setTimeout(() => set({ isTransitioning: false }), 50);
      },

      goToExplore: () => {
        const state = get();
        // Check if we need to show weekly report (every 7 days)
        if ((state.currentDayIndex + 1) % 7 === 0 && state.currentDayIndex > 0) {
          const weekIndex = Math.floor(state.currentDayIndex / 7);
          const report = generateWeeklyReport(
            state.scenesLog,
            state.dailySummaries,
            weekIndex
          );
          set({
            gamePhase: 'weekly_report',
            lastWeeklyReport: report,
          });
        } else {
          set({ gamePhase: 'explore' });
        }
      },

      dismissWeeklyReport: () => {
        set({ gamePhase: 'explore' });
      },

      startNextDay: () => {
        const state = get();
        const newDayIndex = state.currentDayIndex + 1;
        const firstScene = SCENE_ORDER[0];
        const sceneConfig = scenes[firstScene];
        const firstStepId = sceneConfig?.steps[0]?.id ?? null;

        set({
          gamePhase: 'scene',
          currentSceneIndex: 0,
          currentStepId: firstStepId,
          currentAfternoonEvent: null,
          dayScore: 0,
          currentDayIndex: newDayIndex,
          lastDayMutations: [],
          lastNpcDialogue: null,
          worldStateBefore: state.worldState,
          isTransitioning: false,
        });
      },

      resetGame: () => {
        set({
          gamePhase: 'title',
          username: '',
          locale: 'IN',

          currentSceneIndex: 0,
          currentStepId: null,
          currentAfternoonEvent: null,
          dayScore: 0,
          cumulativeScore: 0,
          currentDayIndex: 0,
          worldState: 'pristine',
          cleanStreak: 0,
          dirtyStreak: 0,
          scenesLog: [],
          dailySummaries: [],
          lastDayMutations: [],
          lastNpcDialogue: null,
          worldStateBefore: 'pristine',
          lastWeeklyReport: null,
          isTransitioning: false,
        });
      },

      setTransitioning: (v: boolean) => {
        set({ isTransitioning: v });
      },

      // ─── Computed ────────────────────────────────────────────────

      getCurrentScene: () => {
        const state = get();
        const sceneId = SCENE_ORDER[state.currentSceneIndex];
        if (sceneId === 'afternoon_event') return null;
        return scenes[sceneId] ?? null;
      },

      getCurrentStep: () => {
        const state = get();
        const scene = state.getCurrentScene();
        if (!scene || !state.currentStepId) return null;
        return scene.steps.find((s) => s.id === state.currentStepId) ?? null;
      },

      getCurrentSceneId: () => {
        const state = get();
        return SCENE_ORDER[state.currentSceneIndex];
      },
    }),
    {
      name: 'ecopixel-game-state',
      // Only persist specific fields
      partialize: (state) => ({
        gamePhase: state.gamePhase,
        username: state.username,
        locale: state.locale,

        currentSceneIndex: state.currentSceneIndex,
        currentStepId: state.currentStepId,
        currentAfternoonEvent: state.currentAfternoonEvent,
        dayScore: state.dayScore,
        cumulativeScore: state.cumulativeScore,
        currentDayIndex: state.currentDayIndex,
        worldState: state.worldState,
        cleanStreak: state.cleanStreak,
        dirtyStreak: state.dirtyStreak,
        scenesLog: state.scenesLog,
        dailySummaries: state.dailySummaries,
        lastDayMutations: state.lastDayMutations,
        lastNpcDialogue: state.lastNpcDialogue,
        worldStateBefore: state.worldStateBefore,
        lastWeeklyReport: state.lastWeeklyReport,
      }),
    }
  )
);
