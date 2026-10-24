import { useMemo } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useJournal } from '@/hooks/use-journal';
import { useCatalog } from '@/hooks/use-catalog';
import { measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { FishImage } from '@/components/fish-image';
import { Badge, Button, ErrorMessage, Heading, Page, Stat, colors, ui } from '@/components/fishing-ui';

export default function History() {
  const journal = useJournal();
  const catalog = useCatalog();
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const byName = useMemo(() => new Map(catalog.species.map(s => [speciesKey(s.common_name), s])), [catalog.species]);
  const logs = journal.logs || [];
  const biggest = logs.length ? Math.max(...logs.map(log => log.weight_lbs)) : null;
  return <Page>
    <Heading eyebrow="Reel Georgia / Field journal" title="Stories from the water." subtitle="Your catches, first discoveries, and the ones that set a new personal best." />
    <View style={ui.hero}><View style={ui.row}><Stat light value={journal.logs ? String(logs.length) : '—'} label="catches logged" /><Stat light value={journal.logs ? String(records.size) : '—'} label="unique entries" /><Stat light value={biggest === null ? '—' : `${measurement(biggest)} lb`} label="heaviest catch" /></View></View>
    <View style={ui.row}><Text style={ui.section}>Your catch timeline</Text><Button title="Refresh" secondary disabled={journal.loading} onPress={journal.refresh} /></View>
    <ErrorMessage message={journal.error || catalog.error} />{journal.loading && <ActivityIndicator color={colors.green} />}
    {!journal.loading && !journal.error && !logs.length && <View style={ui.card}><Badge gold>THE FIRST OF MANY</Badge><Text style={ui.name}>Every collection starts with one.</Text><Text style={ui.body}>Take a fish photo, confirm a match, and save a catch to start your Fishdex.</Text><Button title="Make your first discovery →" onPress={() => router.navigate('/(tabs)/identify')} /></View>}
    {logs.map(log => {
      const species = byName.get(speciesKey(log.species));
      const record = records.get(speciesKey(log.species));
      const best = record?.heaviest.id === log.id;
      return <View key={log.id} style={[ui.card, { padding: 0, overflow: 'hidden' }]}>
        <View style={{ flexDirection: 'row' }}>
          {species && <View style={{ width: 110, alignSelf: 'stretch', backgroundColor: colors.soft }}><FishImage speciesId={species.species_id} name={species.common_name} height={140} /></View>}
          <View style={{ flex: 1, padding: 18, gap: 8 }}>
            <Text style={ui.eyebrow}>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            <Text style={ui.name}>{log.species}</Text>
            <Text style={ui.body}>{measurement(log.weight_lbs)} lb · {measurement(log.length_inches)} in</Text>
            {best && <Badge gold>★ PERSONAL BEST · WEIGHT</Badge>}
          </View>
        </View>
      </View>;
    })}
  </Page>;
}
