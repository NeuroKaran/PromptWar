// Carbon Math Engine
// Resolves CO2e values per choice, applying regional emission coefficients

export type Locale = 'IN' | 'US' | 'EU' | 'CN';

// Regional multiplier coefficients for emission calculations
const REGIONAL_COEFFICIENTS: Record<Locale, number> = {
  IN: 1.0,   // India (baseline)
  US: 1.3,   // USA (higher grid emissions)
  EU: 0.8,   // Europe (cleaner grid)
  CN: 1.2,   // China
};

/**
 * Resolve CO2 delta for a given choice, applying regional coefficients.
 * Returns the adjusted CO2 value in kg CO2e.
 */
export function resolveCO2(baseCO2: number | null, locale: Locale = 'IN'): number {
  if (baseCO2 === null) return 0; // Branch-only nodes don't add to score
  const coefficient = REGIONAL_COEFFICIENTS[locale] ?? 1.0;
  return Math.round(baseCO2 * coefficient * 10) / 10;
}

/**
 * Get emission level category for UI color coding.
 * green = low, yellow = moderate, red = high
 */
export function getEmissionLevel(co2: number | null): 'green' | 'yellow' | 'red' | 'neutral' {
  if (co2 === null) return 'neutral';
  if (co2 <= 0) return 'green';
  if (co2 <= 4) return 'green';
  if (co2 <= 8) return 'yellow';
  return 'red';
}

/**
 * Format CO2 value for display
 */
export function formatCO2(co2: number | null): string {
  if (co2 === null) return '?';
  if (co2 === 0) return '+0 kg';
  if (co2 > 0) return `+${co2} kg`;
  return `${co2} kg`;
}

/**
 * Daily clean threshold in kg CO2e
 */
export const DAILY_CLEAN_THRESHOLD = 25;

/**
 * Global target: ~8.2 kg/day (3 tonnes/year ÷ 365)
 */
export const GLOBAL_DAILY_TARGET = 8.2;
