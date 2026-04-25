/**
 * fmt.ts — Shared model ID formatting utilities.
 *
 * Pure functions — no imports, no side effects.
 */

/**
 * Format a model ID for display in leaderboard panels.
 *
 * - Strips the "openrouter/" provider prefix if present.
 * - Appends " [rlm]" for λ-RLM variant models (ID ends with "/rlm").
 *
 * Examples:
 *   "openrouter/minimax/minimax-m2.5:free/rlm" → "minimax/minimax-m2.5:free [rlm]"
 *   "openrouter/google/gemini-2.5-pro"          → "google/gemini-2.5-pro"
 *   "google/gemini-2.5-pro"                     → "google/gemini-2.5-pro"
 */
export const fmtModel = (m: string): string => {
  const clean = m.startsWith("openrouter/") ? m.slice("openrouter/".length) : m;
  return clean.endsWith("/rlm")
    ? clean.slice(0, -"/rlm".length) + " [rlm]"
    : clean;
};
