import { useMemo } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useJournal } from '@/hooks/use-journal';
import { useCatalog } from '@/hooks/use-catalog';
import { measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { CollectionJourney } from '@/components/collection-journey';
import { Reveal } from '@/components/motion';
import { FishImage } from '@/components/fish-image';
import { Badge, Button, ErrorMessage, Page, Stat, colors, ui } from '@/components/fishing-ui';

export default function History() {
  const journal = useJournal();
  const catalog = useCatalog();
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const byName = useMemo(() => new Map(catalog.species.map(s => [speciesKey(s.common_name), s])), [catalog.species]);
  const logs = journal.logs || [];
  const biggest = logs.length ? Math.max(...logs.map(log => log.weight_lbs)) : null;
  return <Page>
    <Text style={ui.title}>Journal</Text>
    <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}><View style={ui.row}><Stat value={journal.logs ? String(logs.length) : '—'} label="catches logged" /><Stat value={journal.logs ? String(records.size) : '—'} label="unique entries" /><Stat value={biggest === null ? '—' : `${measurement(biggest)} lb`} label="heaviest catch" /></View></View>
    <CollectionJourney loading={journal.loading} logs={journal.logs} />
    <View style={ui.row}><Text style={ui.section}>Catches</Text><Button title="Refresh" secondary disabled={journal.loading} onPress={journal.refresh} /></View>
    <ErrorMessage message={journal.error || catalog.error} />{journal.loading && <ActivityIndicator color={colors.green} />}
    {!journal.loading && !journal.error && !logs.length && <View style={ui.card}><Text style={ui.name}>No catches yet.</Text><Button title="Log your first catch" onPress={() => router.navigate('/(tabs)/identify')} /></View>}
    {logs.map(log => {
      const species = byName.get(speciesKey(log.species));
      const record = records.get(speciesKey(log.species));
      const best = record?.heaviest.id === log.id;
      return <Reveal key={log.id} style={[ui.card, { paddingVertical: 12 }]}>
        <View style={{ flexDirection: 'row' }}>
          {species && <View style={{ width: 110, alignSelf: 'stretch', backgroundColor: 'transparent' }}><FishImage speciesId={species.species_id} name={species.common_name} height={140} unlocked animated={false} /></View>}
          <View style={{ flex: 1, padding: 18, gap: 8 }}>
            <Text style={ui.eyebrow}>{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            <Text style={ui.name}>{log.species}</Text>
            <Text style={ui.body}>{measurement(log.weight_lbs)} lb · {measurement(log.length_inches)} in</Text>
            {best && <Badge gold>★ HEAVIEST CATCH</Badge>}
          </View>
        </View>
      </Reveal>;
    })}
  </Page>;
}
