import { CatchCard } from '@/components/catch-card';
import { Reveal } from '@/components/motion';
import { DexRegulations } from '@/components/dex-regulations';
import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useCatalog } from '@/hooks/use-catalog';
import { useJournal } from '@/hooks/use-journal';
import { measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { useSession } from '@/lib/session';
import { FishImage } from '@/components/fish-image';
import { Badge, Button, ErrorMessage, Heading, Page, Stat, colors, ui } from '@/components/fishing-ui';

export default function FishDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const journal = useJournal();
  const { username } = useSession();
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const species = catalog.species.find(s => s.species_id === id);
  const record = species ? records.get(speciesKey(species.common_name)) : undefined;
  const catches = species ? (journal.logs || []).filter(log => speciesKey(log.species) === speciesKey(species.common_name)) : [];
  return <Page>
    <Button title="Back to Fishdex" secondary onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/species')} />
    <ErrorMessage message={catalog.error || journal.error} />
    {!!(catalog.error || journal.error) && <Button title="Reload fish details" secondary onPress={() => { catalog.refresh(); journal.refresh(); }} />}
    {catalog.loading && <ActivityIndicator color={colors.green} />}
    {!catalog.loading && !catalog.error && !species && <Heading eyebrow="Field guide" title="Fish not found." subtitle="Open the Fishdex to choose an entry from the Georgia catalog." />}
    {species && <>
      <View style={ui.row}><Badge gold={!!record}>{record ? '✓ DISCOVERED' : journal.logs !== null ? 'YOUR NEXT DISCOVERY' : !username ? 'FIELD GUIDE' : journal.loading ? 'LOADING JOURNAL' : 'JOURNAL UNAVAILABLE'}</Badge><Text style={ui.eyebrow}>#{String(catalog.species.indexOf(species) + 1).padStart(3, '0')}</Text></View>
      <View style={{ gap: 6 }}><Text style={ui.title}>{species.common_name}</Text><Text style={[ui.small, { fontStyle: 'italic' }]}>{species.scientific_name}</Text></View>
      <Reveal><FishImage speciesId={species.species_id} name={species.common_name} height={260} unlocked={!!record} /></Reveal>
      <DexRegulations key={species.species_id} species={species} logs={journal.logs} />
      {record ? <View style={{ gap: 16, paddingVertical: 20, borderTopWidth: 2, borderTopColor: colors.orange }}>
        <Badge gold>YOUR PERSONAL BESTS</Badge>
        <View style={ui.row}><Stat value={`${measurement(record.heaviest.weight_lbs)} lb`} label="heaviest catch" /><Stat value={`${measurement(record.longest.length_inches)} in`} label="longest catch" /><Stat value={String(record.count)} label="catches logged" /></View>
        <Text style={ui.small}>First discovery {new Date(record.firstCaught).toLocaleDateString()}.</Text>
      </View> : <View style={ui.card}>
        <Text style={ui.name}>{journal.logs !== null ? 'No catches logged yet.' : !username ? 'Make this field guide yours.' : journal.loading ? 'Your records are loading.' : 'Your journal is unavailable.'}</Text>
        {!username && <Button title="Open my journal →" accent onPress={() => router.navigate('/auth')} />}
        {journal.logs !== null && <Button title="Log a catch" accent onPress={() => router.navigate('/(tabs)/identify')} />}
      </View>}
      {!!catches.length && <View style={{ gap: 16 }}>
        <Text style={ui.section}>Your catches ({catches.length})</Text>
        {catches.map(log => <CatchCard key={log.id} log={log} species={species} best={record?.heaviest.id === log.id} onSaved={journal.refresh} />)}
      </View>}
    </>}
  </Page>;
}
