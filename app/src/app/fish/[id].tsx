import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useCatalog } from '@/hooks/use-catalog';
import { useJournal } from '@/hooks/use-journal';
import { measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { useSession } from '@/lib/session';
import { FishCredit, FishImage } from '@/components/fish-image';
import { Badge, Button, ErrorMessage, Heading, Page, Stat, colors, ui } from '@/components/fishing-ui';

export default function FishDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const journal = useJournal();
  const { username } = useSession();
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const species = catalog.species.find(s => s.species_id === id);
  const record = species ? records.get(speciesKey(species.common_name)) : undefined;
  return <Page>
    <Button title="← Back to my Fishdex" secondary onPress={() => router.replace('/(tabs)/species')} />
    <ErrorMessage message={catalog.error || journal.error} />
    {!!(catalog.error || journal.error) && <Button title="Reload fish details" secondary onPress={() => { catalog.refresh(); journal.refresh(); }} />}
    {catalog.loading && <ActivityIndicator color={colors.green} />}
    {!catalog.loading && !catalog.error && !species && <Heading eyebrow="Field guide" title="Fish not found." subtitle="Open the Fishdex to choose an entry from the Georgia catalog." />}
    {species && <>
      <View style={ui.row}><Badge gold={!!record}>{record ? '✓ DISCOVERED' : journal.logs !== null ? 'NEXT DISCOVERY?' : !username ? 'FIELD GUIDE' : journal.loading ? 'LOADING JOURNAL' : 'JOURNAL UNAVAILABLE'}</Badge><Text style={ui.eyebrow}>#{String(catalog.species.indexOf(species) + 1).padStart(3, '0')}</Text></View>
      <Heading eyebrow={`${species.family || 'Georgia freshwater'} / ${species.taxon_rank?.replaceAll('_', ' ') || 'species'}`} title={species.common_name} subtitle={species.scientific_name} />
      <View style={{ borderRadius: 24, overflow: 'hidden' }}><FishImage speciesId={species.species_id} name={species.common_name} height={260} /></View>
      {record ? <View style={ui.hero}>
        <Badge gold>YOUR PERSONAL BESTS</Badge>
        <View style={ui.row}><Stat light value={`${measurement(record.heaviest.weight_lbs)} lb`} label="heaviest catch" /><Stat light value={`${measurement(record.longest.length_inches)} in`} label="longest catch" /><Stat light value={String(record.count)} label="catches logged" /></View>
        <Text style={ui.heroBody}>First discovery {new Date(record.firstCaught).toLocaleDateString()}. Weight and length records may come from different catches.</Text>
      </View> : <View style={ui.card}>
        <Text style={ui.name}>{journal.logs !== null ? 'A new chapter to unlock.' : !username ? 'Make this field guide yours.' : journal.loading ? 'Your records are loading.' : 'Your journal is unavailable.'}</Text>
        <Text style={ui.body}>{journal.logs !== null ? 'Confirm and log this fish to add your first discovery and personal best.' : 'Personal bests appear when your journal is available.'}</Text>
        {!username && <Button title="Open my journal →" accent onPress={() => router.navigate('/auth')} />}
        {journal.logs !== null && <Button title="Identify & log a fish →" accent onPress={() => router.navigate('/(tabs)/identify')} />}
      </View>}
      <View style={[ui.card, { backgroundColor: '#FFF5DD', borderColor: '#E5D4AC' }]}>
        <Badge gold>KNOW BEFORE YOU KEEP</Badge>
        <Text style={ui.section}>A familiar fish. Rules worth checking.</Text>
        <Text style={ui.body}>Waterbody, size, season, and protected status can change what applies to this fish.</Text>
        <Button title="Check this fish’s regulation guidance →" secondary onPress={() => router.navigate({ pathname: '/(tabs)/regulations', params: { species_id: species.species_id } })} />
      </View>
      <Text style={ui.small}>Discoveries celebrate learning. Photograph responsibly and minimize handling; collecting never requires harvesting a fish.</Text>
      <FishCredit speciesId={species.species_id} />
    </>}
  </Page>;
}
