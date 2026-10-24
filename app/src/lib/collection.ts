import type { FishLog } from './api';

export const speciesKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
export type SpeciesRecord = {
  count: number;
  heaviest: FishLog;
  longest: FishLog;
  firstCaught: string;
};

export function summarizeCatches(logs: FishLog[]) {
  const records = new Map<string, SpeciesRecord>();
  for (const log of logs) {
    const key = speciesKey(log.species);
    const current = records.get(key);
    records.set(key, {
      count: (current?.count || 0) + 1,
      heaviest: current && current.heaviest.weight_lbs >= log.weight_lbs ? current.heaviest : log,
      longest: current && current.longest.length_inches >= log.length_inches ? current.longest : log,
      firstCaught: current && current.firstCaught < log.created_at ? current.firstCaught : log.created_at,
    });
  }
  return records;
}

export const measurement = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

// Rewards are derived from saved observations, so reopening a journal never
// grants extra points. A first species earns 20 catch XP + 80 discovery XP.
export function collectionProgress(logs: FishLog[]) {
  const discoveries = summarizeCatches(logs).size;
  const xp = logs.length * 20 + discoveries * 80;
  const level = Math.floor(xp / 300) + 1;
  const ranks = ['Pond Scout', 'Creek Explorer', 'River Ranger', 'Lake Adventurer', 'Watershed Wizard'];
  const nextGoal = [1, 3, 5, 10, 25, 50, 100].find(goal => discoveries < goal) ?? (Math.floor(discoveries / 50) + 1) * 50;
  return { discoveries, xp, level, rank: ranks[Math.min(level - 1, ranks.length - 1)], levelXP: xp % 300, nextGoal };
}
