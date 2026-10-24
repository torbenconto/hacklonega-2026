import type { FishLog } from './api';
import { summarizeCatches } from './collection.ts';

export type Quest = { id: string; title: string; subtitle: string; detail: string; current: number; target: number; unit: string; action: 'identify' | 'species'; actionLabel: string };
export function fishingQuests(logs: FishLog[]): Quest[] {
  const records = summarizeCatches(logs);
  const repeat = Math.max(0, ...Array.from(records.values(), record => record.count));
  return [
    { id: 'first', title: 'The first chapter', subtitle: 'Every field journal starts with one fish.', detail: 'Photograph a fish, confirm its species, and save its weight and length. Your first species earns 100 XP.', current: Math.min(logs.length, 1), target: 1, unit: 'catch saved', action: 'identify', actionLabel: 'Find my first fish' },
    { id: 'explorer', title: 'Meet the locals', subtitle: 'Discover three different species.', detail: 'Browse the Fishdex for inspiration, then identify and save three different species. Each new species earns 100 XP.', current: Math.min(records.size, 3), target: 3, unit: 'species discovered', action: 'species', actionLabel: 'Explore the Fishdex' },
    { id: 'five', title: 'Gone fishing', subtitle: 'Build a five-catch field journal.', detail: 'Save five catches, including repeat species. Every saved catch adds 20 XP; a new species adds another 80 XP.', current: Math.min(logs.length, 5), target: 5, unit: 'catches saved', action: 'identify', actionLabel: 'Log another catch' },
    { id: 'specialist', title: 'A familiar face', subtitle: 'Get to know one species a little better.', detail: 'Save three catches of the same species. Compare their measurements in your journal and see how each fish differs.', current: Math.min(repeat, 3), target: 3, unit: 'catches of one species', action: 'identify', actionLabel: 'Find a familiar fish' },
    { id: 'naturalist', title: 'Beyond the usual', subtitle: 'Grow your collection to ten species.', detail: 'Discover ten different species over your trips. Use the Fishdex to learn what to look for and check local rules before fishing.', current: Math.min(records.size, 10), target: 10, unit: 'species discovered', action: 'species', actionLabel: 'Meet more fish' },
  ];
}
