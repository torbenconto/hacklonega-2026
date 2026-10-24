import type { FishLog } from './api';

export const speciesKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
export type SpeciesRecord = {
  count: number;
  heaviest: FishLog | null;
  longest: FishLog | null;
  firstCaught: string;
};

export function summarizeCatches(logs: FishLog[]) {
  const records = new Map<string, SpeciesRecord>();
  for (const log of logs) {
    const key = speciesKey(log.species);
    const current = records.get(key);
    records.set(key, {
      count: (current?.count || 0) + 1,
      heaviest: log.weight_lbs !== null && (current?.heaviest?.weight_lbs == null || log.weight_lbs > current.heaviest.weight_lbs) ? log : current?.heaviest ?? null,
      longest: log.length_inches !== null && (current?.longest?.length_inches == null || log.length_inches > current.longest.length_inches) ? log : current?.longest ?? null,
      firstCaught: current && current.firstCaught < log.created_at ? current.firstCaught : log.created_at,
    });
  }
  return records;
}

export const measurement = (value: number | null | undefined, unit?: string) => value == null ? 'N/A' : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;

export function parseMeasurement(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error('Measurements must be above zero, or leave them blank.');
  return number;
}

export function personalBestChanges(record: SpeciesRecord | undefined, pounds: number | null, inches: number | null) {
  const previousWeight = record?.heaviest?.weight_lbs ?? null;
  const previousLength = record?.longest?.length_inches ?? null;
  const weightImproved = pounds !== null && (previousWeight === null || pounds > previousWeight);
  const lengthImproved = inches !== null && (previousLength === null || inches > previousLength);
  return {
    best: weightImproved || lengthImproved,
    weightBest: weightImproved ? previousWeight : null,
    lengthBest: lengthImproved ? previousLength : null,
    weightImproved,
    lengthImproved,
  };
}

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
