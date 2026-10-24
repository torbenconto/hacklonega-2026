import { useMemo } from 'react';
import { CatchCard } from '@/components/catch-card';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useJournal } from '@/hooks/use-journal';
import { useCatalog } from '@/hooks/use-catalog';
import { measurement, speciesKey, summarizeCatches } from '@/lib/collection';
import { CollectionJourney } from '@/components/collection-journey';
import { DailyLimitProgress } from '@/components/daily-limit-progress';
import { Button, ErrorMessage, Page, Stat, colors, ui } from '@/components/fishing-ui';

export default function History() {
  const journal = useJournal();
  const catalog = useCatalog();
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const byName = useMemo(() => new Map(catalog.species.map(s => [speciesKey(s.common_name), s])), [catalog.species]);
  const logs = journal.logs || [];
  const weights = logs.flatMap(log => log.weight_lbs === null ? [] : [log.weight_lbs]);
  const biggest = weights.length ? Math.max(...weights) : null;
  return <Page>
    <Text style={ui.title}>Journal</Text>
    <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line }}><View style={ui.row}><Stat value={journal.logs ? String(logs.length) : '—'} label="catches logged" /><Stat value={journal.logs ? String(records.size) : '—'} label="unique entries" /><Stat value={biggest === null ? '—' : `${measurement(biggest)} lb`} label="heaviest catch" /></View></View>
    <DailyLimitProgress logs={journal.logs} />
    <CollectionJourney loading={journal.loading} logs={journal.logs} />
    <View style={ui.row}><Text style={ui.section}>Catches</Text><Button title="Refresh" secondary disabled={journal.loading} onPress={journal.refresh} /></View>
    <ErrorMessage message={journal.error || catalog.error} />{journal.loading && <ActivityIndicator color={colors.green} />}
    {!journal.loading && !journal.error && !logs.length && <View style={ui.card}><Text style={ui.name}>No catches yet.</Text><Button title="Log your first catch" onPress={() => router.navigate('/(tabs)/identify')} /></View>}
    {logs.map(log => {
      const species = byName.get(speciesKey(log.species));
      const record = records.get(speciesKey(log.species));
      const best = record?.heaviest?.id === log.id;
      return <CatchCard key={log.id} log={log} species={species} best={best} longest={record?.longest?.id === log.id} onSaved={journal.refresh} />;
    })}
  </Page>;
}
