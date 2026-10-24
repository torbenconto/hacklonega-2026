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
