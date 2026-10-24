import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { speciesKey, summarizeCatches, measurement } from '@/lib/collection';
import { useSession } from '@/lib/session';
import { useCatalog } from '@/hooks/use-catalog';
import { useJournal } from '@/hooks/use-journal';
import { FishImage } from '@/components/fish-image';
import { Badge, Button, ErrorMessage, Heading, Input, Page, Stat, colors, ui } from '@/components/fishing-ui';

type Filter = 'All fish' | 'Discovered' | 'Not yet';
export default function Fishdex() {
  const { username, setUsername } = useSession();
  const catalog = useCatalog();
  const journal = useJournal();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All fish');
  const [visible, setVisible] = useState(24);
  const records = useMemo(() => summarizeCatches(journal.logs || []), [journal.logs]);
  const known = journal.logs !== null;
  const discovered = catalog.species.filter(s => records.has(speciesKey(s.common_name))).length;
  const progress = catalog.species.length ? discovered / catalog.species.length : 0;
  const filtered = catalog.species.filter(s => {
    const caught = records.has(speciesKey(s.common_name));
    return `${s.common_name} ${s.scientific_name} ${s.family || ''}`.toLowerCase().includes(query.trim().toLowerCase())
      && (filter === 'All fish' || (known && (filter === 'Discovered' ? caught : !caught)));
  });
  return <Page>
    <View style={ui.row}><Text style={ui.eyebrow}>REEL GEORGIA</Text><Pressable accessibilityRole="button" onPress={() => { setUsername(null); router.replace('/auth'); }} style={{ paddingVertical: 10 }}><Text style={[ui.small, { color: colors.green }]}>Sign out</Text></Pressable></View>
    <Heading eyebrow={username || 'Field journal'} title="Your Fishdex." subtitle="A field guide that grows with every fish you discover." />
    <View style={[ui.hero, { padding: 18, gap: 12 }]}>
      <View style={ui.row}><Stat light value={known ? String(discovered) : '—'} label="entries discovered" /><Stat light value={known ? String(journal.logs?.length || 0) : '—'} label="catches logged" /><Stat light value={String(catalog.species.length || '—')} label="in the field guide" /></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Fishdex completion" accessibilityValue={{ min: 0, max: catalog.species.length, now: discovered }} style={{ height: 7, backgroundColor: '#32594D', borderRadius: 10, overflow: 'hidden' }}><View style={{ width: `${known ? progress * 100 : 0}%`, height: '100%', backgroundColor: colors.orange }} /></View>
      <View style={ui.row}><Text style={[ui.heroBody, { flex: 1, fontSize: 12 }]}>Discover. Photograph. Protect.</Text><Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/identify')} style={{ paddingVertical: 10 }}><Text style={{ color: colors.orange, fontWeight: '800', fontSize: 13 }}>＋ Add a catch</Text></Pressable></View>
    </View>
    <Input accessibilityLabel="Search the Fishdex" placeholder="Search bass, trout, sunfish…" value={query} onChangeText={value => { setQuery(value); setVisible(24); }} />
    <View style={[ui.row, { justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }]}>{(['All fish', 'Discovered', 'Not yet'] as Filter[]).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => { setFilter(item); setVisible(24); }} style={[ui.chip, filter === item && ui.chipActive]}><Text style={{ color: filter === item ? colors.white : colors.ink, fontSize: 13, fontWeight: '700' }}>{item}</Text></Pressable>)}</View>
    <ErrorMessage message={catalog.error || journal.error} />
    {!!(catalog.error || journal.error) && <Button title="Reload collection" secondary onPress={() => { catalog.refresh(); journal.refresh(); }} />}
    {(catalog.loading || journal.loading) && <ActivityIndicator color={colors.green} />}
    <View style={ui.row}><Text style={ui.section}>The field guide</Text><Text style={ui.small}>{filtered.length} entries</Text></View>
    {!catalog.loading && !filtered.length && <View style={ui.card}><Text style={ui.name}>{filter === 'Discovered' ? 'Start your collection.' : 'No matches yet.'}</Text><Text style={ui.body}>{filter === 'Discovered' ? 'Identify and confirm a fish, then log it to unlock its entry here.' : 'Try another fish name or change the filter.'}</Text></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 14 }}>
      {filtered.slice(0, visible).map(s => {
        const caught = records.get(speciesKey(s.common_name));
        const number = catalog.species.indexOf(s) + 1;
        return <Pressable key={s.species_id} accessibilityRole="button" accessibilityLabel={`${s.common_name}, ${known ? caught ? 'discovered' : 'not yet discovered' : 'journal status unavailable'}`} onPress={() => router.push({ pathname: '/fish/[id]', params: { id: s.species_id } })} style={({ pressed }) => [{ width: width >= 800 ? '32%' : '48%', borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: caught ? '#AFCAA9' : colors.line, overflow: 'hidden', opacity: pressed ? 0.8 : 1 }]}>
          <FishImage speciesId={s.species_id} name={s.common_name} height={width < 400 ? 112 : 145} />
          <View style={{ padding: 13, gap: 8 }}>
            <Text style={[ui.eyebrow, { fontSize: 9 }]}>#{String(number).padStart(3, '0')} · {s.family || 'FISH'}</Text>
            <Text style={[ui.name, { fontSize: 17, minHeight: 42 }]}>{s.common_name}</Text>
            <Badge gold={!!caught}>{!known ? 'STATUS UNAVAILABLE' : caught ? '✓ DISCOVERED' : '○ NOT YET'}</Badge>
            <Text style={[ui.small, { fontWeight: caught ? '700' : '400', fontSize: 12 }]}>{caught ? `Best · ${measurement(caught.heaviest.weight_lbs)} lb` : known ? 'Your story starts here' : 'Reload your journal'}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    {visible < filtered.length && <Button title={`Explore more · ${filtered.length - visible} remaining`} secondary onPress={() => setVisible(value => value + 24)} />}
    <Text style={ui.small}>The catalog includes species, hybrids, and provisional groups. An entry is a learning milestone, not a harvesting goal.</Text>

  </Page>;
}
