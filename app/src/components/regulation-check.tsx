import type { Species } from '@/lib/api';
import { DexRegulations } from './dex-regulations';
export { OFFICIAL_RULES } from './dex-regulations';

// The same automatic rules and length comparison in the dex and catch flow.
export function RegulationCheck({ species, length }: { species: Species; length: string }) {
  return <DexRegulations key={species.species_id} species={species} length={length} />;
}
