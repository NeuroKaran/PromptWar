// Weekly Report Generator
// Aggregates 7 days of scene logs into a summary report

import { GLOBAL_DAILY_TARGET } from './carbonMath';

interface SceneLogEntry {
  sceneId: string;
  choiceId: string;
  co2Delta: number;
  dayIndex: number;
}

interface DailySummaryEntry {
  dayIndex: number;
  dayScore: number;
  worldStateBefore: string;
  worldStateAfter: string;
}

export interface WeeklyReportData {
  weekIndex: number;
  avgDailyCO2: number;
  totalCO2: number;
  bestDecision: { sceneId: string; choiceId: string; co2Delta: number } | null;
  worstDecision: { sceneId: string; choiceId: string; co2Delta: number } | null;
  counterfactualSavings: number;
  daysAboveTarget: number;
  daysBelowTarget: number;
  dailyScores: number[];
}

/**
 * Generate a weekly report from the last 7 days of data.
 */
export function generateWeeklyReport(
  scenesLog: SceneLogEntry[],
  dailySummaries: DailySummaryEntry[],
  weekIndex: number
): WeeklyReportData {
  const startDay = weekIndex * 7;
  const endDay = startDay + 7;

  // Get scene logs for this week
  const weekLogs = scenesLog.filter(
    (e) => e.dayIndex >= startDay && e.dayIndex < endDay
  );

  // Get daily summaries for this week
  const weekSummaries = dailySummaries.filter(
    (s) => s.dayIndex >= startDay && s.dayIndex < endDay
  );

  const dailyScores = weekSummaries.map((s) => s.dayScore);
  const totalCO2 = dailyScores.reduce((sum, s) => sum + s, 0);
  const avgDailyCO2 = dailyScores.length > 0 ? totalCO2 / dailyScores.length : 0;

  // Find best and worst individual decisions
  let bestDecision: WeeklyReportData['bestDecision'] = null;
  let worstDecision: WeeklyReportData['worstDecision'] = null;

  for (const log of weekLogs) {
    if (!bestDecision || log.co2Delta < bestDecision.co2Delta) {
      bestDecision = {
        sceneId: log.sceneId,
        choiceId: log.choiceId,
        co2Delta: log.co2Delta,
      };
    }
    if (!worstDecision || log.co2Delta > worstDecision.co2Delta) {
      worstDecision = {
        sceneId: log.sceneId,
        choiceId: log.choiceId,
        co2Delta: log.co2Delta,
      };
    }
  }

  // Counterfactual: calculate savings if user had chosen the greenest option
  // in each scene (minimum CO2 choice)
  const counterfactualSavings = weekLogs.reduce((savings, log) => {
    // Assume greenest choice in each scene would have been 0 kg
    return savings + Math.max(0, log.co2Delta);
  }, 0) - weekLogs.length * 0; // Best case is 0 for each

  const daysAboveTarget = dailyScores.filter((s) => s > GLOBAL_DAILY_TARGET).length;
  const daysBelowTarget = dailyScores.filter((s) => s <= GLOBAL_DAILY_TARGET).length;

  return {
    weekIndex,
    avgDailyCO2: Math.round(avgDailyCO2 * 10) / 10,
    totalCO2: Math.round(totalCO2 * 10) / 10,
    bestDecision,
    worstDecision,
    counterfactualSavings: Math.round(counterfactualSavings * 10) / 10,
    daysAboveTarget,
    daysBelowTarget,
    dailyScores,
  };
}

/**
 * Get a readable label for a choice ID
 */
export function getChoiceLabel(choiceId: string): string {
  const labels: Record<string, string> = {
    light_natural: 'Open curtains',
    light_renewable: 'Renewable grid light',
    light_fossil: 'Fossil-fuel grid light',
    shower_cold_short: 'Cold, short shower',
    shower_hot_long: 'Hot, long shower',
    bf_oats: 'Local oats',
    bf_eggs: 'Eggs & toast',
    bf_cereal: 'Packaged cereal',
    bf_skip: 'Skipped breakfast',
    commute_bike: 'Walk / Cycle',
    commute_wfh: 'Work from home',
    transit_electric: 'Electric transit',
    transit_diesel: 'Diesel bus',
    car_ev_solo: 'EV solo',
    car_ev_pool: 'EV carpool',
    car_petrol_solo: 'Petrol solo',
    car_petrol_pool: 'Petrol carpool',
    home_solar: 'Solar power',
    home_grid: 'Standard grid',
    lunch_homemade: 'Home-cooked plant meal',
    lunch_restaurant_veg: 'Restaurant (veg)',
    lunch_restaurant_nonveg: 'Restaurant (non-veg)',
    lunch_fastfood: 'Fast food',
    lunch_delivery: 'Food delivery',
    evening_stream: 'Stream / TV',
    evening_read: 'Read a book',
    evening_socialize: 'Socialize',
    charge_unplug: 'Unplugged devices',
    charge_overnight: 'Left plugged in',
  };
  return labels[choiceId] ?? choiceId;
}
