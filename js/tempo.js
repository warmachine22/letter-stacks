/**
 * Difficulty presets and tempo rules
 * Exports:
 * - DIFFICULTY_PRESETS
 * - tempoForWordLen(len: number, presetName: keyof DIFFICULTY_PRESETS)
 */

export const DIFFICULTY_PRESETS = {
  Easy:   { baseInterval: 10000, spawnQty: 1 },
  Medium: { baseInterval: 7000,  spawnQty: 1 },
  Hard:   { baseInterval: 5000,  spawnQty: 2 },
  Insane: { baseInterval: 4000,  spawnQty: 3 }
};

/**
 * Word-length tempo rules (relative to difficulty base)
 *  - 3 letters => speeds up (shorter interval). On Insane, may increase qty by 1 up to 4.
 *  - 4 letters => neutral (base interval)
 *  - 5+ letters => slows spawns (longer interval)
 */
export function tempoForWordLen(len, presetName){
  const preset = DIFFICULTY_PRESETS[presetName] || DIFFICULTY_PRESETS.Medium;
  const base = preset.baseInterval;
  let qty   = preset.spawnQty;

  let interval;
  if (len >= 5){
    interval = Math.min(12000, Math.round(base * 2.0)); // slow down
  } else if (len === 4){
    interval = base; // neutral
  } else { // 3
    interval = Math.max(3000, Math.round(base * 0.6)); // speed up
    if (presetName === "Insane") qty = Math.min(4, qty + 1);
  }
  return { interval, qty };
}
