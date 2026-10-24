import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { speciesKey, summarizeCatches } from '@/lib/collection';
import { useCatalog } from '@/hooks/use-catalog';
import { useJournal } from '@/hooks/use-journal';
import { FishImage } from '@/components/fish-image';
import { CollectionJourney } from '@/components/collection-journey';
import { Reveal, SpringPressable } from '@/components/motion';
import { Icon } from '@/components/icon';
import { Button, ErrorMessage, Input, Page, colors, ui } from '@/components/fishing-ui';

type Filter = 'All fish' | 'Discovered' | 'To discover';
export default function Fishdex() {
  const catalog = useCatalog();
  const journal = useJournal();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All fish');
  const [visible, setVisible] = useState(24);
  const [containerWidth, setContainerWidth] = useState(0);
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const known = journal.logs !== null;
  const filtered = catalog.species.filter(s => {
    const caught = records.has(speciesKey(s.common_name));
    return `${s.common_name} ${s.scientific_name} ${s.family || ''}`.toLowerCase().includes(query.trim().toLowerCase())
      && (filter === 'All fish' || (known && (filter === 'Discovered' ? caught : !caught)));
  });
  return <Page>
    <View style={ui.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="fish" size={26} /><Text style={{ color: colors.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.6 }}>fishnerd</Text></View>
      <SpringPressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/quests')} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}><Text style={[ui.small, { color: colors.green, fontWeight: '700' }]}>My quests ↗</Text></SpringPressable>
    </View>
    <Text style={ui.title}>Fishdex</Text>
    <CollectionJourney loading={journal.loading} logs={journal.logs} onIdentify={() => router.navigate('/(tabs)/identify')} />
    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderColor: colors.ink, paddingLeft: 0 }}>
      <Icon name="search" color={colors.muted} size={20} />
      <Input accessibilityLabel="Search the Fishdex" placeholder="Search name or family" value={query} autoCorrect={false} onChangeText={value => { setQuery(value); setVisible(24); }} style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingLeft: 10, borderRadius: 0 }} />
      {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(''); setVisible(24); }} style={{ minHeight: 44, padding: 12, justifyContent: 'center' }}><Text style={{ color: colors.green, fontWeight: '600' }}>Clear</Text></Pressable>}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['All fish', 'Discovered', 'To discover'] as Filter[]).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item, disabled: item !== 'All fish' && !known }} disabled={item !== 'All fish' && !known} onPress={() => { setFilter(item); setVisible(24); }} style={[ui.chip, filter === item && ui.chipActive, item !== 'All fish' && !known && { opacity: 0.45 }]}><Text style={{ color: filter === item ? colors.white : colors.ink, fontSize: 13, fontWeight: '600' }}>{item}</Text></Pressable>)}</View>
    <ErrorMessage message={catalog.error || journal.error} />
    {!!(catalog.error || journal.error) && <Button title="Reload field guide" secondary onPress={() => { catalog.refresh(); journal.refresh(); }} />}
    {(catalog.loading || journal.loading) && <ActivityIndicator color={colors.green} />}
    <View style={ui.row}><Text style={ui.section}>{query.trim() ? 'Search results' : 'Meet the fish'}</Text><Text accessibilityLiveRegion="polite" style={ui.small}>{filtered.length} fish</Text></View>
    {!catalog.loading && !catalog.error && !filtered.length && <View style={ui.card}><Text style={ui.name}>{filter === 'Discovered' && !query ? 'Your first catch starts here' : 'No fish found'}</Text><Text style={ui.body}>Try another name or filter.</Text><Button title="View all fish" secondary onPress={() => { setQuery(''); setFilter('All fish'); }} /></View>}
    <Reveal><View onLayout={event => setContainerWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 20 }}>
      {filtered.slice(0, visible).map(s => {
        const caught = records.get(speciesKey(s.common_name));
        const columns = containerWidth >= 700 ? 3 : containerWidth >= 300 ? 2 : 1;
        const number = catalog.species.indexOf(s) + 1;
        return <SpringPressable key={s.species_id} accessibilityRole="button" accessibilityLabel={`${s.common_name}. ${caught ? 'Discovered' : 'View fish and rules'}.`} onPress={() => router.push({ pathname: '/fish/[id]', params: { id: s.species_id } })} style={{ width: containerWidth ? (containerWidth - 20 * (columns - 1)) / columns : '100%', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 }}>
          <View style={{ height: 140, justifyContent: 'center' }}>
            <Text accessible={false} style={{ position: 'absolute', top: 0, left: 0, color: caught ? '#C8DCD0' : '#E2E5DD', fontSize: 42, fontWeight: '900', letterSpacing: -2 }}>{String(number).padStart(3, '0')}</Text>
            <View style={{ paddingTop: 18 }}><FishImage speciesId={s.species_id} name={s.common_name} height={112} unlocked={!!caught} /></View>
          </View>
          <Text style={[ui.name, { fontSize: 17 }]}>{s.common_name}</Text>
          <Text style={[ui.small, { fontSize: 12, fontStyle: 'italic' }]}>{s.scientific_name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Text style={{ color: caught ? colors.green : colors.muted, fontWeight: '700', fontSize: 12 }}>{caught ? '✓ Discovered' : known ? 'To discover' : 'Species & rules'}</Text><Icon name="arrow" color={colors.muted} size={14} /></View>
        </SpringPressable>;
      })}
    </View>
    </Reveal>
    {visible < filtered.length && <Button title={`Show more fish (${filtered.length - visible} remaining)`} secondary onPress={() => setVisible(value => value + 24)} />}
  </Page>;
}
